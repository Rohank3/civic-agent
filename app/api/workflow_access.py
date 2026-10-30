from fastapi import HTTPException
from temporalio.client import WorkflowExecutionStatus
from temporalio.service import RPCError, RPCStatusCode


async def workflow_status(runtime, workflow_id, *, require_running=False):
    client = runtime.temporal
    try:
        desc = await client.get_workflow_handle(workflow_id).describe()
        if (desc.task_queue != runtime.settings.task_queue or
                desc.workflow_type not in {"PriorAuthorizationWorkflow", "CAQHReattestationWorkflow"}):
            raise HTTPException(404, "Workflow not found")
        if require_running and desc.status != WorkflowExecutionStatus.RUNNING:
            raise HTTPException(409, "Workflow is not awaiting this action")
        handle = client.get_workflow_handle(workflow_id, run_id=desc.run_id)
        state = await handle.query("status")
    except RPCError as exc:
        if exc.status == RPCStatusCode.NOT_FOUND:
            raise HTTPException(404, "Workflow not found") from None
        raise
    return desc, handle, state
