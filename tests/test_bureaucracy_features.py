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
from app.core.pii import mask_email, mask_national_id, mask_phone, sanitize_citizen_dict
from app.core.runtime import metadata
from app.core.security import Cipher
from app.domain.browser.memory import PortalMemory
from app.domain.citizen.preflight import run_preflight_check
from app.domain.citizen.schemas import CitizenProfile, ServiceRequest


def test_pii_masking():
    assert mask_national_id("123-45-6789") == "***-**-6789"
    assert mask_national_id("9876") == "****"
    assert mask_email("alexander.hamilton@treasury.gov") == "a" + "*" * 16 + "n@treasury.gov"
    assert mask_phone("555-019-2831") == "***-***-2831"

    data = {
        "citizen": {
            "name": "Jane Doe",
            "national_id": "SSN-999-88-7777",
            "email": "jane@example.com",
            "phone": "555-123-4567"
        },
        "public_field": "public_data"
    }
    sanitized = sanitize_citizen_dict(data, redact_pii=True)
    assert sanitized["citizen"]["national_id"] == "***-**-7777"
    assert sanitized["citizen"]["email"] == "j**e@example.com"
    assert sanitized["citizen"]["phone"] == "***-***-4567"
    assert sanitized["public_field"] == "public_data"


def test_preflight_sufficiency():
    # 1. Missing core fields & invalid PDF
    incomplete_citizen = CitizenProfile(
        full_name="Alex Citizen",
        date_of_birth="2000-01-01",
        national_id="ID-12345",
        email="alex@example.org",
        phone="555-019-1122",
        address_street="100 Main St",
        address_city="Metropolis",
        address_state="NY",
        address_zip="10001"
    )
    req = ServiceRequest(
        service_id="state_scholarship",
        portal_url="https://portal.example.gov/apply",
        profile=incomplete_citizen,
        documents=[
            {"name": "invalid.pdf", "kind": "pdf", "content": base64.b64encode(b"not a pdf").decode()}
        ]
    )
    report = run_preflight_check(req)
    assert report.is_ready is False
    assert len(report.document_issues) > 0
    assert "Academic Transcript / Proof of Enrollment (PDF)" in report.missing_recommended_documents

    # 2. Complete & Ready
    valid_pdf = base64.b64encode(b"%PDF-1.5 valid academic record").decode()
    complete_citizen = CitizenProfile(
        full_name="Alex Citizen",
        date_of_birth="2000-01-01",
        national_id="ID-12345",
        email="alex@example.org",
        phone="555-019-1122",
        address_street="100 Main St",
        address_city="Metropolis",
        address_state="NY",
        address_zip="10001",
        income_annual=32000.0,
        household_size=2,
        attributes={"gpa": 3.85, "major": "Engineering"}
    )
    complete_req = ServiceRequest(
        service_id="state_scholarship",
        portal_url="https://portal.example.gov/apply",
        profile=complete_citizen,
        documents=[
            {"name": "transcript.pdf", "kind": "pdf", "content": valid_pdf}
        ]
    )
    complete_report = run_preflight_check(complete_req)
    assert complete_report.is_ready is True
    assert complete_report.sufficiency_score == 1.0
    assert len(complete_report.missing_mandatory_fields) == 0


@pytest.mark.asyncio
async def test_portal_memory_caching():
    redis = FakeRedis()
    mem = PortalMemory(redis)
    portal_url = "https://scholarship.state.gov/form"
    service_id = "scholarship_v1"

    # Initially empty
    assert await mem.get_learned_selectors(portal_url, service_id) == {}

    # Save learned selectors
    learned = {
        "full_name": "#txtApplicantName",
        "email": "#applicant_email",
        "btn_next": "#btnNextStep"
    }
    await mem.record_learned_selectors(portal_url, service_id, learned)

    # Retrieve from cache
    cached = await mem.get_learned_selectors(portal_url, service_id)
    assert cached["full_name"] == "#txtApplicantName"
    assert cached["btn_next"] == "#btnNextStep"


@pytest.fixture
async def full_client(tmp_path):
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
                            "id": "staff-elevated",
                            "token_sha256": hashlib.sha256(b"staff-elevated").hexdigest(),
                            "roles": ["staff", "pii:read"]
                        }
                    ]
                }
            return {}

    class MockWorkflowHandle:
        def __init__(self, case_id):
            self.case_id = case_id
            self.run_id = "run-001"
            self.packet = ""
            self.receipt = ""

        async def describe(self):
            desc = SimpleNamespace()
            desc.status = SimpleNamespace(name="COMPLETED")
            return desc

        async def query(self, query_type):
            if query_type == "status":
                return {
                    "state": "COMPLETED",
                    "packet": getattr(self, "packet", ""),
                    "receipt": getattr(self, "receipt", ""),
                    "signed": True
                }
            return {}

        async def signal(self, *args):
            pass

    mock_handle = MockWorkflowHandle("case-test-123")

    class MockTemporalClient:
        async def start_workflow(self, *args, **kwargs):
            return SimpleNamespace(run_id="run-001")

        def get_workflow_handle(self, case_id):
            mock_handle.case_id = case_id
            return mock_handle

    rt = SimpleNamespace(
        vault=MockVault(),
        audit=audit,
        redis=redis,
        db=db,
        temporal=MockTemporalClient(),
        settings=SimpleNamespace(task_queue="bureaucracy-queue", session_ttl=900)
    )
    app.state.rt = rt

    case_id_ref = "case-test-123"
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        yield client, audit, case_id_ref, mock_handle

    await db.dispose()


@pytest.mark.asyncio
async def test_healthz_unauthenticated(full_client):
    client, _, _, _ = full_client
    resp = await client.get("/healthz")
    assert resp.status_code == 200
    assert resp.json()["status"] == "HEALTHY"


@pytest.mark.asyncio
async def test_preflight_api_endpoint(full_client):
    client, _, _, _ = full_client
    intake_headers = {"Authorization": "Bearer intake-token"}

    payload = {
        "service_id": "state_scholarship",
        "portal_url": "https://scholarship.state.gov/apply",
        "profile": {
            "full_name": "Eleanor Vance",
            "date_of_birth": "2002-08-15",
            "national_id": "ID-987-654-321",
            "email": "eleanor@university.edu",
            "phone": "555-018-9922",
            "address_street": "42 Campus Way",
            "address_city": "College Town",
            "address_state": "CA",
            "address_zip": "90210"
        },
        "documents": []
    }
    resp = await client.post("/v1/services/preflight", headers=intake_headers, json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["service_id"] == "state_scholarship"
    assert "Academic Transcript / Proof of Enrollment (PDF)" in data["missing_recommended_documents"]


@pytest.mark.asyncio
async def test_pii_redaction_in_review_endpoint(full_client):
    client, audit, case_id, handle = full_client
    staff_headers = {"Authorization": "Bearer staff-token"}
    elevated_headers = {"Authorization": "Bearer staff-elevated"}

    # Seed packet in audit store
    img_digest = audit.put(case_id, "review.png", b"\x89PNG fake image")
    packet_data = {
        "case_id": case_id,
        "service_id": "driver_renewal",
        "citizen_name": "Alexander Hamilton",
        "national_id": "SSN-123-45-6789",
        "email": "hamilton@treasury.gov",
        "screenshot": img_digest
    }
    packet_digest = audit.json(case_id, "review", packet_data)
    handle.packet = packet_digest

    # Standard staff token receives masked PII
    masked_resp = await client.get(f"/v1/services/{case_id}/review", headers=staff_headers)
    assert masked_resp.status_code == 200
    review_data = masked_resp.json()["review_data"]
    assert review_data["national_id"] == "***-**-6789"
    assert review_data["email"] == "h" + "*" * 6 + "n@treasury.gov"

    # Elevated staff with pii:read receives unmasked PII
    unmasked_resp = await client.get(f"/v1/services/{case_id}/review", headers=elevated_headers)
    assert unmasked_resp.status_code == 200
    elevated_review = unmasked_resp.json()["review_data"]
    assert elevated_review["national_id"] == "SSN-123-45-6789"
    assert elevated_review["email"] == "hamilton@treasury.gov"


@pytest.mark.asyncio
async def test_metrics_and_tracking_endpoints(full_client):
    client, audit, case_id, handle = full_client
    staff_headers = {"Authorization": "Bearer staff-token"}

    # 1. Metrics endpoint
    metrics_resp = await client.get("/v1/services/metrics", headers=staff_headers)
    assert metrics_resp.status_code == 200
    metrics = metrics_resp.json()
    assert "total_submissions_attempted" in metrics
    assert "learned_portal_schemas" in metrics

    # 2. Seed receipt in audit store for tracking
    receipt_data = {
        "case_id": case_id,
        "service_id": "state_scholarship",
        "tracking_number": "PUB-REC-2026-98421",
        "portal_url": "https://scholarship.state.gov"
    }
    receipt_digest = audit.json(case_id, "receipt", receipt_data)
    handle.receipt = receipt_digest

    # 3. Schedule tracking
    track_resp = await client.post(f"/v1/services/{case_id}/track", headers=staff_headers)
    assert track_resp.status_code == 202
    track_data = track_resp.json()
    assert track_data["status"] == "TRACKING_SCHEDULED"
    assert track_data["tracking_number"] == "PUB-REC-2026-98421"
