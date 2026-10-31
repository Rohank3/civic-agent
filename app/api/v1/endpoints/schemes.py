import base64
import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field

from app.domain.citizen.schemas import CitizenProfile
from app.domain.scholarships.client import (
    ScholarshipRegistryClient,
    add_user_custom_scheme,
    add_user_custom_scheme_async,
    get_user_custom_schemes,
    delete_user_custom_scheme,
    delete_user_custom_scheme_async,
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


class CustomSchemeDeleteResponse(BaseModel):
    status: str
    scheme_id: str
    user_id: str


def normalize_portal_url(scheme: ScholarshipScheme, base_url: str) -> ScholarshipScheme:
    if "portal/scholarship" in scheme.portal_url:
        new_url = f"{base_url.rstrip('/')}/portal/scholarship"
        if scheme.portal_url != new_url:
            return scheme.model_copy(update={"portal_url": new_url})
    return scheme


@router.get("/schemes/list", response_model=list[ScholarshipScheme])
async def list_schemes(request: Request, user_id: str | None = None):
    """Retrieve all active statutory scholarship schemes, strictly including only the caller's custom schemes."""
    client = ScholarshipRegistryClient()
    schemes = await client.fetch_live_schemes(user_id=user_id)
    base = str(request.base_url)
    return [normalize_portal_url(s, base) for s in schemes]


@router.post("/schemes/match", response_model=list[SchemeMatchResult])
async def match_schemes(profile: CitizenProfile, request: Request, user_id: str | None = None):
    """Real-time matching engine: checks student profile against live statutory criteria and returns eligibility rankings."""
    client = ScholarshipRegistryClient()
    results = await client.match_all_schemes(profile, user_id=user_id)
    base = str(request.base_url)
    return [
        r.model_copy(update={"scheme": normalize_portal_url(r.scheme, base)})
        for r in results
    ]


@router.post("/schemes/sync")
async def sync_schemes(request: Request):
    """Live trigger synchronizing statutory catalog with official Data.gov.in API feed."""
    client = ScholarshipRegistryClient()
    return await client.sync_live_schemes()


@router.post("/schemes/custom", response_model=ScholarshipScheme)
async def create_custom_scheme(body: CustomSchemeCreateRequest, request: Request):
    """Register a custom portal/scheme isolated strictly to the calling user_id."""
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
    return await add_user_custom_scheme_async(scheme, body.user_id)


@router.delete("/schemes/custom/{scheme_id}", response_model=CustomSchemeDeleteResponse)
async def remove_custom_scheme(scheme_id: str, user_id: str):
    """Delete a custom scheme scoped strictly to the specified user."""
    success = await delete_user_custom_scheme_async(scheme_id, user_id)
    if not success:
        raise HTTPException(status_code=404, detail="Custom scheme not found for this user")
    return CustomSchemeDeleteResponse(status="DELETED", scheme_id=scheme_id, user_id=user_id)


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


class SampleDocumentPersonaResponse(BaseModel):
    persona_id: str
    transcript_file_name: str
    transcript_content: str
    income_file_name: str
    income_content: str


@router.get("/schemes/sample-documents/{persona_id}", response_model=SampleDocumentPersonaResponse)
async def get_sample_document_payloads(persona_id: str):
    """Retrieve raw PDF base64 payloads of authentic sample student documents for live multimodal AI verification."""
    base_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))), "sample_documents")
    
    if persona_id == "rural_merit":
        t_file = "Official_Transcript_Eleanor_Vance.pdf"
        i_file = "Statutory_Income_Certificate_Eleanor_Vance.pdf"
    else:
        t_file = "Academic_Marksheet_Aarav_Sharma.pdf"
        i_file = "Income_Certificate_Aarav_Sharma.pdf"

    t_path = os.path.join(base_dir, t_file)
    i_path = os.path.join(base_dir, i_file)

    if not os.path.exists(t_path) or not os.path.exists(i_path):
        raise HTTPException(status_code=404, detail="Sample documents not found on server disk")

    with open(t_path, "rb") as f:
        t_b64 = base64.b64encode(f.read()).decode("ascii")
    with open(i_path, "rb") as f:
        i_b64 = base64.b64encode(f.read()).decode("ascii")

    return SampleDocumentPersonaResponse(
        persona_id=persona_id,
        transcript_file_name=t_file,
        transcript_content=t_b64,
        income_file_name=i_file,
        income_content=i_b64
    )
