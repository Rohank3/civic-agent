import asyncio
import base64
import json
import logging
import os
import httpx
from pydantic import BaseModel, Field
from playwright.async_api import Page, TimeoutError as PlaywrightTimeout

logger = logging.getLogger(__name__)


class Point(BaseModel):
    x: float = Field(ge=0, le=1)
    y: float = Field(ge=0, le=1)


class VisionLocator:
    """Multimodal vision grounding using Google Gemini to locate unmapped DOM elements from viewport screenshots."""

    def __init__(self, api_key: str | None = None, model: str | None = None):
        self.api_key = api_key or os.getenv("CIVICAGENT_GEMINI_API_KEY") or os.getenv("GEMINI_API_KEY")
        self.model = model or os.getenv("CIVICAGENT_MODEL") or "gemini-3.8-flash"
        self.base_url = "https://generativelanguage.googleapis.com/v1beta/models"

    async def locate(self, page: Page, label: str) -> Point | None:
        """Locate element on screen by label using Gemini multimodal vision."""
        try:
            screenshot_bytes = await page.screenshot(type="jpeg", quality=65)
            b64_image = base64.b64encode(screenshot_bytes).decode("ascii")

            if self.api_key:
                url = f"{self.base_url}/{self.model}:generateContent?key={self.api_key}"
                prompt = (
                    f"Look at this web page screenshot. Locate the interactive button, link, or input labeled '{label}'. "
                    "Return ONLY valid JSON with normalized coordinates between 0 and 1: "
                    '{"x": float, "y": float}'
                )
                payload = {
                    "contents": [{
                        "parts": [
                            {"text": prompt},
                            {"inlineData": {"mimeType": "image/jpeg", "data": b64_image}}
                        ]
                    }],
                    "generationConfig": {"responseMimeType": "application/json"}
                }
                async with httpx.AsyncClient(timeout=4.0) as client:
                    resp = await client.post(url, json=payload)
                    if resp.status_code == 200:
                        raw = resp.json()["candidates"][0]["content"]["parts"][0]["text"]
                        data = json.loads(raw)
                        return Point(x=float(data["x"]), y=float(data["y"]))
        except Exception as exc:
            logger.debug(f"Gemini vision locate fallback notice: {exc}")

        # Heuristic DOM grounding fallback
        try:
            elem = page.locator(f"button:has-text('{label}'), a:has-text('{label}'), input[placeholder*='{label}']").first
            if await elem.is_visible(timeout=200):
                box = await elem.bounding_box()
                if box:
                    vp = page.viewport_size or {"width": 1280, "height": 800}
                    center_x = (box["x"] + box["width"] / 2.0) / vp["width"]
                    center_y = (box["y"] + box["height"] / 2.0) / vp["height"]
                    return Point(x=center_x, y=center_y)
        except Exception:
            pass
        return None

    async def click_grounded(self, page: Page, label: str) -> bool:
        """Find point via vision and perform human-cadence click."""
        point = await self.locate(page, label)
        if not point:
            return False
        vp = page.viewport_size or {"width": 1280, "height": 800}
        target_x = point.x * vp["width"]
        target_y = point.y * vp["height"]

        # Smooth mouse motion
        await page.mouse.move(target_x, target_y, steps=8)
        await asyncio.sleep(0.05)
        await page.mouse.click(target_x, target_y)
        return True


async def navigation_click(page: Page, selector: str, label: str, vision: VisionLocator | None = None) -> None:
    try:
        elem = page.locator(selector).first
        if await elem.is_visible(timeout=1000):
            await elem.click()
            return
    except PlaywrightTimeout:
        pass

    if vision:
        clicked = await vision.click_grounded(page, label)
        if clicked:
            return
    raise RuntimeError(f"Could not locate or click navigation element '{label}'")
