import hashlib
import json
import logging
import tempfile
from contextlib import asynccontextmanager
from pathlib import Path
from urllib.parse import urlsplit
from playwright.async_api import async_playwright
from playwright_stealth import Stealth

logger = logging.getLogger(__name__)

TRUSTED_DOMAINS_SUFFIXES = (
    ".gov", ".gov.in", ".gov.uk", ".gov.au", ".nic.in",
    ".edu", ".edu.in", ".mil"
)

TRUSTED_IDENTITY_AND_CDNS = (
    "login.gov", "id.me", "accounts.google.com", "auth0.com", "okta.com",
    "cloudflare.com", "challenges.cloudflare.com", "recaptcha.net",
    "google.com", "gstatic.com", "hcaptcha.com", "akamaihd.net",
    "bootstrapcdn.com", "cdnjs.cloudflare.com", "unpkg.com"
)


def origin(url):
    parsed = urlsplit(url)
    if parsed.scheme not in ("https", "http") or not parsed.netloc or parsed.username:
        raise ValueError("Invalid origin")
    if parsed.scheme == "http" and parsed.hostname not in ("localhost", "127.0.0.1"):
        raise ValueError("Portal requires TLS")
    return f"{parsed.scheme}://{parsed.netloc}"


def is_allowed_host(host: str, base_host: str, explicit_allowed: set[str]) -> bool:
    host = host.lower()
    base_host = base_host.lower()
    if host == base_host or host.endswith("." + base_host):
        return True
    if host in explicit_allowed:
        return True
    if host in ("localhost", "127.0.0.1"):
        return True
    if any(host.endswith(suffix) for suffix in TRUSTED_DOMAINS_SUFFIXES):
        return True
    if any(host == trusted or host.endswith("." + trusted) for trusted in TRUSTED_IDENTITY_AND_CDNS):
        return True
    return False


class SessionManager:
    def __init__(self, redis, cipher, audit, ttl):
        self.redis, self.cipher, self.audit, self.ttl = redis, cipher, audit, ttl

    @asynccontextmanager
    async def page(self, case, account, profile):
        base_url = profile["url"]
        base = origin(base_url)
        base_host = urlsplit(base_url).hostname or ""
        scope = hashlib.sha256(json.dumps([case, account, base]).encode()).hexdigest()
        key = f"session:{scope}"

        explicit_allowed = {urlsplit(u).hostname or "" for u in profile.get("allowed_origins", [])}
        proxy = profile.get("proxy")
        if proxy and profile.get("proxy_zip") and profile.get("domicile_zip") and profile["proxy_zip"] != profile["domicile_zip"]:
            raise ValueError("Proxy geography mismatch")

        cached = await self.redis.get(key)
        state = json.loads(self.cipher.open(cached, key)) if cached else {}

        async with async_playwright() as pw, self._recording(case) as directory:
            endpoint = profile.get("cdp_endpoint")
            low_mem_args = [
                "--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage",
                "--disable-gpu", "--no-zygote", "--renderer-process-limit=1",
                "--js-flags=--max-old-space-size=128", "--mute-audio"
            ]
            browser = (await pw.chromium.connect_over_cdp(endpoint) if endpoint
                       else await pw.chromium.launch(headless=True, args=low_mem_args))
            try:
                ctx = await browser.new_context(
                    viewport={"width": 1920, "height": 1080},
                    proxy=proxy,
                    storage_state=state.get("storage"),
                    record_video_dir=directory,
                    accept_downloads=True
                )
                try:
                    await ctx.tracing.start(screenshots=True, snapshots=True, sources=False)
                    await Stealth().apply_stealth_async(ctx)
                    profile_script = Path(__file__).resolve().parents[3] / "config/stealth_scripts/profile.js"
                    if profile_script.exists():
                        await ctx.add_init_script(path=profile_script)

                    sessions = json.dumps(state.get("sessions", {}))
                    await ctx.add_init_script(
                        f"for (const [k,v] of Object.entries(({sessions})[location.origin] || {{}})) sessionStorage.setItem(k,v)"
                    )

                    async def guard(route):
                        req_url = route.request.url
                        parsed = urlsplit(req_url)
                        if parsed.scheme in ("https", "http") and parsed.hostname:
                            if is_allowed_host(parsed.hostname, base_host, explicit_allowed):
                                await route.continue_()
                                return
                        elif req_url.startswith("data:") or req_url.startswith("blob:"):
                            await route.continue_()
                            return
                        await route.abort()

                    await ctx.route("**/*", guard)
                    page = await ctx.new_page()

                    # Handle file downloads (e.g., receipts, forms)
                    async def handle_download(download):
                        try:
                            download_path = Path(directory) / download.suggested_filename
                            await download.save_as(download_path)
                            digest = self.audit.put(case, f"download_{download.suggested_filename}", download_path.read_bytes())
                            await self.redis.rpush(f"downloads:{case}", digest)
                        except Exception as e:
                            logger.warning(f"Error persisting download: {e}")

                    page.on("download", handle_download)

                    await page.goto(profile["url"])
                    yield page

                    sessions = state.get("sessions", {})
                    curr_host = urlsplit(page.url).hostname or ""
                    if is_allowed_host(curr_host, base_host, explicit_allowed):
                        sessions[origin(page.url)] = await page.evaluate("Object.fromEntries(Object.entries(sessionStorage))")
                    raw = json.dumps({"sessions": sessions, "storage": await ctx.storage_state()}).encode()
                    await self.redis.set(key, self.cipher.seal(raw, key),
                                         ex=min(self.ttl, profile.get("ttl", self.ttl)))
                finally:
                    try:
                        await ctx.tracing.stop(path=Path(directory) / "trace.zip")
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
                trace = Path(directory) / "trace.zip"
                if trace.exists():
                    digest = self.audit.put(case, "trace.zip", trace.read_bytes())
                    await self.redis.rpush(f"traces:{case}", digest)
