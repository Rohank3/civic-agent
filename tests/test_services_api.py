import base64
import hashlib
import os
from types import SimpleNamespace
from unittest.mock import AsyncMock

import httpx
import pytest
from fakeredis.aioredis import FakeRedis
from sqlalchemy.ext.asyncio import create_async_engine

from app.api.main import app
from app.core.audit import AuditStore
from app.core.runtime import metadata
from app.core.security import Cipher
from app.domain.citizen.schemas import CitizenProfile, ServiceRequest


@pytest.fixture
async def test_client(tmp_path):
    db = create_async_engine("sqlite+aiosqlite://")
    async with db.begin() as conn:
        await conn.run_sync(metadata.create_all)

    audit = AuditStore(tmp_path, Cipher(os.urandom(32)))
    redis = FakeRedis()

    class MockVault:
        async def read(self, path):
            if path == "platform/principals":
                return {
                    "principals": [
                        {
                            "id": "intake-token",
                            "token_sha256": hashlib.sha256(b"intake-token").hexdigest(),
                            "roles": ["intake"]
                        },
                        {
                            "id": "staff-token",
                            "token_sha256": hashlib.sha256(b"staff-token").hexdigest(),
                            "roles": ["staff"]
                        },
                        {
                            "id": "otp-token",
                            "token_sha256": hashlib.sha256(b"otp-token").hexdigest(),
                            "roles": ["otp"]
                        }
                    ]
                }
            return {}

    class MockWorkflowHandle:
        def __init__(self, case_id):
            self.case_id = case_id
            self.run_id = "test-run-id"

        async def describe(self):
            desc = SimpleNamespace()
            desc.status = SimpleNamespace(name="RUNNING")
            return desc

        async def query(self, query_type):
            if query_type == "status":
                return {
                    "state": "NAVIGATING_PORTAL",
                    "packet": "mock-packet-digest",
                    "receipt": "mock-receipt-digest",
                    "signed": False
                }
            return {}

        async def signal(self, signal_name, *args):
            return None

    class MockTemporalClient:
        async def start_workflow(self, *args, **kwargs):
            return SimpleNamespace(run_id="test-run-id")

        def get_workflow_handle(self, case_id):
            return MockWorkflowHandle(case_id)

    rt = SimpleNamespace(
        vault=MockVault(),
        audit=audit,
        redis=redis,
        db=db,
        temporal=MockTemporalClient(),
        settings=SimpleNamespace(task_queue="bureaucracy-queue", session_ttl=900)
    )
    app.state.rt = rt

    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        yield client

    await db.dispose()


@pytest.mark.asyncio
async def test_service_execution_intake_api(test_client):
    intake_headers = {"Authorization": "Bearer intake-token"}
    staff_headers = {"Authorization": "Bearer staff-token"}
    otp_headers = {"Authorization": "Bearer otp-token"}

    payload = {
        "service_id": "state_scholarship",
        "portal_url": "https://scholarships.state.gov/apply",
        "profile": {
            "full_name": "Eleanor Vance",
            "date_of_birth": "2002-08-15",
            "national_id": "ID-987-654-321",
            "email": "eleanor@university.edu",
            "phone": "555-018-9922",
            "address_street": "42 Campus Way",
            "address_city": "College Town",
            "address_state": "CA",
            "address_zip": "90210",
            "income_annual": 18000.0,
            "household_size": 1,
            "attributes": {"gpa": 3.92, "major": "Computer Science"}
        },
        "documents": [
            {
                "name": "transcript.pdf",
                "kind": "pdf",
                "content": base64.b64encode(b"%PDF-1.4 synthetic transcript").decode()
            }
        ],
        "require_review": True
    }

    # 1. Start execution
    resp = await test_client.post("/v1/services/execute", headers=intake_headers, json=payload)
    assert resp.status_code == 202
    data = resp.json()
    case_id = data["case"]
    assert case_id.startswith("case-")
    assert data["require_review"] is True
    assert data["status_url"] == f"/v1/services/{case_id}/status"

    # 2. Check status with staff role
    status_resp = await test_client.get(f"/v1/services/{case_id}/status", headers=staff_headers)
    assert status_resp.status_code == 200
    status_data = status_resp.json()
    assert status_data["case"] == case_id
    assert status_data["stage"] == "NAVIGATING_PORTAL"
    assert "review" in status_data["links"]

    # 3. Unauthorized access check (intake token cannot view status)
    unauth_resp = await test_client.get(f"/v1/services/{case_id}/status", headers=intake_headers)
    assert unauth_resp.status_code == 403

    # 4. OTP code delivery
    otp_resp = await test_client.post(
        f"/v1/services/{case_id}/otp",
        headers=otp_headers,
        json={"code": "849201"}
    )
    assert otp_resp.status_code == 200
    assert otp_resp.json()["status"] == "OTP_DELIVERED"

    # 5. Invalid base64 rejection
    bad_payload = dict(payload)
    bad_payload["documents"] = [{"name": "bad.pdf", "kind": "pdf", "content": "not-valid-base64!!"}]
    bad_resp = await test_client.post("/v1/services/execute", headers=intake_headers, json=bad_payload)
    assert bad_resp.status_code == 400
