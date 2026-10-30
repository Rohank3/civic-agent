from datetime import date, timedelta
from types import SimpleNamespace
import os
import pytest
from app.core.audit import AuditStore
from app.core.security import Cipher
from app.workflows.activities.clinical_activities import ClinicalActivities


async def test_credential_inventory_and_expiration(tmp_path):
    expires = (date.today() + timedelta(days=80)).isoformat()
    inventory = {field: {"expires": expires} for field in ("state_license", "cds", "dea", "malpractice")}
    inventory.update(draft_id="provider-001", documents=[], previous={"dea": "2024-01-01"})
    class Vault:
        async def read(self, path):
            assert path == "providers/test"
            return inventory
    audit = AuditStore(tmp_path, Cipher(os.urandom(32)))
    activities = ClinicalActivities(SimpleNamespace(audit=audit, vault=Vault()))
    ref = await activities.credential_case("run", "test", "profile", "scheduler")
    fields = await activities.extract("run", ref)
    assert audit.read_json("run", "fields", fields)["values"]["dea"] == expires
    inventory["cds"]["expires"] = date.today().isoformat()
    with pytest.raises(ValueError, match="renewal"):
        await activities.credential_case("run", "test", "profile", "scheduler")
