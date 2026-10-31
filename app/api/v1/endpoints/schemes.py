import base64
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field

from app.domain.citizen.schemas import CitizenProfile
from app.domain.scholarships.client import (
    ScholarshipRegistryClient,
    add_user_custom_scheme,
    get_user_custom_schemes,
    delete_user_custom_scheme,
)
from app.domain.scholarships.schemas import (
    ScholarshipScheme,
    SchemeMatchResult,
    TranscriptExtractionResult,
    DualDocumentExtractionResult,
    CustomSchemeCreateRequest,
)
from app.domain.scholarships.ocr import extract_transcript_data, extract_dual_documents

router = APIRouter(tags=["schemes"])


class TranscriptUploadRequest(BaseModel):
    file_name: str = Field(min_length=1)
    content: str = Field(description="Base64 encoded PDF or raw text payload")


class DualDocumentUploadRequest(BaseModel):
    transcript_file_name: str = Field(default="transcript.pdf")
    transcript_content: str = Field(description="Base64 encoded PDF or text of academic transcript")
    income_file_name: str = Field(default="income_certificate.pdf")
    income_content: str = Field(description="Base64 encoded PDF or text of income certificate")


@router.get("/schemes/list", response_model=list[ScholarshipScheme])
async def list_schemes(request: Request, user_id: str | None = None):
    """Retrieve all active statutory scholarship schemes, strictly including only the caller's custom schemes."""
    client = ScholarshipRegistryClient()
    return await client.fetch_live_schemes(user_id=user_id)


@router.post("/schemes/match", response_model=list[SchemeMatchResult])
async def match_schemes(profile: CitizenProfile, request: Request, user_id: str | None = None):
    """Real-time matching engine: checks student profile against live statutory criteria and returns eligibility rankings."""
    client = ScholarshipRegistryClient()
    return await client.match_all_schemes(profile, user_id=user_id)


@router.post("/schemes/sync")
async def sync_schemes(request: Request):
    """Live trigger synchronizing statutory catalog with official Data.gov.in API feed."""
    client = ScholarshipRegistryClient()
    return await client.sync_live_schemes()


@router.post("/schemes/custom", response_model=ScholarshipScheme)
async def create_custom_scheme(body: CustomSchemeCreateRequest, request: Request):
    """Register a custom portal/scheme isolated strictly to the calling user_id."""
    import uuid
    scheme_id = f"custom_{uuid.uuid4().hex[:8]}"
    scheme = ScholarshipScheme(
        id=scheme_id,
        name=body.name,
        ministry=body.ministry,
        level=body.level,
        target_category=body.target_category,
        max_family_income=body.max_family_income,
        min_gpa_or_percentage=body.min_gpa_or_percentage,
        grant_amount_annual=body.grant_amount_annual,
        application_deadline=body.application_deadline,
        portal_url=body.portal_url,
        description=body.description,
        active=True,
        is_custom=True,
        user_id=body.user_id,
        login_mode=body.login_mode,
        credentials_username=body.credentials_username,
        credentials_password=body.credentials_password,
    )
    return add_user_custom_scheme(scheme, body.user_id)


@router.delete("/schemes/custom/{scheme_id}")
async def remove_custom_scheme(scheme_id: str, user_id: str):
    """Delete a custom scheme scoped strictly to the specified user."""
    success = delete_user_custom_scheme(scheme_id, user_id)
    if not success:
        raise HTTPException(status_code=404, detail="Custom scheme not found for this user")
    return {"status": "DELETED", "scheme_id": scheme_id, "user_id": user_id}



@router.post("/schemes/ocr-transcript", response_model=TranscriptExtractionResult)
async def ocr_transcript(body: TranscriptUploadRequest):
    """Extract academic GPA, roll number, and institution from student transcript payload."""
    try:
        raw_bytes = base64.b64decode(body.content, validate=True)
    except Exception:
        raw_bytes = body.content.encode("utf-8")

    result = extract_transcript_data(raw_bytes, body.file_name)
    return result


@router.post("/schemes/ocr-dual-documents", response_model=DualDocumentExtractionResult)
async def ocr_dual_documents(body: DualDocumentUploadRequest):
    """Jointly evaluate transcript and income certificate payloads with pre-flight cross-validation and profile auto-fill."""
    try:
        t_bytes = base64.b64decode(body.transcript_content, validate=True)
    except Exception:
        t_bytes = body.transcript_content.encode("utf-8")

    try:
        i_bytes = base64.b64decode(body.income_content, validate=True)
    except Exception:
        i_bytes = body.income_content.encode("utf-8")

    result = extract_dual_documents(
        t_bytes, body.transcript_file_name,
        i_bytes, body.income_file_name
    )
    return result

