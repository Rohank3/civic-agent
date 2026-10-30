import io
import os
from datetime import datetime, timezone
from app.core.audit import LockedAuditStore
from app.core.security import Cipher


def test_locked_store_requests_compliance_and_verifies_bytes():
    class Bucket:
        def put_object(self, **kwargs):
            self.obj = kwargs
        def get_object(self, Bucket, Key):
            assert (Bucket, Key) == (self.obj["Bucket"], self.obj["Key"])
            return {"Body": io.BytesIO(self.obj["Body"])}
    bucket = Bucket()
    store = LockedAuditStore(bucket, "audit", Cipher(os.urandom(32)), 7)
    digest = store.put("case", "record", b"synthetic")
    assert bucket.obj["ObjectLockMode"] == "COMPLIANCE"
    assert bucket.obj["IfNoneMatch"] == "*"
    assert bucket.obj["ObjectLockRetainUntilDate"] > datetime.now(timezone.utc)
    assert store.get("case", "record", digest) == b"synthetic"
