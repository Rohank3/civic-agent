from datetime import timedelta
from temporalio import workflow
from temporalio.common import RetryPolicy


@workflow.defn
class BureaucracyExecutionWorkflow:
    def __init__(self):
        self.state = "INITIALIZED"
        self.packet = ""
        self.signature = ""
        self.otp = ""
        self.receipt = ""

    @workflow.query
    def status(self) -> dict:
        return {
            "state": self.state,
            "packet": self.packet,
            "receipt": self.receipt,
            "signed": bool(self.signature)
        }

    @workflow.signal
    def signal_otp(self, code: str):
        if self.state in ("MFA_WAIT", "NAVIGATING_PORTAL"):
            self.otp = code

    @workflow.signal
    def sign(self, packet: str, signature: str):
        if self.state == "AWAITING_CITIZEN_REVIEW" and packet == self.packet:
            self.signature = signature

    @workflow.run
    async def run(self, case: str, source_ref: str, require_review: bool = False) -> str:
        self.state = "NAVIGATING_PORTAL"
        retry = RetryPolicy(maximum_attempts=2)

        # 1. Autonomously navigate, populate inputs, and upload documents
        self.packet = await workflow.execute_activity(
            "navigate_and_fill",
            args=[case, source_ref],
            result_type=str,
            start_to_close_timeout=timedelta(minutes=10),
            heartbeat_timeout=timedelta(minutes=2),
            retry_policy=retry
        )
        self.state = "FORM_POPULATED"

        # 2. Configurable Citizen Review Gate
        if require_review:
            self.state = "AWAITING_CITIZEN_REVIEW"
            # Wait for citizen confirmation signature
            await workflow.wait_condition(lambda: bool(self.signature), timeout=timedelta(days=2))

        # 3. Submit and acquire immutable tracking receipt
        self.state = "SUBMITTING"
        self.receipt = await workflow.execute_activity(
            "submit_and_extract_receipt",
            args=[case, source_ref, self.packet],
            result_type=str,
            start_to_close_timeout=timedelta(minutes=10),
            heartbeat_timeout=timedelta(minutes=2),
            retry_policy=RetryPolicy(maximum_attempts=1)  # Do not duplicate external submission side effects
        )
        self.state = "COMPLETED"
        return self.receipt


@workflow.defn
class BureaucracyStatusPollingWorkflow:
    def __init__(self):
        self.determination = "UNDER_REVIEW"
        self.next_poll_at = None

    @workflow.query
    def status(self) -> dict:
        return {"determination": self.determination, "next_poll_at": self.next_poll_at}

    @workflow.run
    async def run(self, case: str, source_ref: str, tracking_number: str) -> str:
        hours = 6.0
        while True:
            delay = min(48, max(6, hours * workflow.random().uniform(0.95, 1.05)))
            interval = timedelta(hours=delay)
            self.next_poll_at = (workflow.now() + interval).isoformat()
            await workflow.sleep(interval)
            self.next_poll_at = None

            status = await workflow.execute_activity(
                "poll_application_status",
                args=[case, source_ref, tracking_number],
                result_type=str,
                start_to_close_timeout=timedelta(minutes=5),
                retry_policy=RetryPolicy(maximum_attempts=3)
            )
            if status in ("APPROVED", "DENIED", "ACTION_REQUIRED"):
                self.determination = status
                return status
            hours = min(48, hours * 1.5)
