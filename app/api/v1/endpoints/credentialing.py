from datetime import timedelta
from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field
from temporalio.client import Schedule, ScheduleActionStartWorkflow, ScheduleIntervalSpec, ScheduleSpec
from app.api.auth import require
from app.workflows.credentialing_flow import CAQHReattestationWorkflow

router = APIRouter()


class Enrollment(BaseModel):
    provider: str = Field(pattern=r"^[a-zA-Z0-9_-]+$")
    profile: str = Field(pattern=r"^[a-zA-Z0-9_-]+$")


@router.post("/credentialing/schedules", status_code=201)
async def enroll(body: Enrollment, request: Request, actor=Depends(require("intake"))):
    rt = request.app.state.rt
    identity = "caqh-" + body.provider
    await rt.temporal.create_schedule(identity, Schedule(action=ScheduleActionStartWorkflow(
        CAQHReattestationWorkflow.run, args=[body.provider, body.profile], id=identity,
        task_queue=rt.settings.task_queue), spec=ScheduleSpec(intervals=[
            ScheduleIntervalSpec(every=timedelta(days=90))])), trigger_immediately=True)
    return {"schedule": identity}
