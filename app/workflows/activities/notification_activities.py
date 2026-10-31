import httpx
from temporalio import activity


class Notifications:
    def __init__(self, runtime):
        self.rt = runtime

    @activity.defn
    async def notify(self, case: str, state: str, packet: str) -> str:
        cfg = self.rt.settings
        webhook = getattr(cfg, "citizen_webhook", "https://example.gov/webhook")
        if not webhook.startswith("https://") and not webhook.startswith("http://localhost"):
            raise ValueError("Webhook requires TLS or localhost")
        auth = await self.rt.vault.read("platform/notification") if self.rt.vault else {"token": "dev"}
        token = auth.get("token", "dev") if isinstance(auth, dict) else "dev"
        async with httpx.AsyncClient(trust_env=False) as client:
            r = await client.post(
                webhook,
                headers={"Authorization": "Bearer " + token},
                json={
                    "case": case,
                    "workflow": activity.info().workflow_id,
                    "state": state,
                    "review": packet
                }
            )
            r.raise_for_status()
        return "OK"
