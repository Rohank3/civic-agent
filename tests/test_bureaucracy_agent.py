import asyncio
import base64
import os
from contextlib import contextmanager
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from threading import Thread
from types import SimpleNamespace
from urllib.parse import parse_qs, urlsplit

import pytest
from fakeredis.aioredis import FakeRedis
from playwright.async_api import async_playwright
from sqlalchemy.ext.asyncio import create_async_engine

from app.core.audit import AuditStore
from app.core.runtime import metadata, submissions
from app.core.security import Cipher
from app.domain.browser.agent import AutonomousBureaucracyAgent
from app.domain.browser.session_manager import SessionManager
from app.domain.browser.solvers import ObstacleSolver
from app.domain.citizen.schemas import CitizenProfile, ServiceRequest
from app.workflows.activities.bureaucracy_activities import BureaucracyActivities

LEGACY_PORTAL_HTML = b"""<!doctype html>
<html>
<head>
    <title>State Public Assistance & Scholarship Portal</title>
    <style>
        .step { display: none; }
        .active { display: block; }
        .modal { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; }
    </style>
</head>
<body>
    <!-- Modal Obstacle -->
    <div id="notice-modal" class="modal">
        <div style="background: white; padding: 20px; border-radius: 8px;">
            <h3>Official Notice</h3>
            <p>Welcome to the State Services Portal. You must accept our cookies to continue.</p>
            <button id="accept-modal" onclick="document.getElementById('notice-modal').style.display='none'">Accept All</button>
        </div>
    </div>

    <!-- Step 1: Personal Info -->
    <div id="step1" class="step active">
        <h2>Step 1: Applicant Demographics</h2>
        <div>
            <label for="txtApplicantName">Applicant Full Name:</label>
            <input type="text" id="txtApplicantName" name="applicant_name">
        </div>
        <div>
            <label for="dob_picker">Date of Birth:</label>
            <input type="text" id="dob_picker" name="date_of_birth">
        </div>
        <div>
            <label for="national_identifier">Social Security / National ID:</label>
            <input type="text" id="national_identifier" name="national_id">
        </div>
        <div>
            <label for="applicant_email">Email Address:</label>
            <input type="text" id="applicant_email" name="email_address">
        </div>
        <div>
            <label for="primary_phone">Contact Phone Number:</label>
            <input type="text" id="primary_phone" name="contact_phone">
        </div>
        <button id="btnNext" onclick="switchStep('step1', 'step2')">Next Step</button>
    </div>

    <!-- Step 2: Address, Financials & Attachments -->
    <div id="step2" class="step">
        <h2>Step 2: Household & Supporting Evidence</h2>
        <div>
            <label for="street_addr">Mailing Address:</label>
            <input type="text" id="street_addr" name="street_address">
        </div>
        <div>
            <label for="city_name">City:</label>
            <input type="text" id="city_name" name="address_city">
        </div>
        <div>
            <label for="state_prov">State:</label>
            <input type="text" id="state_prov" name="state_code">
        </div>
        <div>
            <label for="zip_code">Postal Code:</label>
            <input type="text" id="zip_code" name="postal_code">
        </div>
        <div>
            <label for="gross_income">Annual Household Income:</label>
            <input type="text" id="gross_income" name="annual_income">
        </div>
        <div>
            <label for="income_proof">Upload Proof of Income (PDF):</label>
            <input type="file" id="income_proof" name="income_document">
        </div>
        <div>
            <input type="checkbox" id="chkCertify" name="certification">
            <label for="chkCertify">I declare under penalty of perjury that all submitted facts are true and correct.</label>
        </div>
        <button id="btnReview" onclick="switchStep('step2', 'step3')">Save & Continue</button>
    </div>

    <!-- Step 3: Review and Final Submission -->
    <div id="step3" class="step">
        <h2>Step 3: Review and Final Submission</h2>
        <p>Please review your information before final submission.</p>
        <div id="review-summary">
            Applicant: <span id="summary-name"></span>
        </div>
        <button id="submit-application" onclick="submitApplication()">Submit Application</button>
    </div>

    <!-- Step 4: Confirmation Receipt -->
    <div id="step4" class="step">
        <h2>Application Submitted Successfully</h2>
        <p>Your application has been logged with the state department.</p>
        <div>
            Tracking Number: <span id="tracking-number">PUB-REC-2026-98421</span>
        </div>
    </div>

    <script>
        function switchStep(fromId, toId) {
            document.getElementById(fromId).classList.remove('active');
            document.getElementById(toId).classList.add('active');
            if (toId === 'step3') {
                document.getElementById('summary-name').innerText = document.getElementById('txtApplicantName').value;
            }
        }
        function submitApplication() {
            document.getElementById('step3').classList.remove('active');
            document.getElementById('step4').classList.add('active');
        }
    </script>
</body>
</html>
"""


@contextmanager
def synthetic_bureaucracy_server():
    class Handler(BaseHTTPRequestHandler):
        def do_GET(self):
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Connection", "close")
            self.end_headers()
            self.wfile.write(LEGACY_PORTAL_HTML)

        def log_message(self, *args):
            pass

    httpd = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    thread = Thread(target=httpd.serve_forever, daemon=True)
    thread.start()
    try:
        yield f"http://127.0.0.1:{httpd.server_port}"
    finally:
        httpd.shutdown()
        httpd.server_close()
        thread.join()


@pytest.mark.asyncio
async def test_autonomous_bureaucracy_agent_end_to_end(tmp_path):
    """Test AutonomousBureaucracyAgent navigating multi-step wizard, handling modal, filling inputs, and extracting receipt."""
    with synthetic_bureaucracy_server() as portal_url:
        citizen = CitizenProfile(
            full_name="Jane Citizen",
            date_of_birth="1995-04-12",
            national_id="SSN-999-88-7777",
            email="jane.citizen@example.org",
            phone="555-019-2831",
            address_street="123 Democracy Boulevard",
            address_city="Civic City",
            address_state="State",
            address_zip="12345",
            income_annual=45000.0,
            household_size=2
        )
        fake_pdf_content = base64.b64encode(b"%PDF-1.4 synthetic proof").decode()
        service_req = ServiceRequest(
            service_id="state_scholarship",
            portal_url=portal_url,
            profile=citizen,
            documents=[
                {"name": "income_proof.pdf", "kind": "pdf", "content": fake_pdf_content}
            ],
            require_review=False
        )

        async with async_playwright() as pw:
            browser = await pw.chromium.launch(headless=True)
            page = await browser.new_page()
            await page.goto(portal_url)

            solver = ObstacleSolver()
            agent = AutonomousBureaucracyAgent(page, service_req, solver)

            # Step 1: Should dismiss notice modal and populate Step 1 fields
            filled = await agent.scan_and_populate_current_page()
            assert filled >= 4
            assert await page.locator("#txtApplicantName").input_value() == "Jane Citizen"
            assert await page.locator("#applicant_email").input_value() == "jane.citizen@example.org"

            # Advance to Step 2
            advanced = await agent.advance_wizard_step()
            assert advanced is True
            assert await page.locator("#step2").is_visible()

            # Step 2: Populate address, income, and handle checkbox
            filled_step2 = await agent.scan_and_populate_current_page()
            assert filled_step2 >= 4
            assert await page.locator("#street_addr").input_value() == "123 Democracy Boulevard"
            assert await page.locator("#gross_income").input_value() == "45000.0"
            assert await page.locator("#chkCertify").is_checked()

            # Advance to Step 3 (Review & Submit)
            advanced_step3 = await agent.advance_wizard_step()
            assert advanced_step3 is True
            assert await agent.is_review_or_submission_page()

            # Self-reflection verification
            snapshot = await agent.self_reflect_and_verify()
            assert snapshot["citizen_name"] == "Jane Citizen"
            assert snapshot["national_id"] == "SSN-999-88-7777"

            # Submit application
            await agent.submit_application()
            assert await page.locator("#step4").is_visible()

            # Extract tracking receipt
            receipt = await agent.extract_tracking_receipt("test-case-123")
            assert receipt["tracking_number"] == "PUB-REC-2026-98421"
            assert len(receipt["screenshot_bytes"]) > 0

            await browser.close()


@pytest.mark.asyncio
async def test_bureaucracy_activities_execution(tmp_path):
    """Test BureaucracyActivities orchestrating navigation, review packet, and receipt proof."""
    db = create_async_engine("sqlite+aiosqlite://")
    async with db.begin() as conn:
        await conn.run_sync(metadata.create_all)

    audit = AuditStore(tmp_path, Cipher(os.urandom(32)))
    redis = FakeRedis()

    with synthetic_bureaucracy_server() as portal_url:
        citizen = CitizenProfile(
            full_name="Alexander Hamilton",
            date_of_birth="1755-01-11",
            national_id="SSN-000-11-2222",
            email="hamilton@treasury.gov",
            phone="202-555-0144",
            address_street="100 Liberty St",
            address_city="New York",
            address_state="NY",
            address_zip="10005",
            income_annual=80000.0,
            household_size=4
        )
        service_req = ServiceRequest(
            service_id="driver_license_renewal",
            portal_url=portal_url,
            profile=citizen,
            documents=[],
            require_review=False
        )

        case_id = "bureaucracy-case-001"
        source_ref = audit.json(case_id, "source", service_req.model_dump())

        rt = SimpleNamespace(
            redis=redis,
            audit=audit,
            db=db,
            settings=SimpleNamespace(session_ttl=900)
        )
        activities = BureaucracyActivities(rt)

        # 1. Navigate and fill
        packet_digest = await activities.navigate_and_fill(case_id, source_ref)
        assert packet_digest

        packet_data = audit.read_json(case_id, "review", packet_digest)
        assert packet_data["citizen_name"] == "Alexander Hamilton"
        assert packet_data["service_id"] == "driver_license_renewal"

        # 2. Submit and extract receipt
        proof_digest = await activities.submit_and_extract_receipt(case_id, source_ref, packet_digest)
        assert proof_digest

        receipt_data = audit.read_json(case_id, "receipt", proof_digest)
        assert receipt_data["tracking_number"] == "PUB-REC-2026-98421"
        assert receipt_data["status"] == "SUBMITTED"

        # Verify PostgreSQL database record committed
        async with db.connect() as conn:
            row = (await conn.execute(submissions.select())).one()
            assert row.case_id == case_id
            assert row.receipt == proof_digest

    await db.dispose()
