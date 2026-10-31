import httpx
import pytest
from unittest.mock import patch, AsyncMock
from app.api.main import app
from app.domain.citizen.schemas import CitizenProfile


@pytest.mark.asyncio
async def test_live_execution_endpoints():
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        # 1. Verify embedded portal responds with 200 HTML
        portal_resp = await client.get("/portal/scholarship")
        assert portal_resp.status_code == 200
        assert "State Public Assistance & Scholarship Portal" in portal_resp.text

        # 2. Test live service execution request with mocked agent session
        profile = CitizenProfile(
            full_name="Priya Patel",
            date_of_birth="2003-08-15",
            national_id="AADHAAR-8901-2345-6789",
            email="priya.patel@university.ac.in",
            phone="+91-9876543210",
            address_street="24 MG Road",
            address_city="Bengaluru",
            address_state="Karnataka",
            address_zip="560001",
            income_annual=220000.0,
            household_size=3
        )
        service_req = {
            "service_id": "central_sector_college",
            "portal_url": "http://test/portal/scholarship",
            "profile": profile.model_dump(),
            "documents": []
        }

        with patch("app.api.v1.endpoints.services.run_live_agent_session", new_callable=AsyncMock) as mock_session:
            resp = await client.post("/v1/services/execute-live", json=service_req)
            assert resp.status_code == 202
            data = resp.json()
            assert data["status"] == "LAUNCHED"
            assert "case_id" in data
            assert data["telemetry_ws"].startswith("/ws/telemetry/")
            case_id = data["case_id"]

            # Verify the background agent session was dispatched
            mock_session.assert_called_once()

            # 3. Test agent control endpoint (pause, resume, step, skip)
            ctrl_pause = await client.post(f"/v1/services/{case_id}/control", json={"action": "pause"})
            assert ctrl_pause.status_code == 200
            assert ctrl_pause.json()["action"] == "pause"

            ctrl_resume = await client.post(f"/v1/services/{case_id}/control", json={"action": "resume"})
            assert ctrl_resume.status_code == 200
            assert ctrl_resume.json()["action"] == "resume"

            ctrl_step = await client.post(f"/v1/services/{case_id}/control", json={"action": "step"})
            assert ctrl_step.status_code == 200
            assert ctrl_step.json()["action"] == "step"

            # 4. Test digital signature authorization
            sig_resp = await client.post(
                f"/v1/services/{case_id}/signature",
                json={"packet": f"review-packet-{case_id}", "signature": "data:image/png;base64,mockSig"}
            )
            assert sig_resp.status_code == 202
            assert sig_resp.json()["status"] == "SIGNATURE_RECORDED"
