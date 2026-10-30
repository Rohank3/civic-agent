import json
from datetime import datetime, timezone
from sqlalchemy import insert, update
from temporalio import activity

from app.core.runtime import submissions
from app.domain.citizen.schemas import ServiceRequest, TrackingReceipt
from app.domain.browser.session_manager import SessionManager
from app.domain.browser.solvers import ObstacleSolver
from app.domain.browser.memory import PortalMemory
from app.domain.browser.agent import AutonomousBureaucracyAgent


class BureaucracyActivities:
    def __init__(self, runtime):
        self.rt = runtime
        self.sessions = SessionManager(
            runtime.redis, runtime.audit.cipher, runtime.audit, runtime.settings.session_ttl
        )
        self.memory = PortalMemory(runtime.redis)

    def read_request(self, case: str, ref: str) -> ServiceRequest:
        raw_data = self.rt.audit.read_json(case, "source", ref)
        return ServiceRequest.model_validate(raw_data)

    @activity.defn
    async def navigate_and_fill(self, case: str, ref: str) -> str:
        """Autonomously navigate legacy portal, populate forms, and handle obstacles."""
        req = self.read_request(case, ref)
        profile_cfg = {
            "url": req.portal_url,
            "allowed_origins": [req.portal_url]
        }
        solver = ObstacleSolver(redis=self.rt.redis)

        async with self.sessions.page(case, req.service_id, profile_cfg) as page:
            agent = AutonomousBureaucracyAgent(page, req, solver, memory=self.memory)

            # Navigate and fill multi-step wizards (up to 10 steps)
            max_steps = 10
            step = 0
            while step < max_steps:
                if activity.in_activity():
                    activity.heartbeat(f"Step {step+1}: scanning and filling")
                await agent.scan_and_populate_current_page()

                if await agent.is_review_or_submission_page():
                    break

                advanced = await agent.advance_wizard_step()
                if not advanced:
                    break
                step += 1

            # Build pre-submission verification packet and capture screenshot
            snapshot = await agent.self_reflect_and_verify()
            review_screenshot_digest = self.rt.audit.put(
                case, "review.png", await page.screenshot(full_page=True)
            )

            packet_data = {
                "case_id": case,
                "service_id": req.service_id,
                "citizen_name": req.profile.full_name,
                "page_url": page.url,
                "screenshot": review_screenshot_digest,
                "snapshot": snapshot,
                "require_review": req.require_review
            }
            packet_digest = self.rt.audit.json(case, "review", packet_data)
            return packet_digest

    @activity.defn
    async def submit_and_extract_receipt(self, case: str, ref: str, packet: str) -> str:
        """Commit intent, submit the form, and extract tracking receipt & audit artifacts."""
        req = self.read_request(case, ref)
        profile_cfg = {
            "url": req.portal_url,
            "allowed_origins": [req.portal_url]
        }
        solver = ObstacleSolver(redis=self.rt.redis)

        # Commit submission intent to PostgreSQL prior to side-effect
        async with self.rt.db.begin() as conn:
            await conn.execute(insert(submissions).values(case_id=case, packet=packet))

        async with self.sessions.page(case, req.service_id, profile_cfg) as page:
            agent = AutonomousBureaucracyAgent(page, req, solver, memory=self.memory)

            # In case the browser reopened at the initial step, advance through to submission
            step = 0
            while step < 10:
                await agent.scan_and_populate_current_page()
                if await agent.is_review_or_submission_page():
                    break
                advanced = await agent.advance_wizard_step()
                if not advanced:
                    break
                step += 1

            if activity.in_activity():
                activity.heartbeat("Submitting application")
            await agent.submit_application()

            # Extract tracking receipt and artifacts
            receipt_info = await agent.extract_tracking_receipt(case)

            receipt_digest = self.rt.audit.put(case, "receipt.html", receipt_info["page_html"].encode("utf-8"))
            screenshot_digest = self.rt.audit.put(case, "receipt_screenshot.png", receipt_info["screenshot_bytes"])

            receipt_record = TrackingReceipt(
                case_id=case,
                service_id=req.service_id,
                tracking_number=receipt_info["tracking_number"],
                timestamp=datetime.now(timezone.utc).isoformat(),
                portal_url=receipt_info["page_url"],
                status="SUBMITTED",
                receipt_artifact_digest=receipt_digest,
                screenshot_artifact_digest=screenshot_digest,
                details={"verified_name": req.profile.full_name}
            )

            proof = self.rt.audit.json(case, "receipt", receipt_record.model_dump())

            async with self.rt.db.begin() as conn:
                await conn.execute(update(submissions).where(submissions.c.case_id == case).values(receipt=proof))

            return proof

    @activity.defn
    async def poll_application_status(self, case: str, ref: str, tracking_number: str) -> str:
        """Poll the legacy portal for status updates on an active tracking number."""
        req = self.read_request(case, ref)
        profile_cfg = {
            "url": req.portal_url,
            "allowed_origins": [req.portal_url]
        }
        async with self.sessions.page(case, req.service_id, profile_cfg) as page:
            # Look for tracking search input
            status_input = page.locator("input[name*='track'], input[id*='track'], input[placeholder*='track'], #txtTracking").first
            if await status_input.is_visible(timeout=1000):
                await status_input.fill(tracking_number)
                search_btn = page.locator("button:has-text('Check Status'), button:has-text('Search'), input[type='submit']").first
                if await search_btn.is_visible(timeout=1000):
                    await search_btn.click()
                    await page.wait_for_timeout(1000)

            # Check page text for determination status
            content = (await page.locator("body").inner_text()).upper()
            if any(term in content for term in ("APPROVED", "GRANTED", "ISSUED")):
                return "APPROVED"
            if any(term in content for term in ("DENIED", "REJECTED", "DISAPPROVED")):
                return "DENIED"
            if any(term in content for term in ("ACTION REQUIRED", "ADDITIONAL DOCUMENTS", "AUDIT")):
                return "ACTION_REQUIRED"
            return "UNDER_REVIEW"
