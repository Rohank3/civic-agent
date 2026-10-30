import os
from contextlib import contextmanager
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from threading import Thread
from types import SimpleNamespace
import pytest
from fakeredis.aioredis import FakeRedis
from cryptography.exceptions import InvalidTag
from app.core.audit import AuditStore
from app.core.security import Cipher
from app.workflows.activities.browser_activities import BrowserActivities


HTML = b"""<!doctype html><title>Mock payer</title>
<main id="draft"><span id="draft_id">synthetic-001</span>
<input id="code"><button id="save" onclick="localStorage.code=code.value">Save draft</button>
<button id="submit" onclick="receipt.textContent='receipt-001'">Submit</button>
<span id="receipt"></span></main><script>code.value=localStorage.code||''</script>"""


@contextmanager
def server():
    class Handler(BaseHTTPRequestHandler):
        def do_GET(self):
            self.send_response(200)
            self.end_headers()
            self.wfile.write(HTML)

        def log_message(self, *args):
            pass
    httpd = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    thread = Thread(target=httpd.serve_forever, daemon=True)
    thread.start()
    try:
        yield f"http://127.0.0.1:{httpd.server_port}"
    finally:
        httpd.shutdown()
        httpd.server_close()
        thread.join()


async def test_browser_review_and_submission(tmp_path):
    from sqlalchemy.ext.asyncio import create_async_engine
    from app.core.runtime import metadata
    from sqlalchemy.exc import IntegrityError
    db = create_async_engine("sqlite+aiosqlite://")
    async with db.begin() as conn:
        await conn.run_sync(metadata.create_all)
    audit = AuditStore(tmp_path, Cipher(os.urandom(32)))
    redis = FakeRedis()
    with server() as url:
        profile = {"payer": "availity", "url": url, "fields": {"cpt_hcpcs": "#code"},
                   "selectors": {s: "#" + s for s in ["draft", "draft_id", "save", "submit", "receipt",
                                                       "attachment_names"]}}
        class Vault:
            async def read(self, path):
                return profile
        rt = SimpleNamespace(redis=redis, audit=audit, vault=Vault(), db=db,
                             settings=SimpleNamespace(session_ttl=900))
        acts = BrowserActivities(rt)
        case = "synthetic-case"
        source = audit.json(case, "source", {"payer": "availity", "expected_draft_id": "synthetic-001",
            "profile": "sandbox", "documents": []})
        fields = audit.json(case, "fields", {"values": {"cpt_hcpcs": "97110"}})
        await acts.populate(case, source, fields)
        packet = await acts.review(case, source, fields)
        review = audit.read_json(case, "review", packet)
        assert audit.get(case, "review.png", review["screenshot"]).startswith(b"\x89PNG")
        signature = audit.json(case, "signature", {"packet": packet, "reviewer": "reviewer-A"})
        async with acts.portal(case, source) as portal:
            assert await portal.page.evaluate("navigator.webdriver") is None
            from app.domain.browser.vision_fallback import Point, navigation_click
            await portal.page.evaluate("""() => {const a=document.createElement('a');
                a.href='#details'; a.textContent='Open details'; document.body.prepend(a)}""")
            class Vision:
                async def locate(self, page, label):
                    rect = await page.get_by_text(label, exact=True).bounding_box()
                    return Point(x=(rect["x"] + rect["width"] / 2) / 1920,
                                 y=(rect["y"] + rect["height"] / 2) / 1080)
            await navigation_click(portal.page, "#stale-selector", "Open details", Vision())
            assert portal.page.url.endswith("#details")
            await portal.fill({"cpt_hcpcs": "changed"})
        with pytest.raises(ValueError, match="changed"):
            await acts.submit(case, source, packet, signature)
        await acts.populate(case, source, fields)
        proof = await acts.submit(case, source, packet, signature)
        assert audit.read_json(case, "receipt", proof)["receipt"] == "receipt-001"
        with pytest.raises(IntegrityError):
            await acts.submit(case, source, packet, signature)
        video = (await redis.lindex("videos:" + case, 0)).decode()
        assert audit.get(case, "video.webm", video).startswith(bytes.fromhex("1a45dfa3"))
        raw = await redis.get((await redis.keys("session:*"))[0])
        assert b"97110" not in raw
    await db.dispose()


def test_artifact_binding_and_tamper_detection(tmp_path):
    audit = AuditStore(tmp_path, Cipher(os.urandom(32)))
    digest = audit.put("case-a", "dom", b"secret")
    with pytest.raises(InvalidTag):
        audit.get("case-b", "dom", digest)
    (tmp_path / digest).write_bytes(b"modified")
    with pytest.raises(ValueError, match="integrity"):
        audit.get("case-a", "dom", digest)
