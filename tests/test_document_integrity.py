import base64
import io
import pytest
from httpx import AsyncClient, ASGITransport
from pypdf import PdfWriter

from app.api.main import app
from app.domain.citizen.schemas import CitizenProfile, ServiceRequest
from app.domain.scholarships.ocr import audit_pdf_integrity, extract_dual_documents


def create_minimal_pdf(producer: str = "Skia/PDF m156", creator: str = "Chromium", extra_eof: bool = False) -> bytes:
    writer = PdfWriter()
    writer.add_blank_page(width=100, height=100)
    writer.add_metadata({
        "/Producer": producer,
        "/Creator": creator,
        "/CreationDate": "D:20261031120000+00'00'",
        "/ModDate": "D:20261031120000+00'00'"
    })
    buf = io.BytesIO()
    writer.write(buf)
    data = buf.getvalue()
    if extra_eof:
        data += b"\n%%EOF\n"
    return data


def test_authentic_pdf_passes_integrity_check():
    clean_bytes = create_minimal_pdf(producer="Government Printing Engine", creator="e-District Portal")
    report = audit_pdf_integrity(clean_bytes, "authentic_certificate.pdf")
    assert report.quarantine_active is False
    assert report.tamper_score < 0.40
    assert report.status in ("CLEAN", "VERIFIED")
    assert report.recommended_action == "PROCEED"


def test_consumer_editor_triggers_tamper_quarantine():
    # Simulate a forged certificate edited in Canva / Photoshop
    tampered_bytes = create_minimal_pdf(producer="Adobe Photoshop CC 2024", creator="Canva Design Studio")
    report = audit_pdf_integrity(tampered_bytes, "tampered_income.pdf")
    assert report.quarantine_active is True
    assert report.tamper_score >= 0.40
    assert report.status == "TAMPER_SUSPECTED"
    assert report.recommended_action == "DIGILOCKER_PULL"
    assert any("Consumer editing software detected" in f for f in report.forensic_findings)


def test_incremental_byte_injection_triggers_tamper_quarantine():
    # Simulate post-issuance byte injection (multiple %%EOF markers)
    injected_bytes = create_minimal_pdf(extra_eof=True)
    report = audit_pdf_integrity(injected_bytes, "injected_marksheet.pdf")
    assert report.quarantine_active is True
    assert report.status == "TAMPER_SUSPECTED"
    assert any("Incremental PDF revision detected" in f for f in report.forensic_findings)


def test_dual_document_extraction_surfaces_quarantine_advisory():
    clean_transcript = create_minimal_pdf()
    forged_income = create_minimal_pdf(producer="ilovepdf.com Editor")

    res = extract_dual_documents(
        clean_transcript, "transcript.pdf",
        forged_income, "income.pdf"
    )
    assert res.integrity_report is not None
    assert res.integrity_report.quarantine_active is True
    assert res.integrity_report.status == "TAMPER_SUSPECTED"
    assert any("PRE-FLIGHT QUARANTINE" in w for w in res.warnings)


@pytest.mark.asyncio
async def test_execute_live_blocks_quarantined_document():
    tampered_bytes = create_minimal_pdf(producer="Adobe Photoshop 2024")
    b64_tampered = base64.b64encode(tampered_bytes).decode("ascii")

    profile = CitizenProfile(
        full_name="Attacker Bot",
        date_of_birth="2000-01-01",
        national_id="BOT-0000",
        email="bot@swarm.org",
        phone="9999999999",
        address_street="1 Dark Web Way",
        address_city="Nowhere",
        address_state="Karnataka",
        address_zip="560001",
        income_annual=10000.0,
        household_size=1
    )
    payload = {
        "service_id": "central_sector_college",
        "portal_url": "http://localhost:8000/portal/scholarship",
        "profile": profile.model_dump(),
        "documents": [
            {"name": "forged_income.pdf", "kind": "pdf", "content": b64_tampered}
        ]
    }

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post("/v1/services/execute-live", json=payload)
        assert resp.status_code == 403
        data = resp.json()
        assert "Execution blocked" in data["detail"]
        assert "Quarantine Active" in data["detail"]
        assert "DigiLocker" in data["detail"]
