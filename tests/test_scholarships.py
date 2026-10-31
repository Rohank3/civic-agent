import pytest
from app.domain.citizen.schemas import CitizenProfile
from app.domain.scholarships.client import (
    ScholarshipRegistryClient,
    OFFICIAL_SCHOLARSHIP_CATALOG,
    add_user_custom_scheme,
    get_user_custom_schemes,
    delete_user_custom_scheme,
)
from app.domain.scholarships.schemas import ScholarshipScheme
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


@pytest.mark.asyncio
async def test_user_isolated_custom_schemes():
    client = ScholarshipRegistryClient()

    # User A adds custom scheme
    scheme_a = ScholarshipScheme(
        id="custom_portal_alice",
        name="Alice Private University Grant",
        ministry="Private Endowment",
        level="undergraduate",
        max_family_income=500000.0,
        min_gpa_or_percentage=70.0,
        grant_amount_annual=40000.0,
        application_deadline="2026-12-31",
        portal_url="https://alice-university.edu/grant",
        is_custom=True,
        user_id="user_alice_123",
        login_mode="credentials"
    )
    add_user_custom_scheme(scheme_a, "user_alice_123")

    # Fetch for Alice: should include custom scheme
    alice_schemes = await client.fetch_live_schemes(user_id="user_alice_123")
    alice_ids = [s.id for s in alice_schemes]
    assert "custom_portal_alice" in alice_ids

    # Fetch for Bob: should NOT include Alice's custom scheme
    bob_schemes = await client.fetch_live_schemes(user_id="user_bob_999")
    bob_ids = [s.id for s in bob_schemes]
    assert "custom_portal_alice" not in bob_ids

    # Anonymous / public fetch: should NOT include Alice's custom scheme
    public_schemes = await client.fetch_live_schemes(user_id=None)
    public_ids = [s.id for s in public_schemes]
    assert "custom_portal_alice" not in public_ids

    # Delete for Alice
    deleted = delete_user_custom_scheme("custom_portal_alice", "user_alice_123")
    assert deleted is True
    alice_after = await client.fetch_live_schemes(user_id="user_alice_123")
    assert "custom_portal_alice" not in [s.id for s in alice_after]


@pytest.mark.asyncio
async def test_different_scholarship_aicte_pragati_girls():
    """Verify checking AICTE Pragati Girls scholarship (different from central_sector_college)."""
    client = ScholarshipRegistryClient()

    # Eligible female candidate
    female_student = CitizenProfile(
        full_name="Kavya Nair",
        date_of_birth="2004-03-15",
        national_id="AADHAAR-4455-6677-8899",
        email="kavya.nair@engg.ac.in",
        phone="+91-9876543220",
        address_street="12 Lake View Road",
        address_city="Kochi",
        address_state="Kerala",
        address_zip="682001",
        income_annual=350000.0,
        household_size=4,
        attributes={"percentage": 85.0, "gender": "FEMALE", "category": "GENERAL"}
    )

    results = await client.match_all_schemes(female_student)
    pragati_match = next(r for r in results if r.scheme.id == "aicte_pragati_girls")
    assert pragati_match.is_eligible is True
    assert pragati_match.eligibility_score == 1.0
    assert any("women's educational reservation" in r.lower() or "aicte pragati" in r.lower() for r in pragati_match.reasons)

    # Ineligible male candidate for Pragati
    male_student = CitizenProfile(
        full_name="Arjun Menon",
        date_of_birth="2004-03-15",
        national_id="AADHAAR-4455-6677-8898",
        email="arjun.menon@engg.ac.in",
        phone="+91-9876543221",
        address_street="12 Lake View Road",
        address_city="Kochi",
        address_state="Kerala",
        address_zip="682001",
        income_annual=350000.0,
        household_size=4,
        attributes={"percentage": 85.0, "gender": "MALE", "category": "GENERAL"}
    )
    male_results = await client.match_all_schemes(male_student)
    pragati_male = next(r for r in male_results if r.scheme.id == "aicte_pragati_girls")
    assert pragati_male.is_eligible is False
    assert any("does not match target requirement" in m.lower() or "does not match scheme target" in m.lower() for m in pragati_male.missing_criteria)


@pytest.mark.asyncio
async def test_different_scholarship_post_matric_sc_st():
    """Verify checking Post-Matric SC/ST scholarship."""
    client = ScholarshipRegistryClient()

    sc_student = CitizenProfile(
        full_name="Deepak Kamble",
        date_of_birth="2003-09-10",
        national_id="AADHAAR-2233-4455-6677",
        email="deepak.k@polytechnic.edu.in",
        phone="+91-9876543230",
        address_street="Station Road",
        address_city="Nagpur",
        address_state="Maharashtra",
        address_zip="440001",
        income_annual=180000.0,
        household_size=5,
        attributes={"percentage": 65.0, "category": "SC"}
    )

    results = await client.match_all_schemes(sc_student)
    sc_match = next(r for r in results if r.scheme.id == "post_matric_sc_st")
    assert sc_match.is_eligible is True
    assert sc_match.eligibility_score == 1.0


@pytest.mark.asyncio
async def test_different_scholarship_ishan_uday_ner():
    """Verify checking Ishan Uday North Eastern Region quota scholarship."""
    client = ScholarshipRegistryClient()

    # Eligible candidate domiciled in Assam
    ner_student = CitizenProfile(
        full_name="Tenzing Laskar",
        date_of_birth="2003-12-05",
        national_id="AADHAAR-3344-5566-7788",
        email="tenzing@guwahati-univ.ac.in",
        phone="+91-9876543240",
        address_street="Brahmaputra Lane",
        address_city="Guwahati",
        address_state="Assam",
        address_zip="781001",
        income_annual=220000.0,
        household_size=4,
        attributes={"percentage": 72.0, "category": "GENERAL"}
    )

    results = await client.match_all_schemes(ner_student)
    ishan_match = next(r for r in results if r.scheme.id == "ishan_uday_ner")
    assert ishan_match.is_eligible is True
    assert ishan_match.eligibility_score == 1.0


@pytest.mark.asyncio
async def test_live_web_scraper_subagent():
    """Verify live web scraper subagent fetches and parses actual scholarships from official website."""
    from app.domain.scholarships.subagents.web_scraper import ScholarshipScraperSubagent
    scraper = ScholarshipScraperSubagent()
    schemes, digest = await scraper.fetch_live_schemes_from_web()
    assert isinstance(schemes, list)
    if digest:
        # If live internet was reachable, verify real scraped schemes
        assert len(schemes) >= 10
        titles = [s.name.lower() for s in schemes]
        assert any("pragati" in t for t in titles)
        assert any("aicte" in t or "scholarship" in t for t in titles)


def test_dynamic_portal_generation_distinct_per_scheme():
    """Verify dynamic portal generator produces unique, scheme-tailored HTML with zero hardcoded dummy names."""
    from app.domain.scholarships.subagents.portal_generator import DynamicPortalSubagent

    # Pragati portal
    pragati_scheme = ScholarshipScheme(
        id="aicte_pragati_girls",
        name="AICTE Pragati Scholarship Scheme for Girl Students",
        ministry="All India Council for Technical Education (AICTE)",
        level="undergraduate",
        target_category=["FEMALE"],
        max_family_income=800000.0,
        min_gpa_or_percentage=60.0,
        grant_amount_annual=50000.0,
        application_deadline="2026-12-15",
        portal_url="https://scholarships.gov.in"
    )
    pragati_html = DynamicPortalSubagent.render_portal_html(pragati_scheme)
    assert "AICTE Pragati" in pragati_html
    assert "college_admission_letter" in pragati_html
    assert "tuition_fee_receipt" in pragati_html
    assert "Eleanor Vance" not in pragati_html

    # Post-Matric SC/ST portal
    sc_scheme = ScholarshipScheme(
        id="post_matric_sc_st",
        name="Post-Matric Scholarship for SC/ST Candidates",
        ministry="Ministry of Social Justice and Empowerment",
        level="undergraduate",
        target_category=["SC", "ST"],
        max_family_income=250000.0,
        min_gpa_or_percentage=50.0,
        grant_amount_annual=35000.0,
        application_deadline="2026-11-30",
        portal_url="https://scholarships.gov.in"
    )
    sc_html = DynamicPortalSubagent.render_portal_html(sc_scheme)
    assert "Post-Matric" in sc_html
    assert "caste_cert_no" in sc_html
    assert "caste_proof" in sc_html
    assert "Eleanor Vance" not in sc_html


@pytest.mark.asyncio
async def test_batch_application_subagent():
    """Verify batch application subagent orchestrates multiple eligible schemes."""
    from app.domain.scholarships.subagents.batch_orchestrator import BatchApplicationSubagent

    batch_subagent = BatchApplicationSubagent()
    student = CitizenProfile(
        full_name="Kavya Nair",
        date_of_birth="2004-03-15",
        national_id="AADHAAR-4455-6677-8899",
        email="kavya@engg.ac.in",
        phone="+91-9876543220",
        address_street="12 Lake View Road",
        address_city="Kochi",
        address_state="Kerala",
        address_zip="682001",
        income_annual=200000.0,
        household_size=4,
        attributes={"percentage": 90.0, "gender": "FEMALE", "category": "GENERAL"}
    )

    client = ScholarshipRegistryClient()
    schemes = await client.fetch_live_schemes()
    eligible = batch_subagent.get_eligible_schemes(student, schemes)
    # Student is eligible for both Pragati Girls AND Central Sector College
    eligible_ids = [e.scheme.id for e in eligible]
    assert "aicte_pragati_girls" in eligible_ids
    assert "central_sector_college" in eligible_ids

    executed_records = []
    async def mock_execute(scheme, prof):
        record = {
            "tracking_number": f"TEST-TRACK-{scheme.id[:6].upper()}-001",
            "sha256_hash": "mockhash123",
            "scheme_id": scheme.id
        }
        executed_records.append(record)
        return record

    results = await batch_subagent.run_batch_application_plan(student, schemes, mock_execute)
    assert len(results) >= 2
    assert all(r["status"] == "SUCCESS" for r in results)



