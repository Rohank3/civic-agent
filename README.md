# CivicAgent: Autonomous Scholarship & Higher Education Bureaucracy Agent

> **Track**: Civic Pulse, Digital Governance & Public Information  
> **Problem Spectrum**: Autonomous Public Service & Bureaucracy Execution Agent

An autonomous web/browser execution agent powered by Playwright and FastAPI that ingests a student's demographic profile, queries live open government data (`data.gov.in`) for active statutory scholarships, extracts verified academic criteria via multimodal OCR, navigates complex multi-step legacy portals, populates application forms, handles UI obstacles, and returns completed tracking receipts with cryptographic SHA-256 audit proofs.

---

## Key Capabilities

1. **Live Open Data Integration (Zero Dummy Data Policy)**:
   - Queries live statutory scholarship registries (`data.gov.in` / National Scholarship Scheme catalogs) in real time.
   - Evaluates eligibility thresholds (family income caps, GPA/percentage cut-offs, reservation categories, state domicile) dynamically.

2. **Multimodal Document Intelligence Pre-flight**:
   - Ingests student transcript and marksheet PDFs.
   - Extracts verified GPA, roll number, academic department, and institution name *before* launching the browser to prevent rejected applications.

3. **Autonomous Browser Navigation & Obstacle Solving**:
   - Resilient Playwright automation engine equipped with heuristic form field mapping and multimodal vision fallback.
   - Automatically detects and resolves UI obstacles: modal popups, cookie consents, alert dialogs, and dynamic category cascades.
   - Implements pre-submission self-reflection to verify interactive DOM controls before committing.

4. **Human-in-the-Loop (HITL) Guardrails & Audit Receipts**:
   - Real-time WebSocket telemetry stream broadcasting reasoning steps and browser screencast frames.
   - Pauses on final legal declarations for explicit citizen digital consent.
   - Extracts official government tracking numbers and produces tamper-evident SHA-256 cryptographic audit receipts.

---

## Architecture Overview

```
[ Citizen Web Cockpit ]
         |
         | REST / WebSocket
         v
[ FastAPI Gateway & Telemetry Manager ]
    |                    |
    |                    v
    |         [ Multimodal OCR Engine ] (PyPDF & Gemini Document Intelligence)
    v
[ Live Scheme Matcher ] (data.gov.in Open Data Registry)
    |
    v
[ Autonomous Bureaucracy Agent ] (Playwright + Stealth + Heuristic Solver + Vision Fallback)
    |
    v
[ Target Scholarship Portal ] (Live Government / Institutional Portals)
```

---

## Quickstart & Local Execution

### 1. Prerequisites
- Python 3.12+ / Python 3.13
- Playwright Chromium (`python -m playwright install chromium`)

### 2. Run the Full Test Suite
```powershell
# Set PYTHONPATH to project root and site-packages
$env:PYTHONPATH=".;.venv\Lib\site-packages"
python -m pytest tests/ -v
```

### 3. Run the End-to-End Simulation
Run the live interactive simulation of a student applying for higher education grants:
```powershell
$env:PYTHONPATH=".;.venv\Lib\site-packages"
python scripts/simulate_citizen_case.py state_scholarship
```

### 4. Launch the Backend API Gateway
```powershell
$env:PYTHONPATH=".;.venv\Lib\site-packages"
python -m uvicorn app.api.main:app --host 0.0.0.0 --port 8000 --reload
```

Interactive API documentation available at: `http://localhost:8000/docs`

---

## API Endpoints

### Scholarship Schemes & Matching
- `GET /v1/schemes/list`: Retrieve all active statutory scholarship schemes across state and central registries.
- `POST /v1/schemes/match`: Evaluate student profile against live criteria and return ranked eligibility results.
- `POST /v1/schemes/ocr-transcript`: Extract academic GPA, roll number, and institution from student transcript payload.

### Bureaucracy Execution
- `POST /v1/services/preflight`: Evaluate student application completeness and sufficiency score without launching browser.
- `POST /v1/services/execute`: Ingest profile and launch autonomous browser execution.
- `GET /v1/services/{case_id}/status`: Query live execution state and progress milestones.
- `POST /v1/services/{case_id}/signature`: Submit citizen digital consent for final legal submission.
- `GET /v1/services/{case_id}/receipt`: Retrieve cryptographic audit receipt with tracking number and visual proof.

### Real-Time Telemetry
- `WebSocket /ws/telemetry/{case_id}`: Stream live browser screencast frames and agent reasoning logs directly to the frontend cockpit.

---

## Security & Compliance
- **Zero Dummy Data**: Connects to active backends and queries official statutory catalogs.
- **PII Protection**: Automatic phone, email, and national ID redaction in public telemetry and review logs.
- **Cryptographic Audit Proof**: Raw screenshots and receipts are encrypted with AES-256-GCM and hashed with SHA-256 digests.
