import uuid
import pytest
import httpx
from app.api.main import app

@pytest.mark.asyncio
async def test_citizen_sqlite_persistence_and_evaluator_account():
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        # 1. Test pre-seeded evaluator account login
        eval_login_resp = await client.post("/v1/auth/login", json={
            "username": "evaluator",
            "password": "Evaluator@2026"
        })
        assert eval_login_resp.status_code == 200
        data = eval_login_resp.json()
        assert data["status"] == "AUTHENTICATED"
        assert data["user"]["role"] == "judge_evaluator"
        assert data["user"]["username"] == "evaluator"
        assert data["user"]["fullName"] == "Judge Evaluator"

        # 2. Test new citizen registration with unique username
        test_uname = f"citizen_{uuid.uuid4().hex[:8]}"
        reg_resp = await client.post("/v1/auth/register", json={
            "username": test_uname,
            "full_name": "Test Citizen Persist",
            "email": f"{test_uname}@citizen.gov.in",
            "password": "SecurePassword123!",
            "address_state": "Karnataka",
            "income_annual": 195000.0,
            "category": "OBC"
        })
        assert reg_resp.status_code == 200
        reg_data = reg_resp.json()
        user_id = reg_data["user"]["id"]
        assert user_id == f"user_{test_uname}"

        # 3. Test login with newly registered citizen
        login_resp = await client.post("/v1/auth/login", json={
            "username": test_uname,
            "password": "SecurePassword123!"
        })
        assert login_resp.status_code == 200
        assert login_resp.json()["status"] == "AUTHENTICATED"

        # 4. Test profile update and retrieval
        profile_update = {
            "full_name": "Test Citizen Persist Updated",
            "date_of_birth": "2002-04-10",
            "national_id": "AADHAAR-9999-8888-7777",
            "email": "persist@citizen.gov.in",
            "phone": "9876543210",
            "address_street": "10 Tech Road",
            "address_city": "Bengaluru",
            "address_state": "Karnataka",
            "address_zip": "560001",
            "income_annual": 175000.0,
            "household_size": 4,
            "category": "OBC",
            "attributes": {"gpa": 3.9, "percentage": 89.0}
        }
        put_resp = await client.put(f"/v1/citizen/profile/{user_id}", json=profile_update)
        assert put_resp.status_code == 200

        get_prof_resp = await client.get(f"/v1/citizen/profile/{user_id}")
        assert get_prof_resp.status_code == 200
        fetched = get_prof_resp.json()
        assert fetched["full_name"] == "Test Citizen Persist Updated"
        assert fetched["attributes"]["percentage"] == 89.0

        # 5. Test application record save and retrieval
        app_record = {
            "trackingNumber": "ACK-TEST-PERSIST-001",
            "schemeId": "central_sector_college",
            "schemeName": "Central Sector Scheme",
            "ministry": "Ministry of Education",
            "grantAmount": 20000.0,
            "timestamp": "2026-11-01T04:00:00Z"
        }
        save_app_resp = await client.post(f"/v1/citizen/applications/{user_id}", json=app_record)
        assert save_app_resp.status_code == 200
        assert save_app_resp.json()["status"] == "RECORDED"

        get_apps_resp = await client.get(f"/v1/citizen/applications/{user_id}")
        assert get_apps_resp.status_code == 200
        apps_list = get_apps_resp.json()
        assert len(apps_list) >= 1
        assert apps_list[0]["trackingNumber"] == "ACK-TEST-PERSIST-001"
