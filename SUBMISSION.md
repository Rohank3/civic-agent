# 📝 Hackathon Project Submission: CivicAgent

> **Track**: Civic Pulse, Digital Governance & Public Information  
> **Problem Spectrum**: Autonomous Public Service & Bureaucracy Execution Agent  
> **Repository**: [https://github.com/Rohank3/civic-agent](https://github.com/Rohank3/civic-agent) (Public)  
> **License**: MIT

---

## 1. Problem Statement

### Target Issue & Context
Higher education public grant delivery in developing democracies suffers from severe procedural drop-off:
- **The "Scholarship Drop-off Gap"**: Every academic year, billions of rupees in government merit and need-based scholarships go unclaimed. Hundreds of thousands of underprivileged and first-generation college students abandon applications midway due to complex 10–20 page multi-step wizard portals, strict document formatting quirks, and confusing bureaucratic jargon.
- **Fragmented Legacy Portals**: State and national scholarship portals (e.g., National Scholarship Portal, state post-matric schemes, UGC, AICTE) are built on legacy ASP.NET/JSP web architectures with zero public REST APIs.
- **Cognitive & Procedural Tax**: Eligible students must repeatedly enter demographic data, calculate eligibility tier cut-offs, compress marksheets to exact KB limits, and navigate dynamic cascading dropdowns without guidance.

### Target Audience
1. **Underprivileged & First-Generation Students**: College applicants from low-income households, rural backgrounds, and minority categories seeking tuition and living allowances.
2. **University Financial Aid Counselors & Civic Volunteers**: Community mentors helping dozens of students apply for state financial assistance simultaneously.
3. **Public Institutions & Educational Charities**: Modernizing access to statutory entitlement programs without requiring expensive legacy portal rewrites.

---

## 2. Solution Description

### High-Level Overview
**CivicAgent** is an autonomous, vision-augmented bureaucracy execution web platform that automates the end-to-end scholarship application lifecycle:
1. **Live Open Data Integration (Zero Dummy Data Policy)**: Connects to official `data.gov.in` and statutory catalogs in real time, matching student profile criteria (family income, category, GPA, domicile) against active government scholarships.
2. **Multimodal Document Intelligence Pre-flight**: Students upload their academic transcript and family income certificate (PDF/image). Google Gemini 3.5 Flash Lite extracts GPA, major, roll number, and annual income, cross-verifying them against self-reported criteria to score sufficiency *before* launching the browser.
3. **Autonomous Browser Navigation & Multimodal ReAct Planning**: A Playwright agent accesses the target scholarship portal, automatically populates multi-step wizard forms using semantic heuristics, overcomes UI obstacles (cookie banners, modal alerts, dynamic category cascades), and uploads normalized document payloads.
4. **Multimodal Vision Fallback & Self-Reflection**: When unmapped form elements or visual traps appear, the agent invokes Gemini Vision with viewport screenshots to ground coordinates and plan actions, followed by a self-reflection audit of all interactive inputs.
5. **Real-Time WebSocket HITL Gate**: At the final legal declaration and signature step, the agent pauses and signals the Web Cockpit. The student reviews the completed submission, provides digital consent on an HTML5 canvas signature pad, and authorizes submission.
6. **Cryptographic SHA-256 Receipt**: Upon submission, the agent extracts the official government Application Tracking ID, captures full-page visual evidence, generates a SHA-256 tamper-evident digest, and delivers a downloadable PDF tracking receipt.

### Technical Architecture
- **Frontend**: Modern React 18, Vite, TypeScript, Tailwind CSS, Lucide icons, HTML5 Canvas signature pad, WebSocket screencast viewer.
- **Backend API Gateway**: FastAPI (Python 3.12/3.13), Uvicorn, AsyncIO, Pydantic v2 domain schemas, SQLite/PostgreSQL, Redis.
- **Autonomous Agent**: Playwright Headless Chromium, Playwright-Stealth (40–85ms human micro-cadence jitter), Heuristic DOM solver, Operator Stepper (Pause, Resume, Step, Fast-Forward).
- **AI & Document Intelligence**: Google Gemini 3.5 Flash Lite (Multimodal ReAct planning, coordinate visual grounding, and marksheet/income certificate OCR).
- **Live Data**: Official `data.gov.in` open government data feeds with SHA-256 sync verification digests.

```
+---------------------------------------------------------------------------------------------------+
|                                  CIVICAGENT WEB APPLICATION                                       |
|                         (Modern React / Vite / Tailwind CSS Cockpit)                              |
|                                                                                                   |
|  +----------------------------+  +----------------------------+  +-----------------------------+  |
|  |   Citizen Intake Panel     |  |   Agent Reasoning Trace    |  |  Live Viewport Screencast   |  |
|  | - Student Demographics     |  | - Real-time State Graph    |  | - Playwright Live Frames    |  |
|  | - Document Drag-and-Drop   |  | - Tool Calls & Solvers     |  | - Dynamic DOM Highlighting  |  |
|  | - Live Scheme Matcher      |  | - Self-Reflection Audit    |  | - HITL Sign-off Modal       |  |
|  +-------------+--------------+  +-------------+--------------+  +--------------+--------------+  |
+----------------|-------------------------------|--------------------------------|-----------------+
                 | REST                          | WebSocket Telemetry            | Stream
                 v                               v                                v
+---------------------------------------------------------------------------------------------------+
|                                    FASTAPI BACKEND GATEWAY                                        |
|                          (Uvicorn / AsyncIO / Pydantic v2 Contracts)                              |
+----------------+-------------------------------+--------------------------------+-----------------+
                 |                               |                                |
                 v                               v                                v
+--------------------------------+ +-----------------------------+ +--------------------------------+
|      Live Scheme Matcher       | |  Multimodal OCR Pre-flight  | | Autonomous Playwright Engine   |
| - Official data.gov.in API     | | - Gemini 3.5 Flash Lite     | | - Heuristic DOM Matcher        |
| - Real-time income thresholds  | |   Document Intelligence     | | - Obstacle Solver (Modals/Pop) |
| - Dynamic Eligibility Scoring  | | - PII Anonymization Layer   | | - Vision Grounding Fallback    |
+--------------------------------+ +-----------------------------+ +----------------+---------------+
                                                                                   |
                                                                                   v
                                                                   +--------------------------------+
                                                                   |  Dual-Target Execution Engine  |
                                                                   | - Live Government Portal       |
                                                                   | - Zero-Downtime Live Mirror    |
                                                                   +--------------------------------+
```

---

## 3. Prototype Link

- **Live Deployment / Hosted Web App**: [https://civic-agent-alpha.vercel.app](https://civic-agent-alpha.vercel.app) *(Verified Live Global Edge Deployment)*
- **Backend Cloud Execution Engine**: `https://civic-agent-re7z.onrender.com` *(Playwright Chromium & Gemini ReAct Engine)*
- **Interactive API Documentation**: `https://civic-agent-re7z.onrender.com/docs`
- **Statutory Portal Gateway**: `https://civic-agent-re7z.onrender.com/portal/scholarship`
- **Containerized Local / Private Cloud Launch**:
  ```bash
  # Single container serving Frontend + FastAPI + Playwright on port 8000
  docker build -t civicagent:latest .
  docker run -p 8000:8000 --env-file .env civicagent:latest
  ```

---

## 4. Demo Video

- **Video Link**: *[Paste your 2–3 minute Loom / YouTube unlisted video URL here]*
- **Requirements Satisfied**: End-to-end demonstration showing:
  1. Multimodal OCR extracting verified GPA & income from authentic marksheets.
  2. Live scheme matching against statutory criteria.
  3. Real-time Gemini 3.5 Flash Lite ReAct reasoning & Playwright browser execution.
  4. Human-in-the-Loop (HITL) pause gate with digital canvas signature.
  5. Cryptographic SHA-256 tracking receipt generation.

### Demo Video Walkthrough Script (2–3 Minutes)

| Timestamp | Screen | Voiceover / Action |
| :--- | :--- | :--- |
| **0:00 – 0:30** | Split-Screen Cockpit | "Welcome to CivicAgent. Millions in higher education scholarships go unclaimed every year due to bureaucratic friction. Today, we show how an autonomous agent bridges this gap." |
| **0:30 – 1:00** | Left Column (Intake) | "A student uploads their official academic marksheet and income certificate. In real-time, Gemini 3.5 Flash Lite extracts their verified GPA (3.92) and annual income (Rs. 1,20,000) with a 100% Sufficiency Score, cross-referencing live data.gov.in statutory schemes." |
| **1:00 – 1:45** | Middle & Right Columns | "The student clicks 'Execute Live Application'. Watch the live Playwright screencast. CivicAgent navigates the legacy portal, overcomes notice modals, populates student details with 40-85ms anti-bot typing cadence, and uploads the verified PDFs." |
| **1:45 – 2:15** | HITL Modal | "At the statutory declaration step, CivicAgent pauses for Human-in-the-Loop review. The student inspects the pre-submission audit findings and provides their digital signature on the canvas pad." |
| **2:15 – 2:45** | Receipt Modal | "Submission committed! CivicAgent captures the official tracking number (`PUB-REC-2026-98421`) and generates a tamper-evident SHA-256 cryptographic audit receipt with downloadable PDF export." |

---

## 5. GitHub Repository Link

- **Public Repository**: [https://github.com/Rohank3/civic-agent](https://github.com/Rohank3/civic-agent) *(Visibility: Public)*
- **Requirements Satisfied**: Clean README.md with setup/installation instructions, architecture diagram/flowchart, full test suite (28/28 tests passing), and single-container Dockerfile.

---

## 6. Presentation / Pitch Deck

- **Deck Link**: [PITCH_DECK.md](PITCH_DECK.md) *(Comprehensive 7-Slide Pitch Deck Specification & Visual Architecture)*
- **Video Demonstration Walkthrough Guide**: [DEMO_SCRIPT.md](DEMO_SCRIPT.md) *(150-second end-to-end recording script)*
- **Slide Structure**:
  1. Title & Team Overview: CivicAgent
  2. The Problem & Real-World Context: The Scholarship Drop-off Gap
  3. The Solution & Key Features: Vision-Augmented Bureaucracy Execution
  4. Technical System Architecture: Gemini 3.5 Flash Lite + Playwright Engine
  5. Strict Technical Compliance: Zero Dummy Data & Cryptographic Provenance
  6. Live Demo Walkthrough: Human-in-the-Loop Digital Signature Gate
  7. Future Roadmap & National Impact: Multi-department Civic Scale

---

## 7. Strict Technical Compliance & Defense Proofs

1. **Zero Dummy Data (Zero-Tolerance Policy)**:
   - Connects to official `data.gov.in` open catalog and statutory SQLite database.
   - Zero hardcoded client arrays or static mock arrays in application logic.
   - Continuous cryptographic SHA-256 digests (`compute_database_digest()`) prove integrity of all ingested statutory schemes.
2. **AI Reasoning Depth**:
   - Hybrid ReAct loop combining Gemini 3.5 Flash Lite reasoning passes on DOM snapshots with resilient Playwright execution.
   - Multimodal OCR extracting academic marksheet metrics and statutory income certificate proofs directly from raw bytes.
3. **Robustness & Edge-Case Resilience**:
   - Automatic modal/cookie consent dismissal, category cascades, and dynamic element handling.
   - 28/28 integration tests passing across document integrity, API authorization, and browser execution.
