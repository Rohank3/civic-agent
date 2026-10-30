from typing import Literal
from uuid import uuid4
from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field
from app.api.auth import require
from app.workflows.prior_auth_flow import PriorAuthorizationWorkflow

router = APIRouter()


class Document(BaseModel):
    name: str = Field(min_length=1, max_length=160, pattern=r"^[^/\\]+$")
    kind: Literal["text", "pdf", "fhir"]
    content: str | dict


class Intake(BaseModel):
    payer: Literal["availity", "covermymeds", "unitedhealthcare", "state_medicaid"]
    profile: str = Field(pattern=r"^[a-zA-Z0-9_-]+$")
    expected_draft_id: str = Field(min_length=1)
    documents: list[Document] = Field(min_length=1, max_length=50)


@router.post("/prior-auth", status_code=202)
async def intake(body: Intake, request: Request, actor=Depends(require("intake"))):
    rt = request.app.state.rt
    case = str(uuid4())
    source = rt.audit.json(case, "source", {**body.model_dump(), "initiator": actor})
    await rt.temporal.start_workflow(PriorAuthorizationWorkflow.run, args=[case, source],
                                     id=case, task_queue=rt.settings.task_queue)
    return {"case": case}


@router.get("/workflows/{workflow_id}")
async def status(workflow_id: str, request: Request, actor=Depends(require("staff"))):
    return await request.app.state.rt.temporal.get_workflow_handle(workflow_id).query("status")
