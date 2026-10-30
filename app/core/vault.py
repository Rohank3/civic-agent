import re
from urllib.parse import urlparse
import httpx


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
        async with httpx.AsyncClient(base_url=cfg.vault_url, trust_env=False) as client:
            response = await client.get(f"/v1/{cfg.vault_mount}/data/{path}",
                                        headers={"X-Vault-Token": cfg.vault_token.get_secret_value()})
            response.raise_for_status()
            return response.json()["data"]["data"]
