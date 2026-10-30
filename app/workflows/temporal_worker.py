import asyncio
from temporalio.exceptions import ApplicationError
from temporalio.worker import ActivityInboundInterceptor, Interceptor, Worker
from .bureaucracy_flow import BureaucracyExecutionWorkflow, BureaucracyStatusPollingWorkflow
from .activities.bureaucracy_activities import BureaucracyActivities
from .activities.notification_activities import Notifications
from app.core.runtime import Runtime


class RedactFailures(ActivityInboundInterceptor):
    async def execute_activity(self, input):
        try:
            return await super().execute_activity(input)
        except Exception:
            # Do not serialize Playwright call logs, model responses or SQL arguments into history.
            pass
        raise ApplicationError("Activity failed. Inspect restricted case artifacts.", type="ActivityFailure")


class HistoryPrivacy(Interceptor):
    def intercept_activity(self, next):
        return RedactFailures(next)


async def main():
    runtime = await Runtime.connect()
    bureaucracy = BureaucracyActivities(runtime)
    try:
        await Worker(
            runtime.temporal,
            task_queue=runtime.settings.task_queue,
            interceptors=[HistoryPrivacy()],
            workflows=[BureaucracyExecutionWorkflow, BureaucracyStatusPollingWorkflow],
            activities=[
                bureaucracy.navigate_and_fill,
                bureaucracy.submit_and_extract_receipt,
                bureaucracy.poll_application_status,
                Notifications(runtime).notify
            ]
        ).run()
    finally:
        await runtime.close()


if __name__ == "__main__":
    asyncio.run(main())
