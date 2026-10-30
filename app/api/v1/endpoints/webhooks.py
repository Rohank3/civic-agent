from uuid import uuid4
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, Field
from app.api.auth import require
from app.api.workflow_access import workflow_status

router = APIRouter()


class Approval(BaseModel):
    packet: str = Field(pattern=r"^[0-9a-f]{64}$")


class Challenge(BaseModel):
    code: str = Field(pattern=r"^\d{4,10}$")


async def pending(rt, workflow_id, expected):
    desc, handle, state = await workflow_status(rt, workflow_id, require_running=True)
    if state["state"] != expected:
        raise HTTPException(409, "Workflow is not awaiting this action")
    case = desc.run_id if desc.workflow_type == "CAQHReattestationWorkflow" else workflow_id
    return handle, state, case


@router.post("/workflows/{workflow_id}/otp", status_code=202)
async def otp(workflow_id: str, body: Challenge, request: Request, actor=Depends(require("otp"))):
    rt = request.app.state.rt
    handle, _, case = await pending(rt, workflow_id, "MFA_WAIT")
    ref = str(uuid4())
    key = f"otp:{case}:{ref}"
    await rt.redis.set(key, rt.audit.cipher.seal(body.code.encode(), key), ex=300)
    await handle.signal("signal_submit_otp", ref)
    return {"received": True}


@router.get("/workflows/{workflow_id}/review")
async def review(workflow_id: str, request: Request, image: bool = False, actor=Depends(require("staff"))):
    rt = request.app.state.rt
    _, state, case = await pending(rt, workflow_id, "HUMAN_REVIEW_WAIT")
    packet = rt.audit.read_json(case, "review", state["packet"])
    if image:
        return Response(rt.audit.get(case, "review.png", packet["screenshot"]), media_type="image/png",
                        headers={"Cache-Control": "no-store"})
    fields = rt.audit.read_json(case, "fields", packet["fields"])
    if "evidence" in fields:
        packet["evidence"] = rt.audit.read_json(case, "evidence", fields["evidence"])
    packet["policies"] = fields.get("policies", [])
    return {"packet": state["packet"], "review": packet}


@router.post("/workflows/{workflow_id}/signature", status_code=202)
async def sign(workflow_id: str, body: Approval, request: Request, actor=Depends(require("staff"))):
    rt = request.app.state.rt
    handle, state, case = await pending(rt, workflow_id, "HUMAN_REVIEW_WAIT")
    if body.packet != state["packet"]:
        raise HTTPException(409, "Stale review packet")
    review = rt.audit.read_json(case, "review", body.packet)
    if rt.audit.read_json(case, "source", review["source"]).get("initiator") == actor:
        raise HTTPException(403, "Independent reviewer required")
    signature = rt.audit.json(case, "signature", {"reviewer": actor, "packet": body.packet,
        "time": datetime.now(timezone.utc).isoformat()})
    await handle.signal("sign", args=[body.packet, signature])
    return {"received": True}
