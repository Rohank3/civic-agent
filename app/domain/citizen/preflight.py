import base64
from datetime import date, datetime
import re
from typing import Any
from pydantic import BaseModel, Field

from app.domain.citizen.schemas import ServiceRequest


class PreflightReport(BaseModel):
    is_ready: bool = Field(description="True if application satisfies all mandatory criteria to proceed")
    service_id: str
    sufficiency_score: float = Field(ge=0.0, le=1.0, description="Normalized completeness score")
    missing_mandatory_fields: list[str] = Field(default_factory=list)
    missing_recommended_documents: list[str] = Field(default_factory=list)
    document_issues: list[dict[str, Any]] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)


def calculate_age(dob_str: str) -> int | None:
    try:
        born = datetime.strptime(dob_str, "%Y-%m-%d").date()
        today = date.today()
        return today.year - born.year - ((today.month, today.day) < (born.month, born.day))
    except Exception:
        return None


def run_preflight_check(request: ServiceRequest) -> PreflightReport:
    """Pre-flight evaluation of profile completeness, eligibility rules, and document integrity."""
    missing_fields = []
    missing_docs = []
    doc_issues = []
    warnings = []

    profile = request.profile
    service = request.service_id.lower()

    # 1. Profile Field Checks
    core_fields = {
        "full_name": profile.full_name,
        "date_of_birth": profile.date_of_birth,
        "national_id": profile.national_id,
        "email": profile.email,
        "phone": profile.phone,
        "address_street": profile.address_street,
        "address_city": profile.address_city,
        "address_state": profile.address_state,
        "address_zip": profile.address_zip
    }
    for field_name, val in core_fields.items():
        if not val or not str(val).strip():
            missing_fields.append(field_name)

    # Validate age
    age = calculate_age(profile.date_of_birth)
    if age is None:
        missing_fields.append("valid_date_of_birth")
    elif age < 0 or age > 130:
        warnings.append(f"Unusual applicant age detected ({age} years old)")

    # 2. Service Specific Heuristics
    doc_names = [d.name.lower() for d in request.documents]

    if any(k in service for k in ("scholarship", "student", "tuition", "education")):
        if not any(k in profile.attributes for k in ("gpa", "major", "student_id", "institution")):
            warnings.append("No academic attributes (GPA, major, or institution) provided in profile.attributes")
        if not any("transcript" in name or "academic" in name or "grade" in name for name in doc_names):
            missing_docs.append("Academic Transcript / Proof of Enrollment (PDF)")

    if any(k in service for k in ("subsidy", "benefit", "claim", "assistance", "medicaid")):
        if profile.income_annual is None:
            missing_fields.append("income_annual")
        if profile.household_size is None:
            missing_fields.append("household_size")
        if not any(k in name for name in doc_names for k in ("income", "tax", "w2", "paystub", "proof")):
            missing_docs.append("Proof of Income / Tax Return (PDF)")

    if any(k in service for k in ("license", "renewal", "permit", "driving")):
        if not any(k in profile.attributes for k in ("license_number", "permit_id", "previous_license")):
            warnings.append("No existing license_number or permit_id provided in profile.attributes")

    # 3. Document Integrity Checks
    seen_names = set()
    for idx, doc in enumerate(request.documents):
        clean_name = doc.name.lower()
        if clean_name in seen_names:
            doc_issues.append({"document_index": idx, "name": doc.name, "issue": "DUPLICATE_NAME"})
        seen_names.add(clean_name)

        if doc.kind in ("pdf", "image"):
            try:
                raw_bytes = base64.b64decode(doc.content, validate=True)
                if len(raw_bytes) < 10:
                    doc_issues.append({"document_index": idx, "name": doc.name, "issue": "EMPTY_PAYLOAD"})
                elif doc.kind == "pdf" and not raw_bytes.startswith(b"%PDF-"):
                    doc_issues.append({"document_index": idx, "name": doc.name, "issue": "CORRUPT_OR_NON_PDF_HEADER"})
            except Exception:
                doc_issues.append({"document_index": idx, "name": doc.name, "issue": "INVALID_BASE64_ENCODING"})
        elif doc.kind == "text":
            if not doc.content.strip():
                doc_issues.append({"document_index": idx, "name": doc.name, "issue": "EMPTY_TEXT_PAYLOAD"})

    # 4. Sufficiency Scoring
    total_checks = len(core_fields) + (1 if missing_docs else 0) + (1 if doc_issues else 0)
    failed_checks = len(missing_fields) + len(doc_issues)
    score = max(0.0, min(1.0, 1.0 - (failed_checks / max(1, total_checks))))

    is_ready = len(missing_fields) == 0 and len(doc_issues) == 0

    return PreflightReport(
        is_ready=is_ready,
        service_id=request.service_id,
        sufficiency_score=round(score, 2),
        missing_mandatory_fields=missing_fields,
        missing_recommended_documents=missing_docs,
        document_issues=doc_issues,
        warnings=warnings
    )
