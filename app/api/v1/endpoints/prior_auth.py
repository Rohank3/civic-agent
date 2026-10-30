import base64
from typing import Literal
from uuid import uuid4
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, Field
from temporalio.client import WorkflowExecutionStatus
from app.api.auth import require
from app.api.workflow_access import workflow_status
from app.domain.clinical.extractor import fhir_pages
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


def document_issues(body: Intake) -> list[dict]:
    issues = []
    names = set()
    for index, doc in enumerate(body.documents):
        def issue(code):
            issues.append({"document_index": index, "code": code})

        if doc.name.casefold() in names:
            issue("DUPLICATE_DOCUMENT_NAME")
        names.add(doc.name.casefold())
        if doc.kind == "text" and (not isinstance(doc.content, str) or not doc.content.strip()):
            issue("EXPECTED_NONEMPTY_TEXT")
        elif doc.kind == "pdf":
            try:
                raw = base64.b64decode(doc.content, validate=True) if isinstance(doc.content, str) else b""
                if not raw.startswith(b"%PDF-"):
                    issue("EXPECTED_BASE64_PDF")
            except ValueError:
                issue("EXPECTED_BASE64_PDF")
        elif doc.kind == "fhir":
            try:
                if not isinstance(doc.content, dict) or not fhir_pages(doc.name, doc.content):
                    issue("EXPECTED_SUPPORTED_FHIR")
            except (KeyError, AttributeError, TypeError, ValueError):
                issue("INVALID_FHIR_RESOURCE_OR_SUBJECT")
    return issues


@router.post("/prior-auth/validate")
async def validate_intake(body: Intake, actor=Depends(require("intake"))):
    issues = document_issues(body)
    return {"valid": not issues, "issues": issues}


@router.post("/prior-auth", status_code=202)
async def intake(body: Intake, request: Request, response: Response, actor=Depends(require("intake"))):
    issues = document_issues(body)
    if issues:
        raise HTTPException(422, detail=issues)
    rt = request.app.state.rt
    case = str(uuid4())
    source = rt.audit.json(case, "source", {**body.model_dump(), "initiator": actor})
    await rt.temporal.start_workflow(PriorAuthorizationWorkflow.run, args=[case, source],
                                     id=case, task_queue=rt.settings.task_queue)
    status_url = str(request.app.url_path_for("status", workflow_id=case))
    response.headers["Location"] = status_url
    return {"case": case, "status_url": status_url}


@router.get("/workflows/{workflow_id}")
async def status(workflow_id: str, request: Request, actor=Depends(require("staff"))):
    desc, _, state = await workflow_status(request.app.state.rt, workflow_id)
    links = {}
    if desc.status == WorkflowExecutionStatus.RUNNING:
        if state["state"] == "HUMAN_REVIEW_WAIT":
            review = str(request.app.url_path_for("review", workflow_id=workflow_id))
            links = {"review": review, "screenshot": review + "?image=true",
                     "signature": str(request.app.url_path_for("sign", workflow_id=workflow_id))}
        elif state["state"] == "MFA_WAIT":
            links["otp"] = str(request.app.url_path_for("otp", workflow_id=workflow_id))
    return {**state, "execution_status": desc.status.name if desc.status else None, "links": links}
