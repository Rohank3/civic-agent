from datetime import timedelta
from temporalio import workflow
from temporalio.common import RetryPolicy


async def step(name, *args, once=False):
    return await workflow.execute_activity(name, args=list(args), result_type=str,
        start_to_close_timeout=timedelta(minutes=8),
        retry_policy=RetryPolicy(maximum_attempts=1 if once else 3))


class ReviewFlow:
    def __init__(self):
        self.state = "INITIALIZED"
        self.packet = ""
        self.signature = ""
        self.otp = ""
        self.next_poll_at = None

    @workflow.query
    def status(self) -> dict:
        return {"state": self.state, "packet": self.packet, "next_poll_at": self.next_poll_at}

    @workflow.signal
    def signal_submit_otp(self, code: str):
        # API stores the code in encrypted, expiring storage and signals its opaque reference.
        if self.state == "MFA_WAIT":
            self.otp = code

    @workflow.signal
    def sign(self, packet: str, signature: str):
        if self.state == "HUMAN_REVIEW_WAIT" and packet == self.packet:
            self.signature = signature

    async def prepare(self, case, source):
        await step("credentials", case, source)
        self.state = "CREDENTIALS_FETCHED"
        auth = await step("login", case, source, "")
        if auth == "MFA":
            self.state = "MFA_WAIT"
            await step("notify", case, self.state, "")
            await workflow.wait_condition(lambda: bool(self.otp), timeout=timedelta(minutes=10))
            auth = await step("login", case, source, self.otp, once=True)
        if auth != "OK":
            raise RuntimeError("Authentication incomplete")
        self.state = "PORTAL_AUTHENTICATED"
        clinical = await step("extract", case, source)
        await step("populate", case, source, clinical)
        self.state = "QUESTIONNAIRE_POPULATED"
        await step("upload", case, source)
        self.state = "ATTACHMENTS_UPLOADED"
        self.packet = await step("review", case, source, clinical)
        self.state = "HUMAN_REVIEW_WAIT"
        await step("notify", case, self.state, self.packet)
        await workflow.wait_condition(lambda: bool(self.signature), timeout=timedelta(days=7))
        await step("submit", case, source, self.packet, self.signature, once=True)
        self.state = "SUBMITTED"


@workflow.defn
class PriorAuthorizationWorkflow(ReviewFlow):
    @workflow.run
    async def run(self, case: str, source: str) -> str:
        await self.prepare(case, source)
        self.state = "POLLING_STATUS"
        hours = 4.0
        while True:
            delay = min(24, max(4, hours * workflow.random().uniform(0.95, 1.05)))
            interval = timedelta(hours=delay)
            self.next_poll_at = (workflow.now() + interval).isoformat()
            await workflow.sleep(interval)
            self.next_poll_at = None
            status = await step("poll", case, source)
            if status in ("APPROVED", "DENIED", "WITHDRAWN"):
                self.state = status
                return status
            hours = min(24, hours * 1.5)
