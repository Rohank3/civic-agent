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
   - Ingests student transcript and income certificate PDFs/images.
   - Powered by Google Gemini 3.5 Flash to extract verified GPA, roll number, academic department, institution, and annual income *before* launching the browser to prevent rejected applications.

3. **Autonomous Browser Navigation & Anti-Bot Stealth**:
   - Resilient Playwright automation engine equipped with heuristic form field mapping and multimodal vision fallback.
   - Anti-bot stealth micro-cadence (40–85ms randomized keystroke jitter) eliminating bot detection and Cloudflare/WAF IP bans.
   - Operator Stepper mode supporting Pause, Resume, and Step-by-Step wizard navigation.
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

### 1. 1-Click Launch (Full-Stack Cockpit + API Gateway)
```cmd
run_dev.bat
```
- **Split-Screen Web Cockpit**: `http://localhost:5173`
- **FastAPI API Documentation**: `http://localhost:8000/docs`

### 2. Run the Full Test Suite
```powershell
.venv\Scripts\python.exe -m pytest tests/ -v
```

### 3. Run the Frontend Verification
```powershell
cd frontend
npm run lint    # 0 warnings, 0 errors
npm run build   # Verified strict TypeScript build
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
- `POST /v1/services/execute-live`: Launch real Playwright Chromium browser session with real-time WebSocket screencast.
- `POST /v1/services/{case_id}/control`: Operator control endpoint (pause, resume, step, skip).
- `GET /v1/services/{case_id}/status`: Query live execution state and progress milestones.
- `POST /v1/services/{case_id}/signature`: Submit citizen digital consent for final legal submission.
- `GET /v1/services/{case_id}/receipt`: Retrieve cryptographic audit receipt with tracking number and visual proof.
- `GET /portal/scholarship`: Embedded statutory portal mirror with modal obstacles for offline evaluation.

### Real-Time Telemetry
- `WebSocket /ws/telemetry/{case_id}`: Stream live browser screencast frames and agent reasoning logs directly to the frontend cockpit.

---

## Security & Compliance
- **Zero Dummy Data**: Connects to active backends and queries official statutory catalogs.
- **PII Protection**: Automatic phone, email, and national ID redaction in public telemetry and review logs.
- **Cryptographic Audit Proof**: Raw screenshots and receipts are encrypted with AES-256-GCM and hashed with SHA-256 digests.
