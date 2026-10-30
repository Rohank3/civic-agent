"""Developer & Operator CLI simulation utility for citizen public service workflows."""
import asyncio
import base64
import sys
import time

from playwright.async_api import async_playwright

from app.domain.citizen.schemas import CitizenProfile, ServiceRequest
from app.domain.citizen.preflight import run_preflight_check
from app.domain.browser.agent import AutonomousBureaucracyAgent
from app.domain.browser.solvers import ObstacleSolver
from tests.test_bureaucracy_agent import synthetic_bureaucracy_server


async def run_simulation(service_id: str = "state_scholarship"):
    print("=" * 70)
    print("  AUTONOMOUS PUBLIC SERVICE & BUREAUCRACY EXECUTION AGENT")
    print("=" * 70)

    print("\n[1/5] Ingesting Citizen Profile...")
    citizen = CitizenProfile(
        full_name="Marcus Aurelius Vance",
        date_of_birth="2001-04-26",
        national_id="SSN-888-99-0001",
        email="marcus.vance@state-university.edu",
        phone="555-019-9481",
        address_street="742 Evergreen Terrace",
        address_city="Springfield",
        address_state="OR",
        address_zip="97477",
        income_annual=24000.0,
        household_size=2,
        attributes={"gpa": 3.91, "major": "Philosophy & Computer Science"}
    )
    print(f"      Citizen Name: {citizen.full_name}")
    print(f"      National ID:  ***-**-{citizen.national_id[-4:]}")
    print(f"      Target:       {service_id}")

    fake_pdf = base64.b64encode(b"%PDF-1.4 official university transcript").decode()
    service_req = ServiceRequest(
        service_id=service_id,
        portal_url="http://mock-portal.local",
        profile=citizen,
        documents=[{"name": "official_transcript.pdf", "kind": "pdf", "content": fake_pdf}]
    )

    print("\n[2/5] Running Pre-flight Sufficiency Precheck...")
    report = run_preflight_check(service_req)
    print(f"      Sufficiency Score: {report.sufficiency_score * 100:.0f}%")
    print(f"      Is Ready:          {report.is_ready}")
    if report.warnings:
        for w in report.warnings:
            print(f"      [Warning] {w}")

    print("\n[3/5] Spinning up Sandboxed Browser & Synthetic Government Portal...")
    with synthetic_bureaucracy_server() as portal_url:
        service_req.portal_url = portal_url
        print(f"      Portal URL: {portal_url}")

        async with async_playwright() as pw:
            browser = await pw.chromium.launch(headless=True)
            page = await browser.new_page()
            await page.goto(portal_url)

            solver = ObstacleSolver()
            agent = AutonomousBureaucracyAgent(page, service_req, solver)

            print("\n[4/5] Executing Autonomous Portal Navigation & Form Completion...")
            step_num = 1
            while step_num <= 10:
                filled = await agent.scan_and_populate_current_page()
                print(f"      Step {step_num}: Form scanned, populated {filled} fields & handled obstacles.")

                if await agent.is_review_or_submission_page():
                    print("      Reached final review / confirmation page.")
                    break

                advanced = await agent.advance_wizard_step()
                if not advanced:
                    print("      No further wizard steps detected.")
                    break
                step_num += 1

            snapshot = await agent.self_reflect_and_verify()
            print(f"      Self-Reflection: Verified {len(snapshot['controls'])} interactive form controls.")

            print("\n[5/5] Committing Application Submission & Extracting Receipt...")
            await agent.submit_application()
            receipt = await agent.extract_tracking_receipt("sim-case-001")

            print("\n" + "=" * 70)
            print("  APPLICATION SUBMITTED SUCCESSFULLY")
            print("=" * 70)
            print(f"  TRACKING NUMBER:    {receipt['tracking_number']}")
            print(f"  CONFIRMATION URL:   {receipt['page_url']}")
            print(f"  SCREENSHOT BYTES:   {len(receipt['screenshot_bytes']):,} bytes captured")
            print(f"  TIMESTAMP:          {time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())}")
            print("=" * 70)

            await browser.close()


if __name__ == "__main__":
    service = sys.argv[1] if len(sys.argv) > 1 else "state_scholarship"
    asyncio.run(run_simulation(service))
