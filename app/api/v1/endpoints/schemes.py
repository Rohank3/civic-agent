import base64
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field

from app.domain.citizen.schemas import CitizenProfile
from app.domain.scholarships.client import ScholarshipRegistryClient
from app.domain.scholarships.schemas import (
    ScholarshipScheme,
    SchemeMatchResult,
    TranscriptExtractionResult,
    DualDocumentExtractionResult,
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
async def list_schemes(request: Request):
    """Retrieve all active statutory scholarship schemes available across state and central registries."""
    client = ScholarshipRegistryClient()
    return await client.fetch_live_schemes()


@router.post("/schemes/match", response_model=list[SchemeMatchResult])
async def match_schemes(profile: CitizenProfile, request: Request):
    """Real-time matching engine: checks student profile against live statutory criteria and returns eligibility rankings."""
    client = ScholarshipRegistryClient()
    return await client.match_all_schemes(profile)


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

