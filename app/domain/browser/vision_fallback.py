import asyncio
import base64
import json
import logging
import os
from typing import Any
import httpx
from pydantic import BaseModel, Field
from playwright.async_api import Page, TimeoutError as PlaywrightTimeout

logger = logging.getLogger(__name__)


class Point(BaseModel):
    x: float = Field(ge=0, le=1)
    y: float = Field(ge=0, le=1)


class VisionLocator:
    """Multimodal vision grounding using Google Gemini to locate unmapped DOM elements from viewport screenshots."""

    def __init__(
        self,
        api_key: str | None = None,
        model: str | None = None,
        http_client: httpx.AsyncClient | None = None
    ):
        self.api_key = api_key or os.getenv("CIVICAGENT_GEMINI_API_KEY") or os.getenv("GEMINI_API_KEY")
        self.model = model or os.getenv("CIVICAGENT_MODEL") or "gemini-3.5-flash-lite"
        self.base_url = "https://generativelanguage.googleapis.com/v1beta/models"
        self._http_client = http_client
        self._owns_http_client = http_client is None

    async def _get_client(self) -> httpx.AsyncClient:
        if self._http_client is None or self._http_client.is_closed:
            self._http_client = httpx.AsyncClient(
                timeout=httpx.Timeout(4.0, connect=2.0),
                limits=httpx.Limits(max_keepalive_connections=5, max_connections=10)
            )
            self._owns_http_client = True
        return self._http_client

    async def aclose(self) -> None:
        """Close managed HTTP client resources."""
        if self._owns_http_client and self._http_client and not self._http_client.is_closed:
            await self._http_client.aclose()

    async def locate(self, page: Page, label: str) -> Point | None:
        """Locate element on screen by label, prioritizing fast DOM heuristic before Gemini vision."""
        # 1. Fast-path: Check heuristic DOM grounding first (0 network latency, 0 screenshot overhead)
        try:
            elem = page.locator(f"button:has-text('{label}'), a:has-text('{label}'), input[placeholder*='{label}']").first
            if await elem.is_visible(timeout=100):
                box = await elem.bounding_box()
                if box:
                    vp = page.viewport_size or {"width": 1280, "height": 800}
                    center_x = (box["x"] + box["width"] / 2.0) / vp["width"]
                    center_y = (box["y"] + box["height"] / 2.0) / vp["height"]
                    return Point(x=center_x, y=center_y)
        except Exception:
            pass

        # 2. Multimodal Vision Fallback: only if DOM check fails and API key configured
        if self.api_key:
            try:
                screenshot_bytes = await page.screenshot(type="jpeg", quality=65)
                b64_image = base64.b64encode(screenshot_bytes).decode("ascii")

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
                client = await self._get_client()
                resp = await client.post(url, json=payload)
                if resp.status_code == 200:
                    raw = resp.json()["candidates"][0]["content"]["parts"][0]["text"]
                    data = json.loads(raw)
                    return Point(x=float(data["x"]), y=float(data["y"]))
            except Exception as exc:
                logger.debug(f"Gemini vision locate fallback notice: {exc}")

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
        await page.mouse.move(target_x, target_y, steps=4)
        await asyncio.sleep(0.02)
        await page.mouse.click(target_x, target_y)
        return True


async def navigation_click(page: Page, selector: str, label: str, vision: VisionLocator | None = None) -> None:
    try:
        elem = page.locator(selector).first
        if await elem.is_visible(timeout=200):
            await elem.click()
            return
    except PlaywrightTimeout:
        pass

    if vision:
        clicked = await vision.click_grounded(page, label)
        if clicked:
            return
    raise RuntimeError(f"Could not locate or click navigation element '{label}'")
