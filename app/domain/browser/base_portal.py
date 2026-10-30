from .vision_fallback import navigation_click


class Portal:
    """Selector contract provisioned in Vault for an authorized payer environment."""
    def __init__(self, page, profile, vision=None):
        self.page, self.cfg, self.vision = page, profile, vision
        self.s = profile["selectors"]

    async def login(self, code=None):
        if await self.page.locator(self.s["authenticated"]).is_visible():
            return "OK"
        if await self.page.locator(self.s["username"]).is_visible():
            await self.page.locator(self.s["username"]).fill(self.cfg["username"])
            await self.page.locator(self.s["password"]).fill(self.cfg["password"])
            await self.page.locator(self.s["login"]).click()
        if "otp" in self.s and await self.page.locator(self.s["otp"]).is_visible():
            if not code:
                return "MFA"
            await self.page.locator(self.s["otp"]).fill(code)
            await self.page.locator(self.s["verify"]).click()
        await self.page.locator(self.s["authenticated"]).wait_for(state="visible")
        return "OK"

    async def draft(self):
        if self.cfg.get("draft_link_label"):
            await navigation_click(self.page, self.s["draft_link"], self.cfg["draft_link_label"], self.vision)
        await self.page.locator(self.s["draft"]).wait_for(state="visible")

    async def fill(self, fields):
        for field, value in fields.items():
            await self.page.locator(self.cfg["fields"][field]).fill(value)
        await self.page.locator(self.s["save"]).click()

    async def upload(self, files):
        if files:
            await self.page.locator(self.s["upload"]).set_input_files(files)
            await self.page.locator(self.s["save"]).click()

    async def snapshot(self):
        values = {field: await self.page.locator(selector).input_value()
                  for field, selector in self.cfg["fields"].items()}
        identity = await self.page.locator(self.s["draft_id"]).inner_text()
        attachments = await self.page.locator(self.s["attachment_names"]).all_text_contents()
        controls = await self.page.locator(self.s["draft"]).locator(
            "input:not([type=hidden]),textarea,select,[contenteditable=true]"
        ).evaluate_all("""els => els.map(el => ({
            id: el.name || el.id, type: el.type, value: el.value ?? el.textContent,
            checked: el.checked, selected: el.selectedOptions && [...el.selectedOptions].map(o => o.value)
        }))""")
        return {"draft_id": identity, "values": values, "attachments": attachments, "controls": controls}
