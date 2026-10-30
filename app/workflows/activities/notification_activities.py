import httpx
from temporalio import activity


class Notifications:
    def __init__(self, runtime):
        self.rt = runtime

    @activity.defn
    async def notify(self, case: str, state: str, packet: str) -> str:
        cfg = self.rt.settings
        if not cfg.clinic_webhook.startswith("https://"):
            raise ValueError("Clinic webhook requires TLS")
        auth = await self.rt.vault.read("platform/notification")
        async with httpx.AsyncClient(trust_env=False) as client:
            r = await client.post(cfg.clinic_webhook, headers={"Authorization": "Bearer " + auth["token"]},
                                  json={"case": case, "workflow": activity.info().workflow_id,
                                        "state": state, "review": packet})
            r.raise_for_status()
        return "OK"
