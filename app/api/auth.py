import hashlib
import hmac
from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer


def require(role):
    async def check(request: Request, auth: HTTPAuthorizationCredentials = Depends(HTTPBearer())):
        entries = (await request.app.state.rt.vault.read("platform/principals"))["principals"]
        digest = hashlib.sha256(auth.credentials.encode()).hexdigest()
        for entry in entries:
            if hmac.compare_digest(entry["token_sha256"], digest) and role in entry["roles"]:
                return entry["id"]
        raise HTTPException(403)
    return check
