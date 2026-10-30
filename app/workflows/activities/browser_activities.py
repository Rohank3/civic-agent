import base64
from contextlib import asynccontextmanager
from io import BytesIO
from pypdf import PdfReader, PdfWriter
from sqlalchemy import insert, update
from temporalio import activity
from app.core.runtime import submissions
from app.domain.browser.portals.availity import Availity
from app.domain.browser.portals.caqh_proview import CaqhProview
from app.domain.browser.portals.covermymeds import Covermymeds
from app.domain.browser.portals.state_medicaid import StateMedicaid
from app.domain.browser.portals.unitedhealthcare import Unitedhealthcare
from app.domain.browser.session_manager import SessionManager
from app.domain.browser.vision_fallback import VisionLocator

PORTALS = {cls.payer: cls for cls in (Availity, CaqhProview, Covermymeds, StateMedicaid, Unitedhealthcare)}


class BrowserActivities:
    def __init__(self, runtime):
        self.rt = runtime
        self.sessions = SessionManager(runtime.redis, runtime.audit.cipher, runtime.audit, runtime.settings.session_ttl)

    def source(self, case, ref):
        return self.rt.audit.read_json(case, "source", ref)

    @asynccontextmanager
    async def portal(self, case, ref, draft=True):
        data = self.source(case, ref)
        cfg = await self.rt.vault.read("portals/" + data["profile"])
        if cfg["payer"] != data["payer"]:
            raise ValueError("Payer profile mismatch")
        vision = None
        if cfg.get("vision_model"):
            import instructor
            from openai import AsyncOpenAI
            endpoint = self.rt.settings.approved_model_endpoint
            if not endpoint or not endpoint.startswith("https://"):
                raise ValueError("Approved vision endpoint required")
            vision = VisionLocator(instructor.from_openai(AsyncOpenAI(base_url=endpoint)), cfg["vision_model"])
        async with self.sessions.page(case, data["profile"], cfg) as page:
            portal = PORTALS[data["payer"]](page, cfg, vision)
            if draft:
                await portal.draft()
                identity = await page.locator(portal.s["draft_id"]).inner_text()
                if identity != data["expected_draft_id"]:
                    raise ValueError("Draft identity mismatch")
            yield portal

    @activity.defn
    async def credentials(self, case: str, ref: str) -> str:
        await self.rt.vault.read("portals/" + self.source(case, ref)["profile"])
        return "OK"

    @activity.defn
    async def login(self, case: str, ref: str, otp: str) -> str:
        code = None
        if otp:
            key = f"otp:{case}:{otp}"
            raw = await self.rt.redis.getdel(key)
            if raw is None:
                raise ValueError("Expired challenge")
            code = self.rt.audit.cipher.open(raw, key).decode()
        async with self.portal(case, ref, draft=False) as portal:
            return await portal.login(code)

    @activity.defn
    async def populate(self, case: str, ref: str, fields: str) -> str:
        async with self.portal(case, ref) as portal:
            await portal.fill(self.rt.audit.read_json(case, "fields", fields)["values"])
        return "OK"

    @activity.defn
    async def upload(self, case: str, ref: str) -> str:
        files = []
        for doc in self.source(case, ref)["documents"]:
            if doc["kind"] == "pdf":
                writer = PdfWriter()
                for page in PdfReader(BytesIO(base64.b64decode(doc["content"], validate=True))).pages:
                    writer.add_page(page)
                buffer = BytesIO()
                writer.write(buffer)
                files.append({"name": doc["name"], "mimeType": "application/pdf", "buffer": buffer.getvalue()})
        async with self.portal(case, ref) as portal:
            await portal.upload(files)
        return "OK"

    @activity.defn
    async def review(self, case: str, ref: str, fields: str) -> str:
        data = self.source(case, ref)
        async with self.portal(case, ref) as portal:
            snapshot = await portal.snapshot()
            values = self.rt.audit.read_json(case, "fields", fields)["values"]
            diff = {k: {"source": values.get(k, ""), "form": v} for k, v in snapshot["values"].items()
                    if values.get(k, "") != v}
            if diff:
                raise ValueError("Draft differs from source")
            expected = sorted(d["name"] for d in data["documents"] if d["kind"] == "pdf")
            if sorted(snapshot["attachments"]) != expected:
                raise ValueError("Attachment mismatch")
            image = self.rt.audit.put(case, "review.png", await portal.page.screenshot(full_page=True))
            previous = data.get("previous", {})
            changes = {key: {"previous": previous.get(key), "current": value}
                       for key, value in values.items() if previous.get(key) != value}
            return self.rt.audit.json(case, "review", {"snapshot": snapshot, "screenshot": image,
                "fields": fields, "source": ref, "diff": diff, "changes": changes})

    @activity.defn
    async def submit(self, case: str, ref: str, packet: str, signature: str) -> str:
        approval = self.rt.audit.read_json(case, "signature", signature)
        if approval["packet"] != packet or not approval["reviewer"]:
            raise ValueError("Invalid approval")
        reviewed = self.rt.audit.read_json(case, "review", packet)
        async with self.portal(case, ref) as portal:
            if reviewed["source"] != ref or await portal.snapshot() != reviewed["snapshot"]:
                raise ValueError("Draft changed after review")
            before = self.rt.audit.put(case, "before.html", (await portal.page.content()).encode())
            # Commit intent before external side effect. Unknown outcomes require reconciliation.
            async with self.rt.db.begin() as conn:
                await conn.execute(insert(submissions).values(case_id=case, packet=packet))
            await portal.page.locator(portal.s["submit"]).click()
            receipt = await portal.page.locator(portal.s["receipt"]).inner_text()
            if not receipt.strip():
                raise ValueError("Receipt required")
            proof = self.rt.audit.json(case, "receipt", {"receipt": receipt, "signature": signature, "before": before,
                "after": self.rt.audit.put(case, "after.html", (await portal.page.content()).encode())})
            async with self.rt.db.begin() as conn:
                await conn.execute(update(submissions).where(submissions.c.case_id == case).values(receipt=proof))
        return proof

    @activity.defn
    async def poll(self, case: str, ref: str) -> str:
        async with self.portal(case, ref) as portal:
            status = await portal.page.locator(portal.s["status"]).inner_text()
            return portal.cfg["statuses"].get(status.strip(), "PENDING")
