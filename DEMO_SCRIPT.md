# 🎬 CivicAgent: 150-Second Video Demonstration Walkthrough Script

> **Target Length**: 2 Minutes 30 Seconds (150s)  
> **Recommended Tool**: Loom, OBS Studio, or Screen Studio  
> **Camera / Setup**: Split-screen display of the CivicAgent Web Cockpit (`http://localhost:5173` or `https://civic-agent-alpha.vercel.app`) with mic enabled.

---

## Second-by-Second Walkthrough

| Timestamp | Visual Action | Voiceover Script | Key Technical Callouts |
| :--- | :--- | :--- | :--- |
| **0:00 – 0:25** | Start on **CivicAgent Citizen Portal Login**. Hover over the brand and click the **Sandbox Personas** tab. Select **Eleanor Vance**. | *"Every academic year, billions in higher education scholarships go unclaimed due to bureaucratic drop-off. Complex 15-page legacy forms and confusing requirements force students to abandon their applications midway. Meet **CivicAgent**: an autonomous, vision-augmented execution agent designed to eliminate this procedural tax."* | • 256-bit encrypted session<br>• Instant background wake ping to cloud backend |
| **0:25 – 0:50** | Landing on **Split-Screen Web Cockpit**. Point out the Left Column (Citizen Intake Panel). Drag and drop `sample_documents/academic_transcript_eleanor.pdf` and `income_certificate_eleanor.pdf`. | *"We begin with pre-flight document intelligence. The student uploads their authentic academic marksheet and statutory income certificate. In real time, Google Gemini 3.5 Flash Lite parses the raw PDFs, extracting verified GPA (3.92) and annual income (₹1,80,000) with a 100% Sufficiency Score, cross-referencing live open government catalogs under our strict Zero Dummy Data policy."* | • Multimodal document intelligence (Gemini Flash Lite)<br>• Tamper quarantine validation<br>• Real-time eligibility score |
| **0:50 – 1:25** | Click **"Execute Live Application"** on the Central Sector Scheme. Watch the Right Column (Live Viewport Screencast). Open the **AI Inspector Drawer** in the Navbar. | *"Now, watch CivicAgent take browser control. Powered by Playwright and an anti-bot stealth engine with 40 to 85 millisecond human micro-cadence, the agent navigates the legacy portal, automatically dismisses notice modals, populates dynamic cascading dropdowns, attaches verified PDF payloads, and autonomously overcomes validation obstacles."* | • Playwright Chromium headless screencast via WebSockets<br>• Anti-bot typing micro-cadence jitter<br>• ReAct obstacle & error self-correction |
| **1:25 – 1:55** | Watch the agent advance to Step 3. The **Human-in-the-Loop (HITL) Sign-off Modal** automatically pops up. Citizen signs the HTML5 canvas pad and clicks **"Authorize & Commit"**. | *"CivicAgent strictly enforces Human-in-the-Loop guardrails. At the final statutory declaration, the agent pauses browser execution. The student reviews the pre-submission audit findings and provides their legal digital signature on the canvas pad before any side effects are committed."* | • HITL safety gate<br>• HTML5 canvas digital signature<br>• Pre-submission self-reflection audit |
| **1:55 – 2:15** | Portal displays confirmation. The **Receipt Modal** pops up showing tracking number `PUB-REC-2026-98421`. Click **"Download Audit Receipt (PDF)"**. | *"Submission committed! CivicAgent captures the official government tracking number, hashes full-page visual evidence with a SHA-256 tamper-evident digest, and delivers an instant downloadable PDF tracking receipt with cryptographic proof."* | • Cryptographic SHA-256 audit proof<br>• Downloadable client-side PDF export<br>• Complete audit trail |
| **2:15 – 2:30** | Click the **"Pitch Deck (7s)"** button in the Navbar. Flip through 2-3 slides showing Architecture and Future Roadmap. | *"Judges can also inspect our complete 7-slide technical pitch deck directly inside the cockpit navbar. With CivicAgent, we transform public governance from passive web forms that citizens struggle to complete into autonomous agents that deliver public entitlements directly to those who need them most. Thank you!"* | • In-Cockpit Interactive Slide Deck<br>• Direct judge evaluation with zero friction |

---

## Pro-Tips for Recording
1. **Resolution**: Set browser window to 1080p (1920x1080) for crisp typography and live screencast frames.
2. **Microphone**: Speak clearly with natural pacing.
3. **Pacing Mode**: Keep the agent pacing mode set to **1x** or **Normal** so judges can clearly observe the typing and modal interactions.
4. **Host**: Upload the finished video as **Unlisted** on YouTube or Loom, and paste the URL into `SUBMISSION.md`.
