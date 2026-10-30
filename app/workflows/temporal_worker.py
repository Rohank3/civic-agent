import asyncio
from temporalio.worker import Worker
from .prior_auth_flow import PriorAuthorizationWorkflow
from .credentialing_flow import CAQHReattestationWorkflow
from .activities.clinical_activities import ClinicalActivities
from .activities.browser_activities import BrowserActivities
from .activities.notification_activities import Notifications
from app.core.runtime import Runtime


async def main():
    runtime = await Runtime.connect()
    clinical, browser = ClinicalActivities(runtime), BrowserActivities(runtime)
    try:
        await Worker(runtime.temporal, task_queue=runtime.settings.task_queue,
                     workflows=[PriorAuthorizationWorkflow, CAQHReattestationWorkflow],
                     activities=[clinical.extract, clinical.credential_case, browser.credentials,
                                 browser.login, browser.populate, browser.upload, browser.review,
                                 browser.submit, browser.poll, Notifications(runtime).notify]).run()
    finally:
        await runtime.close()


if __name__ == "__main__":
    asyncio.run(main())
