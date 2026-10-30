import base64
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field

from app.domain.citizen.schemas import CitizenProfile
from app.domain.scholarships.client import ScholarshipRegistryClient
from app.domain.scholarships.schemas import ScholarshipScheme, SchemeMatchResult, TranscriptExtractionResult
from app.domain.scholarships.ocr import extract_transcript_data

router = APIRouter(tags=["schemes"])


class TranscriptUploadRequest(BaseModel):
    file_name: str = Field(min_length=1)
    content: str = Field(description="Base64 encoded PDF or raw text payload")


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
