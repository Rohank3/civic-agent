import asyncio
import base64
import json
import logging
import re
import tempfile
from pathlib import Path
from typing import Any
from playwright.async_api import Page, TimeoutError as PlaywrightTimeout

from app.domain.citizen.schemas import CitizenProfile, ServiceRequest, TrackingReceipt
from app.domain.browser.solvers import ObstacleSolver
from app.domain.browser.memory import PortalMemory

logger = logging.getLogger(__name__)

FIELD_SYNONYMS = {
    "full_name": ["full name", "applicant name", "candidate name", "name", "citizen name", "student name"],
    "first_name": ["first name", "given name", "forename"],
    "last_name": ["last name", "surname", "family name"],
    "date_of_birth": ["date of birth", "dob", "birth date", "birthdate", "born"],
    "national_id": ["social security", "ssn", "national id", "state id", "aadhaar", "id number", "identification number", "tin"],
    "email": ["email", "email address", "e-mail"],
    "phone": ["phone", "phone number", "mobile", "mobile number", "telephone", "contact number"],
    "address_street": ["street", "address", "address line 1", "mailing address", "residential address"],
    "address_city": ["city", "town", "municipality"],
    "address_state": ["state", "province", "region"],
    "address_zip": ["zip", "zip code", "postal code", "pincode", "pin code"],
    "income_annual": ["annual income", "gross income", "household income", "yearly income", "total income"],
    "household_size": ["household size", "family size", "number of dependents", "household members"]
}


class AutonomousBureaucracyAgent:
    """Autonomous agent navigating legacy public service web portals."""

    def __init__(
        self,
        page: Page,
        service_request: ServiceRequest,
        solver: ObstacleSolver | None = None,
        memory: PortalMemory | None = None
    ):
        self.page = page
        self.request = service_request
        self.profile = service_request.profile
        self.solver = solver or ObstacleSolver()
        self.memory = memory

    def _extract_name_parts(self, full_name: str) -> tuple[str, str]:
        parts = full_name.strip().split()
        if len(parts) == 1:
            return parts[0], parts[0]
        return parts[0], " ".join(parts[1:])

    def _get_field_value(self, key: str) -> str:
        first_name, last_name = self._extract_name_parts(self.profile.full_name)
        mapping = {
            "full_name": self.profile.full_name,
            "first_name": first_name,
            "last_name": last_name,
            "date_of_birth": self.profile.date_of_birth,
            "national_id": self.profile.national_id,
            "email": self.profile.email,
            "phone": self.profile.phone,
            "address_street": self.profile.address_street,
            "address_city": self.profile.address_city,
            "address_state": self.profile.address_state,
            "address_zip": self.profile.address_zip,
            "income_annual": str(self.profile.income_annual) if self.profile.income_annual is not None else "",
            "household_size": str(self.profile.household_size) if self.profile.household_size is not None else "",
        }
        if key in mapping:
            return mapping[key]
        if key in self.profile.attributes:
            return str(self.profile.attributes[key])
        if key in self.request.target_fields:
            return str(self.request.target_fields[key])
        return ""

    def _match_field_key(self, descriptor: str) -> str | None:
        desc_clean = re.sub(r"[^a-z0-9 ]", " ", descriptor.lower()).strip()
        # Direct attribute match
        for attr in {*self.profile.attributes.keys(), *self.request.target_fields.keys()}:
            attr_clean = re.sub(r"[^a-z0-9 ]", " ", attr.lower()).strip()
            if attr_clean and attr_clean in desc_clean:
                return attr
        # Synonyms match
        for key, synonyms in FIELD_SYNONYMS.items():
            for syn in synonyms:
                pattern = r"\b" + re.escape(syn) + r"\b"
                if re.search(pattern, desc_clean):
                    return key
        return None

    async def scan_and_populate_current_page(self) -> int:
        """Dynamically detect and fill all interactive inputs on the current page."""
        await self.solver.dismiss_overlays_and_modals(self.page)
        await self.solver.handle_checkboxes_and_agreements(self.page)

        filled_count = 0
        newly_learned = {}

        # 1. Fast-path: Check learned memory cache
        if self.memory:
            learned = await self.memory.get_learned_selectors(self.request.portal_url, self.request.service_id)
            for field_key, selector in learned.items():
                try:
                    loc = self.page.locator(selector).first
                    if await loc.is_visible(timeout=100):
                        val = self._get_field_value(field_key)
                        if val:
                            current = await loc.input_value()
                            if current != val:
                                await loc.fill(val)
                                filled_count += 1
                except Exception:
                    continue

        controls = await self.page.locator("input:not([type=hidden]):not([type=submit]):not([type=button]), textarea, select").all()

        for ctrl in controls:
            try:
                if not await ctrl.is_visible(timeout=200):
                    continue

                info = await ctrl.evaluate("""(el) => {
                    const label = (el.labels && el.labels[0] ? el.labels[0].innerText : '') ||
                                  el.getAttribute('aria-label') ||
                                  el.getAttribute('placeholder') ||
                                  el.getAttribute('name') ||
                                  el.getAttribute('id') || '';
                    return {
                        tag: el.tagName.toLowerCase(),
                        type: (el.type || 'text').toLowerCase(),
                        value: el.value || '',
                        id: el.id || '',
                        name: el.name || '',
                        label: label.trim()
                    };
                }""")

                tag = info["tag"]
                ctype = info["type"]
                label = info["label"]

                if ctype in ("checkbox", "radio"):
                    continue

                matched_key = self._match_field_key(label)
                if not matched_key:
                    continue

                # Record learned selector if element has reliable identifier
                if info["id"]:
                    newly_learned[matched_key] = f"#{info['id']}"
                elif info["name"]:
                    newly_learned[matched_key] = f"[name='{info['name']}']"

                target_value = self._get_field_value(matched_key)
                if not target_value:
                    continue

                if tag == "select":
                    # Try selecting by label or value
                    try:
                        await ctrl.select_option(label=target_value, timeout=500)
                        filled_count += 1
                    except Exception:
                        try:
                            await ctrl.select_option(value=target_value, timeout=500)
                            filled_count += 1
                        except Exception:
                            pass
                else:
                    current_val = info["value"]
                    if current_val != target_value:
                        await ctrl.fill(target_value)
                        filled_count += 1
            except Exception as e:
                logger.debug(f"Skipping control: {e}")
                continue

        if self.memory and newly_learned:
            await self.memory.record_learned_selectors(self.request.portal_url, self.request.service_id, newly_learned)

        # Handle file uploads if any input[type=file] is present
        await self._handle_file_uploads()
        return filled_count

    async def _handle_file_uploads(self):
        """Upload supporting documents to any matching file input elements."""
        if not self.request.documents:
            return

        file_inputs = await self.page.locator("input[type='file']").all()
        if not file_inputs:
            return

        for finput in file_inputs:
            try:
                if not await finput.is_visible(timeout=200):
                    continue
                for doc in self.request.documents:
                    # Create temporary file to pass to Playwright set_input_files
                    suffix = ".pdf" if doc.kind == "pdf" else (".png" if doc.kind == "image" else ".txt")
                    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
                        tmp_path = Path(tmp.name)
                        if doc.kind in ("pdf", "image"):
                            try:
                                tmp.write(base64.b64decode(doc.content))
                            except Exception:
                                tmp.write(doc.content.encode("utf-8"))
                        else:
                            tmp.write(doc.content.encode("utf-8"))
                        tmp.flush()

                    try:
                        await finput.set_input_files(str(tmp_path))
                        logger.info(f"Uploaded document {doc.name} to portal")
                    finally:
                        tmp_path.unlink(missing_ok=True)
            except Exception as e:
                logger.warning(f"File upload error: {e}")

    async def advance_wizard_step(self) -> bool:
        """Find and click next/continue buttons in multi-step application wizards."""
        next_button_selectors = [
            "button:has-text('Next')", "button:has-text('Continue')",
            "input[type='button'][value*='Next']", "input[type='button'][value*='Continue']",
            "input[type='submit'][value*='Next']", "input[type='submit'][value*='Continue']",
            "button:has-text('Save & Continue')", "button:has-text('Proceed')",
            "a:has-text('Next Step')", ".wizard-next", "#btnNext"
        ]
        for selector in next_button_selectors:
            try:
                btn = self.page.locator(selector).first
                if await btn.is_visible(timeout=500):
                    await btn.click()
                    try:
                        await self.page.wait_for_load_state("domcontentloaded", timeout=1000)
                    except PlaywrightTimeout:
                        pass
                    await self.page.wait_for_timeout(300)
                    return True
            except Exception:
                continue
        return False

    async def is_review_or_submission_page(self) -> bool:
        """Detect whether the agent has reached the final review or submission confirmation step."""
        submit_selectors = [
            "button:has-text('Submit Application')", "button:has-text('Submit')",
            "input[type='submit'][value*='Submit']", "#submit-application",
            "#submit", ".btn-submit"
        ]
        for sel in submit_selectors:
            try:
                btn = self.page.locator(sel).first
                if await btn.is_visible(timeout=300):
                    return True
            except Exception:
                continue
        return False

    async def self_reflect_and_verify(self) -> dict[str, Any]:
        """Inspect all populated inputs and generate a structured pre-submission snapshot."""
        controls = await self.page.locator(
            "input:not([type=hidden]), textarea, select, [contenteditable=true]"
        ).evaluate_all("""els => els.map(el => ({
            id: el.name || el.id || el.getAttribute('aria-label') || '',
            type: el.type || el.tagName.toLowerCase(),
            value: el.value ?? el.textContent,
            checked: el.checked,
            selected: el.selectedOptions && [...el.selectedOptions].map(o => o.value || o.text)
        }))""")

        snapshot = {
            "service_id": self.request.service_id,
            "citizen_name": self.profile.full_name,
            "national_id": self.profile.national_id,
            "page_url": self.page.url,
            "controls": controls,
            "verified_fields": {
                "name": self.profile.full_name,
                "email": self.profile.email,
                "national_id": self.profile.national_id
            }
        }
        return snapshot

    async def submit_application(self) -> None:
        """Click the final submission action."""
        submit_selectors = [
            "button:has-text('Submit Application')", "button:has-text('Submit')",
            "input[type='submit'][value*='Submit']", "#submit-application",
            "#submit", ".btn-submit", "button:has-text('Confirm and Submit')"
        ]
        for sel in submit_selectors:
            try:
                btn = self.page.locator(sel).first
                if await btn.is_visible(timeout=1000):
                    await btn.click()
                    try:
                        await self.page.wait_for_load_state("domcontentloaded", timeout=2000)
                    except PlaywrightTimeout:
                        pass
                    await self.page.wait_for_timeout(500)
                    return
            except Exception:
                continue
        raise RuntimeError("Submit button not found on final portal page")

    async def extract_tracking_receipt(self, case_id: str) -> dict[str, Any]:
        """Extract tracking/confirmation reference, full-page screenshot, and receipt details."""
        # 1. Search for tracking/receipt numbers
        receipt_text = ""
        tracking_selectors = [
            "#receipt", "#tracking-number", ".confirmation-number",
            ".receipt-id", "#application-id", ".tracking-id",
            "[data-testid='confirmation-number']", "span:has-text('Confirmation:')",
            "div:has-text('Tracking Number:')"
        ]
        for sel in tracking_selectors:
            try:
                elem = self.page.locator(sel).first
                if await elem.is_visible(timeout=500):
                    txt = (await elem.inner_text()).strip()
                    if txt:
                        receipt_text = txt
                        break
            except Exception:
                continue

        if not receipt_text:
            # Fallback regex search on body innerText
            body_text = await self.page.locator("body").inner_text()
            match = re.search(r"(?:tracking|confirmation|reference|application)\s*(?:#|id|number)?\s*[:\-]?\s*([A-Z0-9\-_]{6,35})", body_text, re.I)
            if match:
                receipt_text = match.group(1).strip()
            else:
                receipt_text = f"ACK-{case_id[:8].upper()}"

        screenshot_bytes = await self.page.screenshot(full_page=True)
        page_html = await self.page.content()

        return {
            "tracking_number": receipt_text,
            "page_url": self.page.url,
            "screenshot_bytes": screenshot_bytes,
            "page_html": page_html
        }
