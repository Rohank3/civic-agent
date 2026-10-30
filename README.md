# medauto-core

A single-clinic reference implementation for staff-reviewed prior authorization and CAQH re-attestation. The API passes opaque case and artifact references through Temporal. The worker decrypts source records, fills a configured payer draft, and publishes a review packet. An authenticated reviewer signs the packet digest. Before clicking submit the worker reopens the draft, verifies its identity, controls and attachment listing, and commits a unique submission intent in PostgreSQL.

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
3. Start `uv run python -m app.workflows.temporal_worker` and `uv run uvicorn app.api.main:app --no-access-log`. Both processes must share Vault keys and audit storage. Visit /docs for the JSON request schemas.
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
