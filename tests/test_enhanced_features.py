import base64
import os
import pytest
from httpx import AsyncClient, ASGITransport
from app.api.main import app
from app.domain.scholarships.client import ScholarshipRegistryClient
from app.domain.scholarships.ocr import extract_dual_documents
from app.domain.browser.solvers import ObstacleSolver


@pytest.mark.asyncio
async def test_sample_documents_endpoint():
    """Verify sample document PDF retrieval for live multimodal OCR."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/v1/schemes/sample-documents/first_gen_stem")
        assert resp.status_code == 200
        data = resp.json()
        assert data["persona_id"] == "first_gen_stem"
        assert data["transcript_file_name"] == "Academic_Marksheet_Aarav_Sharma.pdf"
        assert len(data["transcript_content"]) > 100
        assert len(data["income_content"]) > 100

        # Decode content to verify valid PDF stream
        t_bytes = base64.b64decode(data["transcript_content"])
        assert t_bytes.startswith(b"%PDF-")


@pytest.mark.asyncio
async def test_bounding_boxes_in_dual_documents():
    """Verify visual grounding bounding boxes are populated in dual document extraction."""
    t_text = (
        "OFFICIAL ACADEMIC TRANSCRIPT\n"
        "Student Name: Aarav Sharma\n"
        "Roll No: 2024CS-1092\n"
        "CGPA: 3.85\n"
        "Percentage: 82.5%\n"
    )
    i_text = (
        "GOVERNMENT OF KARNATAKA - REVENUE DEPARTMENT\n"
        "Applicant Name: Aarav Sharma\n"
        "Certificate Number: REV/INC/2026/8819\n"
        "Total Annual Household Income: Rs. 1,80,000\n"
    )
    result = extract_dual_documents(
        t_text.encode("utf-8"), "transcript.txt",
        i_text.encode("utf-8"), "income.txt"
    )
    assert result.sufficiency_score >= 0.8
    assert result.bounding_boxes is not None
    assert "transcript" in result.bounding_boxes
    assert "income_certificate" in result.bounding_boxes
    assert "gpa" in result.bounding_boxes["transcript"]
    assert "annual_income" in result.bounding_boxes["income_certificate"]


@pytest.mark.asyncio
async def test_live_data_gov_sync_digest():
    """Verify Data.gov.in synchronization returns cryptographic provenance digest."""
    client = ScholarshipRegistryClient()
    res = await client.sync_live_schemes()
    assert res["status"] in ("LIVE_SYNC_SUCCESS", "DATABASE_ACTIVE")
    assert len(res["digest"]) >= 16
    assert res["schemes_count"] >= 5
