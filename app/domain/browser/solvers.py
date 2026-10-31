import asyncio
import base64
import json
import logging
import os
import re
from typing import Any
import httpx
from playwright.async_api import Page, TimeoutError as PlaywrightTimeout

logger = logging.getLogger(__name__)


class ObstacleSolver:
    """Automated and assisted solver for common bureaucracy portal obstacles."""

    def __init__(self, redis=None, vision_client=None, model=None, api_key: str | None = None):
        self.redis = redis
        self.vision_client = vision_client
        self.api_key = api_key or os.getenv("CIVICAGENT_GEMINI_API_KEY") or os.getenv("GEMINI_API_KEY")
        self.model = model or os.getenv("CIVICAGENT_MODEL") or "gemini-3.5-flash-lite"

    async def dismiss_overlays_and_modals(self, page: Page) -> bool:
        """Dismiss cookie banners, announcement dialogs, and alert overlays."""
        dismiss_selectors = [
            "#accept-modal", "button:has-text('Accept All')", "button:has-text('Accept')", "button:has-text('I Agree')",
            "button:has-text('Agree & Continue')", "button:has-text('Dismiss')", "button:has-text('Close')",
            "[aria-label='Close']", ".modal-close", ".cookie-consent-accept",
            "button:has-text('Continue to Application')", "button:has-text('Proceed')"
        ]
        for sel in dismiss_selectors:
            try:
                loc = page.locator(sel)
                if await loc.count() > 0:
                    first = loc.first
                    if await first.is_visible(timeout=100):
                        await first.click()
                        await page.wait_for_timeout(100)
                        return True
            except Exception:
                continue
        return False

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
        """Solve visual/text CAPTCHAs using Google Gemini multimodal vision with fallback."""
        try:
            img_elem = page.locator(img_locator_selector).first
            if not await img_elem.is_visible(timeout=1000):
                return False
            screenshot_bytes = await img_elem.screenshot()
            b64_img = base64.b64encode(screenshot_bytes).decode("ascii")

            if self.api_key:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent?key={self.api_key}"
                prompt = (
                    "Extract the characters or solve the simple math puzzle shown in this CAPTCHA image. "
                    "Reply ONLY with the final alphanumeric solution string, nothing else."
                )
                payload = {
                    "contents": [{
                        "parts": [
                            {"text": prompt},
                            {"inlineData": {"mimeType": "image/png", "data": b64_img}}
                        ]
                    }],
                    "generationConfig": {"temperature": 0.0}
                }
                async with httpx.AsyncClient(timeout=8.0) as client:
                    resp = await client.post(url, json=payload)
                    if resp.status_code == 200:
                        solution = resp.json()["candidates"][0]["content"]["parts"][0]["text"].strip()
                        clean_solution = re.sub(r"[^A-Za-z0-9]", "", solution)
                        if clean_solution:
                            await page.locator(input_selector).fill(clean_solution)
                            logger.info(f"Solved CAPTCHA via Gemini Vision: {clean_solution}")
                            return True

            if self.vision_client and hasattr(self.vision_client, "chat"):
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
