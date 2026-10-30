"""Synthetic intake through authenticated staff review, Chromium and Temporal."""
import hashlib
import os
from datetime import timedelta
from types import SimpleNamespace
import httpx
import pytest
from fakeredis.aioredis import FakeRedis
from sqlalchemy.ext.asyncio import create_async_engine
from temporalio import activity
from temporalio.testing import WorkflowEnvironment
from temporalio.worker import Worker
from app.api.main import app
from app.core.audit import AuditStore
from app.core.runtime import metadata, submissions
from app.core.security import Cipher
from app.workflows.activities.browser_activities import BrowserActivities
from app.workflows.activities.clinical_activities import ClinicalActivities
from app.workflows.prior_auth_flow import PriorAuthorizationWorkflow
from test_stealth_browser import server
import asyncio


@pytest.mark.skipif(not os.getenv("MEDAUTO_TEMPORAL_TEST"), reason="requires Temporal time-skipping server")
async def test_intake_to_determination(tmp_path):
    db = create_async_engine("sqlite+aiosqlite://")
    async with db.begin() as conn:
        await conn.run_sync(metadata.create_all)
    ready = asyncio.Event()
    @activity.defn(name="notify")
    async def notify(case: str, state: str, packet: str) -> str:
        ready.set()
        return "OK"

    with server() as url:
        profile = {"payer": "availity", "url": url, "fields": {"cpt_hcpcs": "#code"},
                   "required_fields": ["cpt_hcpcs"], "statuses": {"synthetic-001": "APPROVED"},
                   "selectors": {s: "#" + s for s in ["draft", "draft_id", "save", "submit", "receipt",
                                                       "attachment_names"]}}
        profile["selectors"].update(authenticated="#draft", status="#draft_id")
        class Vault:
            async def read(self, path):
                if path == "platform/principals":
                    return {"principals": [{"id": token, "token_sha256": hashlib.sha256(token.encode()).hexdigest(),
                                            "roles": roles} for token, roles in [
                                                ("starter", ["intake", "staff"]), ("reviewer", ["staff"])]]}
                return profile
        async with await WorkflowEnvironment.start_time_skipping() as env:
            rt = SimpleNamespace(vault=Vault(), audit=AuditStore(tmp_path, Cipher(os.urandom(32))),
                                 redis=FakeRedis(), db=db, temporal=env.client,
                                 settings=SimpleNamespace(task_queue="integration", session_ttl=900, model=None))
            app.state.rt = rt
            b = BrowserActivities(rt)
            async with Worker(env.client, task_queue="integration", workflows=[PriorAuthorizationWorkflow],
                              activities=[b.credentials, b.login, b.populate, b.upload, b.review, b.submit,
                                          b.poll, ClinicalActivities(rt).extract, notify]):
                async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as api:
                    initiator = {"Authorization": "Bearer starter"}
                    staff = {"Authorization": "Bearer reviewer"}
                    intake = await api.post("/v1/prior-auth", headers=initiator, json={
                        "payer": "availity", "profile": "sandbox", "expected_draft_id": "synthetic-001",
                        "documents": [{"name": "synthetic.txt", "kind": "text", "content": "cpt_hcpcs: 97110"}]})
                    assert intake.status_code == 202
                    case = intake.json()["case"]
                    await asyncio.wait_for(ready.wait(), timeout=90)
                    path = "/v1/workflows/" + case
                    assert intake.headers["location"] == intake.json()["status_url"] == path
                    status = (await api.get(path, headers=staff)).json()
                    assert status["execution_status"] == "RUNNING"
                    assert status["links"]["review"] == path + "/review"
                    review = await api.get(path + "/review", headers=staff)
                    assert review.status_code == 200
                    approval = {"packet": review.json()["packet"]}
                    denied = await api.post(path + "/signature", headers=initiator, json=approval)
                    assert denied.status_code == 403
                    approved = await api.post(path + "/signature", headers=staff, json=approval)
                    assert approved.status_code == 202
                    handle = env.client.get_workflow_handle(case)
                    for _ in range(200):
                        if (await handle.query("status"))["state"] == "POLLING_STATUS":
                            break
                        await asyncio.sleep(0.1)
                    else:
                        pytest.fail("Signed case did not enter determination polling")
                    await env.sleep(timedelta(hours=5))
                    run_id = (await handle.describe()).run_id
                    assert await env.client.get_workflow_handle(case, run_id=run_id).result() == "APPROVED"
                    async with db.connect() as conn:
                        row = (await conn.execute(submissions.select())).one()
                        assert row.case_id == case and row.receipt
    await db.dispose()
