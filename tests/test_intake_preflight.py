from types import SimpleNamespace
import httpx
from fastapi import FastAPI
from app.api.v1.endpoints.prior_auth import router


async def test_preflight_and_submission_return_the_same_private_errors():
    import hashlib
    class Vault:
        async def read(self, path):
            return {"principals": [{"id": "clinic", "roles": ["intake"],
                    "token_sha256": hashlib.sha256(b"test-token").hexdigest()}]}
    app = FastAPI()
    app.include_router(router)
    app.state.rt = SimpleNamespace(vault=Vault())
    body = {"profile": "sandbox", "payer": "availity", "expected_draft_id": "case",
            "documents": [{"name": "note", "kind": "text", "content": "  "},
                          {"name": "NOTE", "kind": "pdf", "content": "private invalid data"},
                          {"name": "bundle", "kind": "fhir", "content": {"resourceType": "Bundle"}}]}
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as api:
        assert (await api.post("/prior-auth/validate", json=body)).status_code in (401, 403)
        api.headers["Authorization"] = "Bearer test-token"
        preflight = (await api.post("/prior-auth/validate", json=body)).json()
        submit = await api.post("/prior-auth", json=body)
        assert submit.status_code == 422
        assert submit.json()["detail"] == preflight["issues"]
        assert not preflight["valid"] and len(preflight["issues"]) == 4
        assert "private invalid data" not in submit.text
        body["documents"] = [{"name": "note", "kind": "text", "content": "synthetic example"}]
        assert (await api.post("/prior-auth/validate", json=body)).json() == {"valid": True, "issues": []}
