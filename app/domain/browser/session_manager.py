import hashlib
import json
import logging
import tempfile
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any
from urllib.parse import urlsplit
from playwright.async_api import async_playwright, BrowserContext, Page
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


def origin(url: str) -> str:
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
    """Manages browser isolation contexts, storage states, and telemetry recordings."""

    def __init__(self, redis: Any, cipher: Any, audit: Any, ttl: int):
        self.redis = redis
        self.cipher = cipher
        self.audit = audit
        self.ttl = ttl

    @asynccontextmanager
    async def page(self, case: str, account: str, profile: dict[str, Any]):
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

        should_record_video = bool(profile.get("record_video", True))
        should_trace = bool(profile.get("tracing", True))

        async with async_playwright() as pw, self._recording(case) as directory:
            endpoint = profile.get("cdp_endpoint")
            low_mem_args = [
                "--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage",
                "--disable-gpu", "--no-zygote", "--renderer-process-limit=1",
                "--js-flags=--max-old-space-size=128", "--mute-audio",
                "--disable-background-networking", "--disable-background-timer-throttling",
                "--disable-backgrounding-occluded-windows", "--disable-breakpad",
                "--disable-component-extensions-with-background-pages", "--disable-extensions",
                "--disable-features=Translate,BackForwardCache", "--disable-ipc-flooding-protection",
                "--disable-renderer-backgrounding"
            ]
            browser = (
                await pw.chromium.connect_over_cdp(endpoint) if endpoint
                else await pw.chromium.launch(headless=True, args=low_mem_args)
            )
            try:
                ctx_kwargs: dict[str, Any] = {
                    "viewport": {"width": 1920, "height": 1080},
                    "proxy": proxy,
                    "storage_state": state.get("storage"),
                    "accept_downloads": True
                }
                if should_record_video and directory:
                    ctx_kwargs["record_video_dir"] = directory

                ctx: BrowserContext = await browser.new_context(**ctx_kwargs)
                try:
                    if should_trace:
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
                        try:
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
                        except Exception as e:
                            logger.debug(f"Guard route abort notice: {e}")
                            try:
                                await route.abort()
                            except Exception:
                                pass

                    await ctx.route("**/*", guard)
                    page: Page = await ctx.new_page()

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

                    sessions_map = state.get("sessions", {})
                    curr_host = urlsplit(page.url).hostname or ""
                    if is_allowed_host(curr_host, base_host, explicit_allowed):
                        sessions_map[origin(page.url)] = await page.evaluate("Object.fromEntries(Object.entries(sessionStorage))")
                    raw = json.dumps({"sessions": sessions_map, "storage": await ctx.storage_state()}).encode()
                    await self.redis.set(key, self.cipher.seal(raw, key),
                                         ex=min(self.ttl, profile.get("ttl", self.ttl)))
                finally:
                    try:
                        if should_trace and directory:
                            await ctx.tracing.stop(path=Path(directory) / "trace.zip")
                    except Exception as trace_err:
                        logger.debug(f"Tracing stop notice: {trace_err}")
                    finally:
                        await ctx.close()
            finally:
                await browser.close()

    @asynccontextmanager
    async def _recording(self, case: str):
        with tempfile.TemporaryDirectory() as directory:
            try:
                yield directory
            finally:
                try:
                    for path in Path(directory).glob("*.webm"):
                        if path.exists() and path.stat().st_size > 0:
                            digest = self.audit.put(case, "video.webm", path.read_bytes())
                            await self.redis.rpush(f"videos:{case}", digest)
                    trace = Path(directory) / "trace.zip"
                    if trace.exists() and trace.stat().st_size > 0:
                        digest = self.audit.put(case, "trace.zip", trace.read_bytes())
                        await self.redis.rpush(f"traces:{case}", digest)
                except Exception as e:
                    logger.debug(f"Recording artifact persistence notice: {e}")
