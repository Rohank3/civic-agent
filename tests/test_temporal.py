from datetime import timedelta
import os
import pytest
from temporalio import activity
from temporalio.testing import WorkflowEnvironment
from temporalio.worker import Worker
from app.workflows.prior_auth_flow import PriorAuthorizationWorkflow


@pytest.mark.skipif(not os.getenv("MEDAUTO_TEMPORAL_TEST"), reason="requires Temporal time-skipping server")
async def test_mfa_review_and_multiday_polling():
    events = []
    def stub(name, result):
        @activity.defn(name=name)
        async def execute(*args):
            events.append((name, args))
            return result(*args) if callable(result) else result
        return execute
    stubs = [stub(k, "OK") for k in ("credentials", "populate", "upload", "notify", "submit")]
    stubs += [stub("extract", "fields"), stub("review", "packet"), stub("poll", "APPROVED"),
              stub("login", lambda _, __, otp: "OK" if otp else "MFA")]
    async with await WorkflowEnvironment.start_time_skipping() as env:
        async with Worker(env.client, task_queue="test-pa", workflows=[PriorAuthorizationWorkflow], activities=stubs):
            handle = await env.client.start_workflow(PriorAuthorizationWorkflow.run, args=["case", "ref"],
                                                     id="case", task_queue="test-pa")
            async def until(state):
                for _ in range(100):
                    if (await handle.query("status"))["state"] == state:
                        return
                    await env.sleep(timedelta(seconds=1))
                pytest.fail("Did not reach " + state)
            await until("MFA_WAIT")
            await handle.signal("signal_submit_otp", "opaque-token")
            await until("HUMAN_REVIEW_WAIT")
            await handle.signal("sign", args=["wrong", "signature"])
            assert not any(name == "submit" for name, _ in events)
            await handle.signal("sign", args=["packet", "signature"])
            assert await handle.result() == "APPROVED"
            assert [name for name, _ in events].count("submit") == 1
