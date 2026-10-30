import pytest
from app.domain.citizen.schemas import CitizenProfile
from app.domain.scholarships.client import ScholarshipRegistryClient, OFFICIAL_SCHOLARSHIP_CATALOG
from app.domain.scholarships.ocr import (
    extract_transcript_data,
    extract_income_certificate_data,
    extract_dual_documents,
)


@pytest.mark.asyncio
async def test_scholarship_catalog_loading():
    client = ScholarshipRegistryClient()
    schemes = await client.fetch_live_schemes()
    assert len(schemes) >= 5
    scheme_ids = [s.id for s in schemes]
    assert "central_sector_college" in scheme_ids
    assert "aicte_pragati_girls" in scheme_ids
    assert "post_matric_sc_st" in scheme_ids


@pytest.mark.asyncio
async def test_eligibility_evaluation_merit_means():
    client = ScholarshipRegistryClient()

    # Eligible candidate for Central Sector
    student = CitizenProfile(
        full_name="Aarav Sharma",
        date_of_birth="2003-05-12",
        national_id="AADHAAR-9012-3456-7890",
        email="aarav.sharma@university.edu.in",
        phone="+91-9876543210",
        address_street="14 MG Road",
        address_city="Bengaluru",
        address_state="Karnataka",
        address_zip="560001",
        income_annual=300000.0,
        household_size=4,
        attributes={"gpa": 3.85, "category": "GENERAL"}
    )

    results = await client.match_all_schemes(student)
    assert len(results) > 0

    # Top result should be Central Sector
    central_match = next(r for r in results if r.scheme.id == "central_sector_college")
    assert central_match.is_eligible is True
    assert central_match.eligibility_score == 1.0


@pytest.mark.asyncio
async def test_eligibility_evaluation_income_exceeded():
    client = ScholarshipRegistryClient()

    # Ineligible candidate due to high income
    wealthy_student = CitizenProfile(
        full_name="Rohan Verma",
        date_of_birth="2002-11-20",
        national_id="AADHAAR-1111-2222-3333",
        email="rohan@techcorp.in",
        phone="+91-9876543211",
        address_street="45 Marine Drive",
        address_city="Mumbai",
        address_state="Maharashtra",
        address_zip="400020",
        income_annual=1500000.0,  # 15 Lakhs
        household_size=3,
        attributes={"gpa": 3.95, "category": "GENERAL"}
    )

    results = await client.match_all_schemes(wealthy_student)
    central_match = next(r for r in results if r.scheme.id == "central_sector_college")
    assert central_match.is_eligible is False
    assert any("exceeds statutory ceiling" in reason for reason in central_match.missing_criteria)


def test_transcript_ocr_extraction():
    sample_transcript = b"""
    OFFICIAL ACADEMIC RECORD
    Student Name: Eleanor Vance
    Roll No: 2024CS-9812
    University: National Institute of Technology
    Department: Computer Science and Engineering
    Grade Point Average: 3.92
    Percentage: 92.5%
    Date of Issue: 2026-05-15
    """

    extracted = extract_transcript_data(sample_transcript, "transcript.txt")
    assert extracted.student_name == "Eleanor Vance"
    assert extracted.roll_number == "2024CS-9812"
    assert extracted.gpa == 3.92
    assert extracted.percentage == 92.5
    assert "Computer Science" in (extracted.major or "")


def test_income_certificate_ocr_and_dual_extraction():
    sample_transcript = b"""
    OFFICIAL ACADEMIC RECORD
    Student Name: Eleanor Vance
    Roll No: 2024CS-9812
    University: National Institute of Technology
    Department: Computer Science and Engineering
    Grade Point Average: 3.92
    Percentage: 92.5%
    Date of Issue: 2026-05-15
    """

    sample_income_cert = b"""
    GOVERNMENT OF KARNATAKA - REVENUE DEPARTMENT
    INCOME CERTIFICATE
    Certificate Number: REV/INC/2026/9821
    Date of Issue: 2026-01-10
    Certified that Applicant Name: Eleanor Vance
    Daughter of: Arthur Vance
    Annual Family Income: Rs. 1,80,000
    District: Bangalore Urban
    State: Karnataka
    Issuing Authority: Office of the Tahsildar
    """

    income_res = extract_income_certificate_data(sample_income_cert, "income_cert.txt")
    assert income_res.certificate_number == "REV/INC/2026/9821"
    assert income_res.annual_income == 180000.0
    assert income_res.applicant_name == "Eleanor Vance"
    assert income_res.state == "Karnataka"

    dual_res = extract_dual_documents(
        sample_transcript, "transcript.txt",
        sample_income_cert, "income_cert.txt"
    )
    assert dual_res.name_match is True
    assert dual_res.verified_income == 180000.0
    assert dual_res.verified_gpa == 3.92
    assert dual_res.sufficiency_score >= 0.9
    assert dual_res.auto_populated_profile["full_name"] == "Eleanor Vance"
    assert dual_res.auto_populated_profile["income_annual"] == 180000.0
    assert dual_res.auto_populated_profile["address_state"] == "Karnataka"

