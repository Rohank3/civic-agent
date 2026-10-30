import hashlib
import json
import tempfile
from contextlib import asynccontextmanager
from pathlib import Path
from urllib.parse import urlsplit
from playwright.async_api import async_playwright
from playwright_stealth import Stealth


def origin(url):
    parsed = urlsplit(url)
    if parsed.scheme not in ("https", "http") or not parsed.netloc or parsed.username:
        raise ValueError("Invalid origin")
    if parsed.scheme == "http" and parsed.hostname not in ("localhost", "127.0.0.1"):
        raise ValueError("Portal requires TLS")
    return f"{parsed.scheme}://{parsed.netloc}"


class SessionManager:
    def __init__(self, redis, cipher, audit, ttl):
        self.redis, self.cipher, self.audit, self.ttl = redis, cipher, audit, ttl

    @asynccontextmanager
    async def page(self, case, account, profile):
        base = origin(profile["url"])
        scope = hashlib.sha256(json.dumps([case, account, base]).encode()).hexdigest()
        key = f"session:{scope}"
        allowed = {base, *(origin(u) for u in profile.get("allowed_origins", []))}
        proxy = profile.get("proxy")
        if proxy and profile.get("proxy_zip") != profile["facility_zip"]:
            raise ValueError("Proxy geography mismatch")
        cached = await self.redis.get(key)
        state = json.loads(self.cipher.open(cached, key)) if cached else {}
        async with async_playwright() as pw, self._recording(case) as directory:
            endpoint = profile.get("cdp_endpoint")
            browser = (await pw.chromium.connect_over_cdp(endpoint) if endpoint
                       else await pw.chromium.launch(headless=True))
            try:
                ctx = await browser.new_context(
                    viewport={"width": 1920, "height": 1080}, proxy=proxy,
                    storage_state=state.get("storage"), record_video_dir=directory,
                    service_workers="block", accept_downloads=False)
                try:
                    await Stealth().apply_stealth_async(ctx)
                    await ctx.add_init_script(path=Path(__file__).resolve().parents[3] /
                                              "config/stealth_scripts/profile.js")
                    sessions = json.dumps(state.get("sessions", {}))
                    await ctx.add_init_script(f"for (const [k,v] of Object.entries(({sessions})[location.origin] || {{}})) sessionStorage.setItem(k,v)")
                    async def guard(route):
                        url = route.request.url
                        if url.startswith(("https://", "http://")) and origin(url) in allowed:
                            await route.continue_()
                        else:
                            await route.abort()
                    await ctx.route("**/*", guard)
                    page = await ctx.new_page()
                    await page.goto(profile["url"])
                    yield page
                    sessions = state.get("sessions", {})
                    if origin(page.url) in allowed:
                        sessions[origin(page.url)] = await page.evaluate("Object.fromEntries(Object.entries(sessionStorage))")
                    raw = json.dumps({"sessions": sessions, "storage": await ctx.storage_state()}).encode()
                    await self.redis.set(key, self.cipher.seal(raw, key),
                                         ex=min(self.ttl, profile.get("ttl", self.ttl)))
                finally:
                    await ctx.close()
            finally:
                await browser.close()

    @asynccontextmanager
    async def _recording(self, case):
        with tempfile.TemporaryDirectory() as directory:
            try:
                yield directory
            finally:
                for path in Path(directory).glob("*.webm"):
                    digest = self.audit.put(case, "video.webm", path.read_bytes())
                    await self.redis.rpush(f"videos:{case}", digest)
