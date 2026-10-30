from datetime import date, timedelta
from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field
from temporalio.client import Schedule, ScheduleActionStartWorkflow, ScheduleIntervalSpec, ScheduleSpec
from app.api.auth import require
from app.workflows.credentialing_flow import CAQHReattestationWorkflow

router = APIRouter()


class Enrollment(BaseModel):
    provider: str = Field(pattern=r"^[a-zA-Z0-9_-]+$")
    profile: str = Field(pattern=r"^[a-zA-Z0-9_-]+$")


@router.get("/credentialing/{provider}/expirations")
async def expirations(provider: str, request: Request, actor=Depends(require("staff"))):
    data = await request.app.state.rt.vault.read("providers/" + provider)
    today = date.today()
    return {key: {"expires": data[key]["expires"],
                  "days_remaining": (date.fromisoformat(data[key]["expires"]) - today).days}
            for key in ("state_license", "cds", "dea", "malpractice")}


@router.post("/credentialing/schedules", status_code=201)
async def enroll(body: Enrollment, request: Request, actor=Depends(require("intake"))):
    rt = request.app.state.rt
    identity = "caqh-" + body.provider
    await rt.temporal.create_schedule(identity, Schedule(action=ScheduleActionStartWorkflow(
        CAQHReattestationWorkflow.run, args=[body.provider, body.profile, actor], id=identity,
        task_queue=rt.settings.task_queue), spec=ScheduleSpec(intervals=[
            ScheduleIntervalSpec(every=timedelta(days=90))])), trigger_immediately=True)
    return {"schedule": identity}
