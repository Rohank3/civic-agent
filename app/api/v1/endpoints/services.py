import base64
from uuid import uuid4
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, Field
from temporalio.client import WorkflowExecutionStatus

from app.api.auth import require
from app.core.pii import sanitize_citizen_dict
from app.core.runtime import submissions
from app.domain.citizen.schemas import ServiceRequest, TrackingReceipt
from app.domain.citizen.preflight import PreflightReport, run_preflight_check
from app.workflows.bureaucracy_flow import (
    BureaucracyExecutionWorkflow,
    BureaucracyStatusPollingWorkflow
)

router = APIRouter()


class SignaturePayload(BaseModel):
    packet: str = Field(min_length=1)
    signature: str = Field(min_length=1)


class OtpPayload(BaseModel):
    code: str = Field(min_length=4, max_length=10)


@router.post("/services/preflight", response_model=PreflightReport)
async def preflight_evaluation(
    body: ServiceRequest,
    actor=Depends(require("intake"))
):
    """Run sufficiency, eligibility criteria, and document integrity pre-checks without launching browser."""
    return run_preflight_check(body)


@router.post("/services/execute", status_code=202)
async def execute_service(
    body: ServiceRequest,
    request: Request,
    response: Response,
    actor=Depends(require("intake"))
):
    """Ingest citizen profile and service request, launching autonomous browser execution."""
    rt = request.app.state.rt
    case_id = f"case-{uuid4()}"

    # Validate document payloads
    for doc in body.documents:
        if doc.kind in ("pdf", "image"):
            try:
                base64.b64decode(doc.content, validate=True)
            except Exception:
                raise HTTPException(status_code=400, detail=f"Document {doc.name} has invalid base64 content")

    source_ref = rt.audit.json(case_id, "source", body.model_dump())

    handle = await rt.temporal.start_workflow(
        BureaucracyExecutionWorkflow.run,
        args=[case_id, source_ref, body.require_review],
        id=case_id,
        task_queue=rt.settings.task_queue
    )

    status_path = f"/v1/services/{case_id}/status"
    response.headers["Location"] = status_path
    return {
        "case": case_id,
        "run_id": handle.run_id,
        "service_id": body.service_id,
        "status_url": status_path,
        "require_review": body.require_review
    }


@router.get("/services/{case_id}/status")
async def get_service_status(
    case_id: str,
    request: Request,
    actor=Depends(require("staff"))
):
    """Retrieve autonomous workflow execution stage and artifact links."""
    rt = request.app.state.rt
    handle = rt.temporal.get_workflow_handle(case_id)
    try:
        desc = await handle.describe()
        wf_query = await handle.query("status")
    except Exception as e:
        raise HTTPException(status_code=404, detail="Case workflow not found")

    status_name = desc.status.name
    stage = wf_query.get("state", "UNKNOWN")
    packet = wf_query.get("packet", "")
    receipt = wf_query.get("receipt", "")

    links = {
        "self": f"/v1/services/{case_id}/status",
        "review": f"/v1/services/{case_id}/review" if packet else None,
        "signature": f"/v1/services/{case_id}/signature" if stage == "AWAITING_CITIZEN_REVIEW" else None,
        "receipt": f"/v1/services/{case_id}/receipt" if receipt else None
    }

    return {
        "case": case_id,
        "execution_status": status_name,
        "stage": stage,
        "packet": packet,
        "links": {k: v for k, v in links.items() if v is not None}
    }


@router.get("/services/{case_id}/review")
async def get_review_packet(
    case_id: str,
    request: Request,
    image: bool = False,
    actor=Depends(require("staff"))
):
    """Fetch the pre-submission verification snapshot or screenshot."""
    rt = request.app.state.rt
    handle = rt.temporal.get_workflow_handle(case_id)
    try:
        wf_query = await handle.query("status")
        packet_ref = wf_query.get("packet")
    except Exception:
        raise HTTPException(status_code=404, detail="Case workflow not found")

    if not packet_ref:
        raise HTTPException(status_code=409, detail="Review packet not yet available")

    packet = rt.audit.read_json(case_id, "review", packet_ref)
    if image:
        screenshot_bytes = rt.audit.read(case_id, "review.png", packet["screenshot"])
        return Response(content=screenshot_bytes, media_type="image/png")

    principal = getattr(request.state, "principal", {})
    can_view_pii = "pii:read" in principal.get("roles", [])
    sanitized_packet = sanitize_citizen_dict(packet, redact_pii=not can_view_pii)
    return {"case": case_id, "packet": packet_ref, "review_data": sanitized_packet}


@router.post("/services/{case_id}/signature", status_code=202)
async def submit_signature(
    case_id: str,
    body: SignaturePayload,
    request: Request,
    actor=Depends(require("staff"))
):
    """Citizen or staff review sign-off to proceed with submission."""
    rt = request.app.state.rt
    handle = rt.temporal.get_workflow_handle(case_id)
    try:
        wf_query = await handle.query("status")
        if wf_query.get("state") != "AWAITING_CITIZEN_REVIEW":
            raise HTTPException(status_code=409, detail="Case is not awaiting citizen review")
        if wf_query.get("packet") != body.packet:
            raise HTTPException(status_code=400, detail="Review packet digest mismatch")

        await handle.signal("sign", body.packet, body.signature)
        return {"status": "SIGNATURE_RECORDED", "case": case_id}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/services/{case_id}/otp", status_code=200)
async def submit_otp_code(
    case_id: str,
    body: OtpPayload,
    request: Request,
    actor=Depends(require("otp"))
):
    """Submit OTP challenge response for MFA challenges."""
    rt = request.app.state.rt
    await rt.redis.set(f"otp:{case_id}", body.code, ex=300)
    try:
        handle = rt.temporal.get_workflow_handle(case_id)
        await handle.signal("signal_otp", body.code)
    except Exception:
        pass
    return {"status": "OTP_DELIVERED", "case": case_id}


@router.get("/services/{case_id}/receipt")
async def get_receipt(
    case_id: str,
    request: Request,
    screenshot: bool = False,
    actor=Depends(require("staff"))
):
    """Fetch completed tracking receipt and immutable cryptographic proof."""
    rt = request.app.state.rt
    handle = rt.temporal.get_workflow_handle(case_id)
    try:
        wf_query = await handle.query("status")
        receipt_ref = wf_query.get("receipt")
    except Exception:
        raise HTTPException(status_code=404, detail="Case not found")

    if not receipt_ref:
        raise HTTPException(status_code=409, detail="Receipt not yet generated")

    receipt_data = rt.audit.read_json(case_id, "receipt", receipt_ref)
    if screenshot:
        img_bytes = rt.audit.read(case_id, "receipt_screenshot.png", receipt_data["screenshot_artifact_digest"])
        return Response(content=img_bytes, media_type="image/png")

    return receipt_data


@router.post("/services/{case_id}/track", status_code=202)
async def schedule_tracking(
    case_id: str,
    request: Request,
    actor=Depends(require("staff"))
):
    """Initiate long-running background polling for post-submission determination updates."""
    rt = request.app.state.rt
    handle = rt.temporal.get_workflow_handle(case_id)
    try:
        wf_query = await handle.query("status")
        receipt_ref = wf_query.get("receipt")
    except Exception:
        raise HTTPException(status_code=404, detail="Case workflow not found")

    if not receipt_ref:
        raise HTTPException(status_code=409, detail="Receipt not yet generated for tracking")

    receipt = rt.audit.read_json(case_id, "receipt", receipt_ref)
    tracking_number = receipt.get("tracking_number")
    source_ref = rt.audit.json(case_id, "track_source", receipt)

    track_id = f"track-{case_id}"
    await rt.temporal.start_workflow(
        BureaucracyStatusPollingWorkflow.run,
        args=[case_id, source_ref, tracking_number],
        id=track_id,
        task_queue=rt.settings.task_queue
    )
    return {"status": "TRACKING_SCHEDULED", "tracking_id": track_id, "tracking_number": tracking_number}


@router.get("/services/metrics")
async def execution_metrics(
    request: Request,
    actor=Depends(require("staff"))
):
    """Retrieve operational execution telemetry and submission statistics."""
    rt = request.app.state.rt
    async with rt.db.connect() as conn:
        result = await conn.execute(submissions.select())
        rows = result.all()
        total_cases = len(rows)
        completed = sum(1 for r in rows if r.receipt)

    learned_keys = await rt.redis.keys("portal_memory:*")

    return {
        "total_submissions_attempted": total_cases,
        "total_receipts_confirmed": completed,
        "completion_rate": round(completed / max(1, total_cases), 4) if total_cases > 0 else 1.0,
        "learned_portal_schemas": len(learned_keys)
    }
