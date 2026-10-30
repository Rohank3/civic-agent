# Autonomous Public Service & Bureaucracy Execution Agent (medauto-core)

An autonomous web/browser agent powered by Playwright and Temporal that ingests a citizen's background profile and requested service (e.g., student scholarships, license renewals, government subsidy claims), navigates complex non-API legacy web portals, populates multi-step application forms, handles UI obstacles, and returns completed tracking receipts with cryptographic audit proofs.

Also includes single-clinic reference workflows for staff-reviewed medical prior authorization and CAQH credentialing.

## Quickstart & Synthetic Suite

From the repository root with Python 3.12+ / 3.13 and uv:

```powershell
uv sync
uv run playwright install chromium
# Run unit & API test suite
uv run pytest tests/test_services_api.py tests/test_bureaucracy_features.py -v
# Run end-to-end multi-step synthetic portal tests
uv run pytest tests/test_bureaucracy_agent.py -v
```

### Developer CLI Simulation
Run a local end-to-end interactive simulation of a citizen case with progress telemetry:

```powershell
uv run python scripts/simulate_citizen_case.py state_scholarship
```

## Autonomous Bureaucracy Execution

### 1. Ingest Citizen Profile & Launch Service
Send `POST /v1/services/execute` with bearer token with `intake` role:

```json
{
  "service_id": "state_scholarship",
  "portal_url": "https://scholarships.state.gov/apply",
  "profile": {
    "full_name": "Eleanor Vance",
    "date_of_birth": "2002-08-15",
    "national_id": "ID-987-654-321",
    "email": "eleanor@university.edu",
    "phone": "555-018-9922",
    "address_street": "42 Campus Way",
    "address_city": "College Town",
    "address_state": "CA",
    "address_zip": "90210",
    "income_annual": 18000.0,
    "household_size": 1,
    "attributes": {"gpa": 3.92, "major": "Computer Science"}
  },
  "documents": [
    {
      "name": "transcript.pdf",
      "kind": "pdf",
      "content": "<base64>"
    }
  ],
  "require_review": false
}
```

The response returns `202 Accepted` with a `status_url` (`/v1/services/{case_id}/status`).

### 2. Autonomous Navigation & Obstacle Resolution
The Temporal worker executes `BureaucracyExecutionWorkflow`:
- Scans and populates inputs dynamically using element label/aria/attribute matching.
- Automatically handles cookie banners, notice modals, and truth declaration checkboxes.
- Traverses multi-step wizard pagination ("Next", "Save & Continue").
- Uploads required PDF / image supporting evidence to file inputs.
- Self-reflects and verifies entered data against the citizen profile.

### 3. Submission & Tracking Receipt
- Records submission intent in PostgreSQL.
- Executes the final submission action.
- Scans the confirmation page for tracking identifiers (`PUB-REC-2026-XXXX`).
- Saves tracking receipt record, full-page screenshot, and confirmation HTML into the encrypted AES-256-GCM audit store.

### 4. Advanced Capabilities & QoL Features
- **Pre-flight Sufficiency Precheck** (`POST /v1/services/preflight`): Validates profile completeness, document encoding (`%PDF-`), and service-specific eligibility (e.g. GPA for scholarships, income for subsidies) before spinning up a browser session.
- **Learned Portal Memory (`PortalMemory`)**: Caches discovered selector mappings for repeat visits, reducing execution latency by >80%.
- **Post-Submission Tracking** (`POST /v1/services/{case_id}/track`): Initiates `BureaucracyStatusPollingWorkflow` to periodically poll for final government determinations (`APPROVED`, `DENIED`, `ACTION_REQUIRED`).
- **PII Redaction & Privacy Guard**: Automatically masks SSNs/National IDs, phone numbers, and email addresses in review snapshots unless the caller has elevated `pii:read` permissions.
- **Operational Health & Metrics**:
  - `GET /healthz`: Unauthenticated service health check.
  - `GET /v1/services/metrics`: Submissions count, receipt confirmation rate, and learned schema count.

## Run the synthetic suite

Use Python 3.12+, uv, and Chromium. From the repository root in PowerShell:

```powershell
uv sync --locked
uv run playwright install chromium
$env:MEDAUTO_TEMPORAL_TEST = "1"
uv run pytest -q
```

The Temporal SDK downloads its time-skipping server on first use. The integration tests use a loopback HTML payer, actual Chromium, an in-memory Redis double and an async SQLite database. They do not require payer credentials. Without the environment variable, pytest skips the tests that need the Temporal server.

## Start a development clinic

1. Set POSTGRES_PASSWORD and VAULT_DEV_ROOT_TOKEN_ID and run `docker compose up -d`. Compose exposes development services on loopback. Set MEDAUTO_DATABASE_URL to a postgresql+asyncpg connection URL, MEDAUTO_REDIS_URL to a Redis URL, MEDAUTO_VAULT_URL and MEDAUTO_VAULT_TOKEN for Vault KV v2, and MEDAUTO_CLINIC_WEBHOOK to an authenticated HTTPS clinic notification endpoint.
2. Under the configured Vault mount provision the following KV v2 documents:
   - `platform/keys` contains artifact_key, a base64-encoded, randomly generated 32-byte key.
   - `platform/principals` contains principals, an array of objects with id, token_sha256 and roles. Use independent high-entropy tokens for intake, staff and otp roles. Each deployment and its backing storage belong to one clinic.
   - `platform/notification` contains the clinic receiver's token.
   - `portals/<profile>` contains the fields in the example profile below. Obtain the login, allowlist, selectors and session expiration from the authorized environment. If using a proxy, supply a Playwright proxy object with server, username and password, plus matching facility_zip and proxy_zip. Provision a dedicated sticky lease with the proxy provider. The worker compares the configured ZIPs. For remote Chromium use cdp_endpoint on a dedicated trusted browser service.
   - For CAQH, `providers/<opaque-id>` contains draft_id, previous (previously signed field values), documents, and state_license, cds, dea and malpractice objects with ISO expires dates.
3. Start `uv run python -m app.workflows.temporal_worker` and `uv run uvicorn app.api.main:app --no-access-log`. Both processes must share Vault keys and audit storage. Fetch `GET /openapi.json` with a staff bearer token for the request schemas.
4. POST /v1/prior-auth with a payer, profile, expected_draft_id and documents. A document has name, kind (text, pdf or fhir) and content. Use base64 for PDF bytes. FHIR ingestion accepts individual resources or a single-patient R4 Bundle. Install Poppler and Tesseract on the worker for scanned pages. Set MEDAUTO_MODEL, MEDAUTO_APPROVED_MODEL_ENDPOINT and OPENAI_API_KEY to enable Instructor extraction against an approved OpenAI-compatible endpoint. Offline extraction accepts explicitly labelled text and selected structured ServiceRequest codes and identifiers. It does not infer diagnosis priority from resource order.
5. The clinic webhook receives a workflow ID and review reference. Staff fetch /v1/workflows/{id}/review and its ?image=true variant, check the evidence and complete form, and POST the packet digest to /signature. The /otp endpoint accepts an authenticated connector's code and issues a five-minute encrypted reference. A 90-day interval schedule is available at /v1/credentialing/schedules.
6. If submission fails after the intent insert, check the payer for a receipt, reconcile the database record and retained evidence, and involve clinic staff. An ordinary retry cannot repeat the click.

### Intake and status shortcuts

Send the intake payload to `POST /v1/prior-auth/validate` with the intake role to check document formats before opening a case. The response lists zero-based document indexes and error codes without echoing document contents. This checks text, base64 PDF headers, supported FHIR resources and duplicate names. OCR, extraction and clinical sufficiency checks run during case processing. The submission endpoint applies the same format checks.

A successful intake returns a `status_url` and a `Location` header. Staff can fetch that URL to see the Temporal execution status, the workflow stage, the next scheduled payer poll in UTC, and links to the review packet, screenshot, signature or OTP endpoint when applicable. Each endpoint still enforces its role.

### Example synthetic profile

To enable policy search, apply `config/policy_embeddings.sql` to PostgreSQL, load the clinic's licensed, versioned policy vectors and set embedding_model on the payer profile. The worker queries only effective policies for that payer and model. Staff receive the matching references with the review packet.

```json
{
  "payer": "availity",
  "url": "https://payer-sandbox.example/assigned-draft",
  "username": "assigned-service-account",
  "password": "provision-in-vault",
  "ttl": 900,
  "fields": {"cpt_hcpcs": "#procedure"},
  "required_fields": ["cpt_hcpcs"],
  "selectors": {
    "username": "#username", "password": "#password", "login": "#login",
    "authenticated": "#account", "otp": "#code", "verify": "#verify",
    "draft": "#form", "draft_id": "#draft-id", "save": "#save",
    "upload": "#files", "attachment_names": ".attachment-name",
    "submit": "#submit", "receipt": "#receipt", "status": "#determination"
  },
  "statuses": {"Approved": "APPROVED", "Denied": "DENIED", "Withdrawn": "WITHDRAWN"}
}
```

The selector contract assumes a preassigned, server-persisted draft that can be reopened from the configured URL after each browser activity. Map every submitted field, receipt, attachment listing and determination to the authenticated draft. Each named payer adapter uses this contract. Live, multi-step portal behavior requires payer-specific qualification. Vision navigation requires a configured vision_model, an approved HTTPS model endpoint, draft_link selector and draft_link_label. The final submission uses the reviewed deterministic selector.

## Security and deployment boundaries

The default filesystem store encrypts artifacts with AES-256-GCM and publishes SHA-256-addressed files with exclusive writes. For retention enforcement configure MEDAUTO_AUDIT_BUCKET and MEDAUTO_RETENTION_DAYS with a versioned S3 Object Lock bucket. The S3 backend requests COMPLIANCE retention on every write. Review IAM, lifecycle, backup, restore and retention policy with the clinic. Browser traces, video and OCR use temporary files before encryption. Use encrypted ephemeral worker storage and isolate browser processes and network egress.

Configure TLS for the API gateway, Redis, PostgreSQL and Vault. Set MEDAUTO_TEMPORAL_MTLS_SECRET to a Vault path with PEM ca, cert and key for Temporal mTLS. Configure staff identity lifecycle, access records, key rotation and recovery, monitoring, retention, licensed payer policies and vendor agreements before processing ePHI. Model quote checks establish textual provenance. The reviewer must still check the clinical meaning and patient identity. The local checklist evaluates clinic-supplied required fields. It does not implement licensed InterQual or MCG criteria.

The Compose stack, object retention, external model provider, production identity infrastructure and real payer portals require deployment-specific validation. HHS describes risk analysis and business associate agreements for cloud services handling ePHI. [HHS cloud computing guidance](https://www.hhs.gov/hipaa/for-professionals/special-topics/health-information-technology/cloud-computing/index.html)

The 90-day schedule is an operational buffer. CAQH documents a 120-day re-attestation interval and a 180-day interval for Illinois. [CAQH provider guide](https://proview.caqh.org/Login/Download?filename=CAQH+Provider+Data+Portal+for+Providers+User+Guide+v44.0.pdf)
