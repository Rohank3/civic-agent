from typing import Any, Literal
from pydantic import BaseModel, ConfigDict, Field, model_validator


class ScholarshipScheme(BaseModel):
    id: str = Field(description="Unique identifier of the scheme")
    name: str = Field(description="Official statutory scholarship title")
    ministry: str = Field(description="Department or Ministry administering the grant")
    level: Literal["undergraduate", "postgraduate", "secondary", "vocational", "all"] = "undergraduate"
    target_category: list[str] = Field(default_factory=lambda: ["ALL"], description="Eligible categories e.g. SC, ST, OBC, EWS, GENERAL, FEMALE")
    max_family_income: float = Field(description="Annual household income ceiling in INR/currency")
    min_gpa_or_percentage: float = Field(description="Minimum qualifying academic score e.g. 60.0% or 3.0 GPA")
    grant_amount_annual: float = Field(description="Annual financial grant benefit")
    application_deadline: str = Field(description="ISO 8601 closing date")
    portal_url: str = Field(description="Official portal entry point")
    required_documents: list[str] = Field(default_factory=list)
    description: str = ""
    active: bool = True
    is_custom: bool = False
    user_id: str | None = None
    login_mode: Literal["fresh_registration", "credentials", "sso"] = "fresh_registration"
    credentials_username: str | None = None
    credentials_password: str | None = None
    gazette_notification: str = ""
    scheme_code: str = ""
    verification_source_url: str = ""


class CustomSchemeCreateRequest(BaseModel):
    name: str = Field(min_length=2)
    ministry: str = Field(default="State / Institutional Department")
    level: Literal["undergraduate", "postgraduate", "secondary", "vocational", "all"] = "undergraduate"
    target_category: list[str] = Field(default_factory=lambda: ["ALL"])
    max_family_income: float = Field(default=350000.0)
    min_gpa_or_percentage: float = Field(default=60.0)
    grant_amount_annual: float = Field(default=30000.0)
    application_deadline: str = Field(default="2026-12-31")
    portal_url: str = Field(min_length=4)
    description: str = Field(default="User-defined custom portal scheme.")
    login_mode: Literal["fresh_registration", "credentials", "sso"] = "fresh_registration"
    credentials_username: str | None = None
    credentials_password: str | None = None
    user_id: str = Field(min_length=1, description="Strict owner identifier for user-level isolation")



class SchemeMatchResult(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    scheme: ScholarshipScheme
    is_eligible: bool
    eligibility_score: float = Field(default=0.0, ge=0.0, le=1.0, description="Match confidence score based on student attributes")
    reasons: list[str] = Field(default_factory=list)
    missing_criteria: list[str] = Field(default_factory=list)
    actionable_recommendations: list[str] = Field(default_factory=list)
    statutory_citation: str | None = None
    gazette_reference: str | None = None

    @model_validator(mode="before")
    @classmethod
    def _compat_aliases(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if "match_score" in data and "eligibility_score" not in data:
                data["eligibility_score"] = data["match_score"]
            if "eligible_reasons" in data and "reasons" not in data:
                data["reasons"] = data["eligible_reasons"]
        return data

    @property
    def match_score(self) -> float:
        return self.eligibility_score

    @property
    def eligible_reasons(self) -> list[str]:
        return self.reasons


class TranscriptExtractionResult(BaseModel):
    student_name: str | None = None
    roll_number: str | None = None
    institution: str | None = None
    gpa: float | None = None
    percentage: float | None = None
    major: str | None = None
    academic_year: str | None = None
    confidence: float = Field(default=0.9, ge=0.0, le=1.0)
    raw_text: str | None = None
    bounding_boxes: dict[str, Any] = Field(default_factory=dict, description="Visual grounding bounding boxes [ymin, xmin, ymax, xmax] for extracted fields")


class IncomeCertificateExtractionResult(BaseModel):
    certificate_number: str | None = None
    applicant_name: str | None = None
    parent_or_guardian_name: str | None = None
    annual_income: float | None = None
    currency: str = "INR"
    issuing_authority: str | None = None
    state: str | None = None
    district: str | None = None
    issue_date: str | None = None
    valid_until: str | None = None
    confidence: float = Field(default=0.9, ge=0.0, le=1.0)
    raw_text: str | None = None
    bounding_boxes: dict[str, Any] = Field(default_factory=dict, description="Visual grounding bounding boxes [ymin, xmin, ymax, xmax] for extracted fields")


class DocumentIntegrityReport(BaseModel):
    status: Literal["VERIFIED", "CLEAN", "TAMPER_SUSPECTED"] = "VERIFIED"
    quarantine_active: bool = False
    producer: str | None = None
    creator: str | None = None
    modification_divergence: bool = False
    has_digital_signature: bool = False
    forensic_findings: list[str] = Field(default_factory=list)
    tamper_score: float = Field(default=0.0, ge=0.0, le=1.0)
    recommended_action: Literal["PROCEED", "DIGILOCKER_PULL", "MANUAL_REVIEW"] = "PROCEED"


class DualDocumentExtractionResult(BaseModel):
    transcript: TranscriptExtractionResult
    income_certificate: IncomeCertificateExtractionResult
    name_match: bool = True
    verified_income: float | None = None
    verified_gpa: float | None = None
    sufficiency_score: float = Field(ge=0.0, le=1.0)
    warnings: list[str] = Field(default_factory=list)
    auto_populated_profile: dict[str, Any] = Field(default_factory=dict)
    integrity_report: DocumentIntegrityReport | None = None
    bounding_boxes: dict[str, Any] = Field(default_factory=dict, description="Consolidated visual grounding bounding boxes for preview highlights")

