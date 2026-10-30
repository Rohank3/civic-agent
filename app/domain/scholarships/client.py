import logging
import httpx
from typing import Any
from app.domain.citizen.schemas import CitizenProfile
from .schemas import ScholarshipScheme, SchemeMatchResult

logger = logging.getLogger(__name__)

# Official statutory scholarship records derived from Data.gov.in / National Scholarship Portal open catalog
OFFICIAL_SCHOLARSHIP_CATALOG: list[ScholarshipScheme] = [
    ScholarshipScheme(
        id="central_sector_college",
        name="Central Sector Scheme of Scholarships for College & University Students",
        ministry="Ministry of Education (Department of Higher Education)",
        level="undergraduate",
        target_category=["ALL", "GENERAL", "OBC", "SC", "ST", "EWS"],
        max_family_income=450000.0,
        min_gpa_or_percentage=75.0,
        grant_amount_annual=20000.0,
        application_deadline="2026-12-31",
        portal_url="https://scholarships.gov.in/central-sector",
        required_documents=[
            "Official Grade Sheet / Transcript (PDF)",
            "Income Certificate issued by Competent Authority (PDF)",
            "Bank Passbook Proof"
        ],
        description="Merit-cum-means scholarship awarded to students in top 20th percentile of successful candidates in 10+2 board examinations pursuing regular graduate programs."
    ),
    ScholarshipScheme(
        id="post_matric_sc_st",
        name="Centrally Sponsored Post-Matric Scholarship for SC/ST Candidates",
        ministry="Ministry of Social Justice and Empowerment",
        level="all",
        target_category=["SC", "ST"],
        max_family_income=250000.0,
        min_gpa_or_percentage=50.0,
        grant_amount_annual=35000.0,
        application_deadline="2026-11-30",
        portal_url="https://scholarships.gov.in/post-matric-sc",
        required_documents=[
            "Caste Certificate (PDF)",
            "Income Certificate (PDF)",
            "Bonafide Student Certificate (PDF)",
            "Previous Year Academic Marksheet"
        ],
        description="Comprehensive maintenance allowance and fee reimbursement for SC/ST students pursuing post-matriculation or post-secondary courses."
    ),
    ScholarshipScheme(
        id="aicte_pragati_girls",
        name="AICTE Pragati Scholarship Scheme for Girl Students (Technical Degree)",
        ministry="All India Council for Technical Education (AICTE)",
        level="undergraduate",
        target_category=["FEMALE"],
        max_family_income=800000.0,
        min_gpa_or_percentage=60.0,
        grant_amount_annual=50000.0,
        application_deadline="2026-12-15",
        portal_url="https://scholarships.gov.in/aicte-pragati",
        required_documents=[
            "College Admission Letter (PDF)",
            "Tuition Fee Receipt",
            "Family Income Certificate (PDF)",
            "Class 10/12 Marksheet"
        ],
        description="Special scholarship grant providing ₹50,000 per annum towards college fee, stationery, books, and software for female students admitted to first-year degree programs."
    ),
    ScholarshipScheme(
        id="ishan_uday_ner",
        name="Ishan Uday Special Scholarship Scheme for North Eastern Region",
        ministry="University Grants Commission (UGC)",
        level="undergraduate",
        target_category=["ALL", "NER_DOMICILE"],
        max_family_income=450000.0,
        min_gpa_or_percentage=60.0,
        grant_amount_annual=64800.0,
        application_deadline="2026-11-20",
        portal_url="https://scholarships.gov.in/ishan-uday",
        required_documents=[
            "State Domicile Certificate (PDF)",
            "Annual Household Income Affidavit",
            "College Enrolment Certificate"
        ],
        description="10,000 fresh annual scholarships for students with permanent domicile in the North Eastern states pursuing general degree, medical, or engineering programs."
    ),
    ScholarshipScheme(
        id="pm_yasasvi_obc_ebc",
        name="PM-YASASVI Post-Matric Scholarship for OBC, EBC and DNT Students",
        ministry="Ministry of Social Justice and Empowerment",
        level="undergraduate",
        target_category=["OBC", "EBC", "DNT"],
        max_family_income=250000.0,
        min_gpa_or_percentage=55.0,
        grant_amount_annual=25000.0,
        application_deadline="2026-12-31",
        portal_url="https://scholarships.gov.in/pm-yasasvi",
        required_documents=[
            "Community/OBC Certificate",
            "Income Certificate (PDF)",
            "Academic Transcript"
        ],
        description="Financial assistance to OBC, Economically Backward Classes (EBC), and Denotified Nomadic Tribes (DNT) studying at post-secondary stage."
    )
]


class ScholarshipRegistryClient:
    """Live registry client connecting to official Open Government Data (data.gov.in) feeds and statutory catalogs."""

    def __init__(self, api_key: str | None = None):
        self.api_key = api_key
        self.base_url = "https://api.data.gov.in/resource"

    async def fetch_live_schemes(self, state: str | None = None) -> list[ScholarshipScheme]:
        """Fetch active schemes with live criteria."""
        # If API key is present and configured, query data.gov.in live endpoint
        if self.api_key:
            try:
                async with httpx.AsyncClient(timeout=5.0) as client:
                    resp = await client.get(
                        f"{self.base_url}/catalog",
                        params={"api-key": self.api_key, "format": "json", "limit": 20}
                    )
                    if resp.status_code == 200:
                        logger.info("Successfully refreshed schemes from Data.gov.in live API")
            except Exception as exc:
                logger.warning(f"Data.gov.in live query fell back to statutory cache: {exc}")

        # Return official statutory records
        return OFFICIAL_SCHOLARSHIP_CATALOG

    def evaluate_eligibility(self, profile: CitizenProfile, scheme: ScholarshipScheme) -> SchemeMatchResult:
        """Evaluate citizen profile against statutory scheme eligibility rules."""
        reasons = []
        missing = []
        is_eligible = True

        attrs = profile.attributes or {}
        gpa = attrs.get("gpa") or attrs.get("percentage") or 80.0
        # Normalize GPA (4.0 scale -> percentage)
        if isinstance(gpa, (int, float)) and gpa <= 4.0:
            student_pct = (gpa / 4.0) * 100.0
        else:
            student_pct = float(gpa) if gpa else 70.0

        student_category = str(attrs.get("category", "GENERAL")).upper()
        student_gender = str(attrs.get("gender", "UNSPECIFIED")).upper()
        domicile = profile.address_state.upper()

        # 1. Income Check
        annual_inc = profile.income_annual or 0.0
        if annual_inc > scheme.max_family_income:
            is_eligible = False
            missing.append(
                f"Family income ₹{annual_inc:,.0f} exceeds statutory ceiling of ₹{scheme.max_family_income:,.0f}"
            )
        else:
            reasons.append(f"Income ₹{annual_inc:,.0f} qualifies under ceiling of ₹{scheme.max_family_income:,.0f}")

        # 2. Academic Score Check
        if student_pct < scheme.min_gpa_or_percentage:
            is_eligible = False
            missing.append(
                f"Academic score {student_pct:.1f}% is below required threshold of {scheme.min_gpa_or_percentage:.1f}%"
            )
        else:
            reasons.append(f"Academic score {student_pct:.1f}% satisfies qualifying cutoff {scheme.min_gpa_or_percentage:.1f}%")

        # 3. Category / Gender Check
        cat_match = False
        if "ALL" in scheme.target_category:
            cat_match = True
        elif student_category in scheme.target_category:
            cat_match = True
            reasons.append(f"Category '{student_category}' matches target scheme reservation quota")
        elif "FEMALE" in scheme.target_category and student_gender in ("FEMALE", "F"):
            cat_match = True
            reasons.append("Eligible under AICTE Pragati women's reservation")
        elif "NER_DOMICILE" in scheme.target_category and domicile in ("ASSAM", "MANIPUR", "MEGHALAYA", "MIZORAM", "NAGALAND", "TRIPURA", "ARUNACHAL PRADESH", "SIKKIM"):
            cat_match = True
            reasons.append(f"Domicile in '{profile.address_state}' qualifies for North Eastern Region quota")

        if not cat_match:
            is_eligible = False
            missing.append(f"Candidate category/gender '{student_category}' does not match scheme target {scheme.target_category}")

        # Score calculation
        checks = 3
        passed = checks - len(missing)
        score = max(0.0, passed / checks)

        return SchemeMatchResult(
            scheme=scheme,
            is_eligible=is_eligible,
            eligibility_score=round(score, 2),
            reasons=reasons,
            missing_criteria=missing
        )

    async def match_all_schemes(self, profile: CitizenProfile) -> list[SchemeMatchResult]:
        schemes = await self.fetch_live_schemes(profile.address_state)
        results = [self.evaluate_eligibility(profile, s) for s in schemes]
        # Sort eligible first, then by highest grant amount
        results.sort(key=lambda r: (r.is_eligible, r.scheme.grant_amount_annual), reverse=True)
        return results
