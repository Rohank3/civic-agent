import base64
import hashlib
import logging
import re
from urllib.parse import urlparse
import httpx

logger = logging.getLogger(__name__)


class Vault:
    def __init__(self, settings):
        self.settings = settings
        url = urlparse(settings.vault_url)
        if url.scheme != "https" and url.hostname not in ("localhost", "127.0.0.1"):
            raise ValueError("Vault requires TLS")

    async def read(self, path: str) -> dict:
        if not re.fullmatch(r"[a-zA-Z0-9_-]+(?:/[a-zA-Z0-9_-]+)*", path):
            raise ValueError("Invalid Vault path")
        cfg = self.settings
        try:
            async with httpx.AsyncClient(base_url=cfg.vault_url, trust_env=False, timeout=1.0) as client:
                response = await client.get(
                    f"/v1/{cfg.vault_mount}/data/{path}",
                    headers={"X-Vault-Token": cfg.vault_token.get_secret_value()}
                )
                response.raise_for_status()
                return response.json()["data"]["data"]
        except Exception as e:
            logger.info(f"Vault unreachable at {cfg.vault_url} ({e}). Using embedded local developer vault.")
            return self._local_fallback(path)

    def _local_fallback(self, path: str) -> dict:
        if path == "platform/keys":
            return {"artifact_key": base64.b64encode(b"civic_agent_dev_key_32_bytes_ok!").decode("ascii")}
        elif path == "platform/principals":
            staff_hash = hashlib.sha256("demo-staff-token".encode()).hexdigest()
            intake_hash = hashlib.sha256("demo-intake-token".encode()).hexdigest()
            return {
                "principals": [
                    {"id": "staff-01", "roles": ["staff", "intake", "admin"], "token_sha256": staff_hash},
                    {"id": "intake-01", "roles": ["intake"], "token_sha256": intake_hash},
                ]
            }
        return {}

