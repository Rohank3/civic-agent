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

    DISMISS_SELECTORS = [
        "#accept-modal", "button:has-text('Accept All')", "button:has-text('Accept')", "button:has-text('I Agree')",
        "button:has-text('Agree & Continue')", "button:has-text('Dismiss')", "button:has-text('Close')",
        "[aria-label='Close']", ".modal-close", ".cookie-consent-accept",
        "button:has-text('Continue to Application')", "button:has-text('Proceed')"
    ]
    COMBINED_DISMISS_SELECTOR = ", ".join(DISMISS_SELECTORS)

    def __init__(
        self,
        redis: Any = None,
        vision_client: Any = None,
        model: str | None = None,
        api_key: str | None = None,
        http_client: httpx.AsyncClient | None = None
    ):
        self.redis = redis
        self.vision_client = vision_client
        self.api_key = api_key or os.getenv("CIVICAGENT_GEMINI_API_KEY") or os.getenv("GEMINI_API_KEY")
        self.model = model or os.getenv("CIVICAGENT_MODEL") or "gemini-3.5-flash-lite"
        self._http_client = http_client
        self._owns_http_client = http_client is None

    async def _get_client(self) -> httpx.AsyncClient:
        if self._http_client is None or self._http_client.is_closed:
            self._http_client = httpx.AsyncClient(
                timeout=httpx.Timeout(8.0, connect=3.0),
                limits=httpx.Limits(max_keepalive_connections=5, max_connections=10)
            )
            self._owns_http_client = True
        return self._http_client

    async def aclose(self) -> None:
        """Close managed HTTP client resources."""
        if self._owns_http_client and self._http_client and not self._http_client.is_closed:
            await self._http_client.aclose()

    async def dismiss_overlays_and_modals(self, page: Page) -> bool:
        """Dismiss cookie banners, announcement dialogs, and alert overlays using a single combined query."""
        try:
            loc = page.locator(self.COMBINED_DISMISS_SELECTOR)
            cnt = await loc.count()
            if cnt == 0:
                return False
            for i in range(cnt):
                btn = loc.nth(i)
                if await btn.is_visible():
                    await btn.click()
                    await page.wait_for_timeout(100)
                    return True
        except Exception as e:
            logger.debug(f"Combined overlay dismissal check: {e}")
        return False

    async def handle_checkboxes_and_agreements(self, page: Page) -> int:
        """Check required terms of service, declaration, or certification checkboxes in a single batch pass."""
        count = 0
        try:
            matched_selectors: list[str] = await page.evaluate("""() => {
                const pattern = /agree|certif|declare|acknowledge|terms|truth|correct|under penalty/i;
                const checkboxes = document.querySelectorAll("input[type='checkbox']:not(:checked)");
                const matched = [];
                let idx = 0;
                for (const cb of checkboxes) {
                    const style = window.getComputedStyle(cb);
                    if (style.display === 'none' || style.visibility === 'hidden') {
                        const parent = cb.closest('label') || cb.parentElement;
                        if (parent) {
                            const pstyle = window.getComputedStyle(parent);
                            if (pstyle.display === 'none' || pstyle.visibility === 'hidden') continue;
                        }
                    }
                    const label = (cb.labels && cb.labels[0] ? cb.labels[0].innerText : '') ||
                                  (cb.closest('label') ? cb.closest('label').innerText : '') ||
                                  cb.getAttribute('aria-label') || '';
                    if (pattern.test(label)) {
                        let sel = '';
                        if (cb.id) {
                            sel = `#${CSS.escape(cb.id)}`;
                        } else if (cb.name) {
                            sel = `input[name="${CSS.escape(cb.name)}"]`;
                        } else {
                            const ref = `_cb_ref_${idx++}`;
                            cb.setAttribute('data-civic-cb', ref);
                            sel = `[data-civic-cb="${ref}"]`;
                        }
                        matched.push(sel);
                    }
                }
                return matched;
            }""")
            for sel in matched_selectors:
                try:
                    loc = page.locator(sel).first
                    if await loc.is_visible():
                        await loc.check(timeout=500)
                        count += 1
                except Exception:
                    try:
                        await loc.click(timeout=500)
                        count += 1
                    except Exception:
                        pass
        except Exception as e:
            logger.debug(f"Checkbox solver error: {e}")
        return count

    async def solve_text_or_math_captcha(self, page: Page, img_locator_selector: str, input_selector: str) -> bool:
        """Solve visual/text CAPTCHAs using Google Gemini multimodal vision with fallback."""
        try:
            img_elem = page.locator(img_locator_selector).first
            if not await img_elem.is_visible(timeout=300):
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
                client = await self._get_client()
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
        interval = 2.0
        effective_timeout = float(timeout_seconds)

        key = f"otp:{case_id}"
        elapsed = 0.0
        while elapsed < effective_timeout:
            code = await self.redis.get(key)
            if code:
                if isinstance(code, bytes):
                    code = code.decode("utf-8")
                await self.redis.delete(key)
                return code.strip()
            await asyncio.sleep(interval)
            elapsed += interval
        return None
