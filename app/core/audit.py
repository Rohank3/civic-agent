import hashlib
import json
import os
import tempfile
from pathlib import Path
from .security import Cipher


class AuditStore:
    """Publish encrypted objects atomically, with exclusive content-addressed names."""
    def __init__(self, root, cipher: Cipher):
        self.root = Path(root)
        self.root.mkdir(parents=True, exist_ok=True)
        self.cipher = cipher

    def put(self, case: str, kind: str, raw: bytes) -> str:
        body = self.cipher.seal(raw, f"{case}/{kind}")
        digest = hashlib.sha256(body).hexdigest()
        with tempfile.NamedTemporaryFile(dir=self.root, delete=False) as f:
            path = Path(f.name)
            try:
                f.write(body)
                f.flush()
                os.fsync(f.fileno())
            except BaseException:
                f.close()
                path.unlink(missing_ok=True)
                raise
        try:
            os.link(path, self.root / digest)
        finally:
            path.unlink()
        return digest

    def get(self, case, kind, digest):
        if len(digest) != 64 or any(c not in "0123456789abcdef" for c in digest):
            raise ValueError("Invalid artifact reference")
        body = (self.root / digest).read_bytes()
        if hashlib.sha256(body).hexdigest() != digest:
            raise ValueError("Artifact integrity failure")
        return self.cipher.open(body, f"{case}/{kind}")

    def json(self, case, kind, obj):
        return self.put(case, kind, json.dumps(obj, sort_keys=True).encode())

    def read_json(self, case, kind, digest):
        return json.loads(self.get(case, kind, digest))
