from temporalio import workflow
from .prior_auth_flow import ReviewFlow, step


@workflow.defn
class CAQHReattestationWorkflow(ReviewFlow):
    @workflow.run
    async def run(self, provider: str, profile: str) -> str:
        case = workflow.info().run_id
        source = await step("credential_case", case, provider, profile)
        await self.prepare(case, source)
        return self.state
