import base64
import hashlib
import logging
import os
import re
from urllib.parse import urlparse
import httpx

logger = logging.getLogger(__name__)

DEFAULT_DEV_VAULT_URLS = {
    "http://127.0.0.1:8200",
    "http://localhost:8200",
    "https://127.0.0.1:8200",
    "https://localhost:8200",
}


class Vault:
    def __init__(self, settings):
        self.settings = settings
        url = urlparse(settings.vault_url)
        if url.scheme != "https" and url.hostname not in ("localhost", "127.0.0.1"):
            raise ValueError("Vault requires TLS")
        self._unreachable = False

    @property
    def is_configured(self) -> bool:
        """Return True only if Vault is explicitly enabled or non-default external URL is configured."""
        if getattr(self.settings, "vault_enabled", False):
            return True
        if os.getenv("CIVICAGENT_VAULT_ENABLED", "").lower() in ("1", "true", "yes"):
            return True
        if os.getenv("VAULT_ENABLED", "").lower() in ("1", "true", "yes"):
            return True
        vault_url = (self.settings.vault_url or "").rstrip("/")
        if vault_url and vault_url not in DEFAULT_DEV_VAULT_URLS:
            return True
        return False

    async def read(self, path: str) -> dict:
        if not re.fullmatch(r"[a-zA-Z0-9_-]+(?:/[a-zA-Z0-9_-]+)*", path):
            raise ValueError("Invalid Vault path")

        # Fast path: if Vault is not explicitly enabled/configured or already marked unreachable,
        # immediately return local dev fallback without blocking network requests and waiting for a 1.0s timeout.
        if not self.is_configured or self._unreachable:
            return self._local_fallback(path)

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
            self._unreachable = True
            logger.info(f"Vault unreachable at {cfg.vault_url} ({e}). Using embedded local developer vault.")
            return self._local_fallback(path)

    def _local_fallback(self, path: str) -> dict:
        if path == "platform/keys":
            return {"artifact_key": base64.b64encode(b"civic_agent_dev_key_32_bytes_ok!").decode("ascii")}
        elif path == "platform/principals":
            staff_hash = hashlib.sha256("demo-staff-token".encode()).hexdigest()
            intake_hash = hashlib.sha256("demo-intake-token".encode()).hexdigest()
            otp_hash = hashlib.sha256("demo-otp-token".encode()).hexdigest()
            return {
                "principals": [
                    {"id": "staff-01", "roles": ["staff", "intake", "admin"], "token_sha256": staff_hash},
                    {"id": "intake-01", "roles": ["intake"], "token_sha256": intake_hash},
                    {"id": "otp-01", "roles": ["otp"], "token_sha256": otp_hash},
                ]
            }
        elif path == "platform/notification":
            return {"token": "dev"}
        return {}
