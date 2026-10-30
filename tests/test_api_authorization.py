import hashlib
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock

import httpx
import pytest
from temporalio.client import WorkflowExecutionStatus
from temporalio.service import RPCError, RPCStatusCode

from app.api.main import app


@pytest.fixture
def runtime(monkeypatch):
    entries = [{"id": role, "roles": [role], "token_sha256": hashlib.sha256(role.encode()).hexdigest()}
               for role in ("staff", "otp", "intake")]
    rt = SimpleNamespace(vault=SimpleNamespace(read=AsyncMock(return_value={"principals": entries})),
                         settings=SimpleNamespace(task_queue="medauto"), temporal=Mock())
    monkeypatch.setattr(app.state, "rt", rt, raising=False)
    return rt


async def test_schema_and_interactive_docs_access(runtime):
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as api:
        assert (await api.get("/openapi.json")).status_code == 401
        api.headers["Authorization"] = "Bearer intake"
        assert (await api.get("/openapi.json")).status_code == 403
        api.headers["Authorization"] = "Bearer staff"
        schema = await api.get("/openapi.json")
        assert schema.status_code == 200
        assert "/v1/services/execute" in schema.json()["paths"]
        for path in ("/docs", "/redoc", "/docs/oauth2-redirect"):
            assert (await api.get(path)).status_code == 404


async def test_invalid_auth_rejected_before_json_parsing(runtime):
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as api:
        api.headers["Content-Type"] = "application/json"
        assert (await api.post("/v1/services/execute", content="{")).status_code == 401
        runtime.vault.read.assert_not_awaited()
        api.headers["Authorization"] = "Bearer unknown"
        assert (await api.post("/v1/services/execute", content="{")).status_code == 403
        api.headers["Authorization"] = "Bearer intake"
        assert (await api.post("/v1/services/execute", content="{")).status_code == 422


@pytest.mark.parametrize("workflow_type,queue", [("PrivatePayroll", "medauto"),
                                                ("BureaucracyExecutionWorkflow", "other")])
async def test_foreign_workflows_cannot_be_queried_or_signaled(runtime, workflow_type, queue):
    handle = AsyncMock()
    handle.describe.return_value = SimpleNamespace(workflow_type=workflow_type, task_queue=queue)
    runtime.temporal.get_workflow_handle.return_value = handle
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as api:
        api.headers["Authorization"] = "Bearer staff"
        foreign = await api.get("/v1/workflows/foreign")
        assert foreign.status_code == 404
        assert (await api.get("/v1/workflows/foreign/review")).status_code == 404
        assert (await api.post("/v1/workflows/foreign/signature", json={"packet": "a" * 64})).status_code == 404
        api.headers["Authorization"] = "Bearer otp"
        assert (await api.post("/v1/workflows/foreign/otp", json={"code": "123456"})).status_code == 404
