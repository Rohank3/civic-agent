import asyncio
import base64
import logging
import re
from typing import Any
from playwright.async_api import Page, TimeoutError as PlaywrightTimeout

logger = logging.getLogger(__name__)


class ObstacleSolver:
    """Automated and assisted solver for common bureaucracy portal obstacles."""

    def __init__(self, redis=None, vision_client=None, model=None):
        self.redis = redis
        self.vision_client = vision_client
        self.model = model

    async def dismiss_overlays_and_modals(self, page: Page) -> bool:
        """Dismiss cookie banners, announcement dialogs, and alert overlays."""
        dismiss_selectors = [
            "button:has-text('Accept')", "button:has-text('I Agree')",
            "button:has-text('Agree & Continue')", "button:has-text('Accept All')",
            "button:has-text('Dismiss')", "button:has-text('Close')",
            "[aria-label='Close']", ".modal-close", ".cookie-consent-accept",
            "button:has-text('Continue to Application')", "button:has-text('Proceed')"
        ]
        dismissed = False
        for selector in dismiss_selectors:
            try:
                elem = page.locator(selector).first
                if await elem.is_visible(timeout=500):
                    await elem.click()
                    dismissed = True
                    await page.wait_for_timeout(300)
            except Exception:
                continue
        return dismissed

    async def handle_checkboxes_and_agreements(self, page: Page) -> int:
        """Check required terms of service, declaration, or certification checkboxes."""
        count = 0
        try:
            checkboxes = await page.locator("input[type='checkbox']:not(:checked)").all()
            for cb in checkboxes:
                try:
                    label = await cb.evaluate(
                        "(el) => (el.labels && el.labels[0] ? el.labels[0].innerText : '') || el.getAttribute('aria-label') || ''"
                    )
                    # Certifications, terms, truth declarations
                    if re.search(r"agree|certif|declare|acknowledge|terms|truth|correct|under penalty", label, re.I):
                        await cb.check()
                        count += 1
                except Exception:
                    continue
        except Exception:
            pass
        return count

    async def solve_text_or_math_captcha(self, page: Page, img_locator_selector: str, input_selector: str) -> bool:
        """Solve visual/text CAPTCHAs using the LLM Vision model."""
        if not self.vision_client or not self.model:
            return False
        try:
            img_elem = page.locator(img_locator_selector).first
            if not await img_elem.is_visible(timeout=1000):
                return False
            screenshot_bytes = await img_elem.screenshot()
            b64_img = base64.b64encode(screenshot_bytes).decode()

            response = await self.vision_client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": "Extract the characters or solve the simple math puzzle shown in this CAPTCHA image. Reply ONLY with the final alphanumeric solution string, nothing else."
                            },
                            {
                                "type": "image_url",
                                "image_url": {"url": f"data:image/png;base64,{b64_img}"}
                            }
                        ]
                    }
                ],
                max_tokens=20,
                temperature=0.0
            )
            solution = response.choices[0].message.content.strip()
            if solution:
                await page.locator(input_selector).fill(solution)
                return True
        except Exception as e:
            logger.warning(f"CAPTCHA solver error: {e}")
        return False

    async def wait_for_otp_code(self, case_id: str, timeout_seconds: int = 120) -> str | None:
        """Poll Redis for incoming SMS/Email OTP listener, or return None on timeout for human escalation."""
        if not self.redis:
            return None
        key = f"otp:{case_id}"
        elapsed = 0
        interval = 2
        while elapsed < timeout_seconds:
            code = await self.redis.get(key)
            if code:
                if isinstance(code, bytes):
                    code = code.decode("utf-8")
                await self.redis.delete(key)
                return code.strip()
            await asyncio.sleep(interval)
            elapsed += interval
        return None
