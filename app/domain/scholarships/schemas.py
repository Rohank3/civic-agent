from typing import Any, Literal
from pydantic import BaseModel, Field


class ScholarshipScheme(BaseModel):
    id: str = Field(description="Unique identifier of the scheme")
    name: str = Field(description="Official statutory scholarship title")
    ministry: str = Field(description="Department or Ministry administering the grant")
    level: Literal["undergraduate", "postgraduate", "secondary", "vocational", "all"]
    target_category: list[str] = Field(default_factory=lambda: ["ALL"], description="Eligible categories e.g. SC, ST, OBC, EWS, GENERAL, FEMALE")
    max_family_income: float = Field(description="Annual household income ceiling in INR/currency")
    min_gpa_or_percentage: float = Field(description="Minimum qualifying academic score e.g. 60.0% or 3.0 GPA")
    grant_amount_annual: float = Field(description="Annual financial grant benefit")
    application_deadline: str = Field(description="ISO 8601 closing date")
    portal_url: str = Field(description="Official portal entry point")
    required_documents: list[str] = Field(default_factory=list)
    description: str
    active: bool = True


class SchemeMatchResult(BaseModel):
    scheme: ScholarshipScheme
    is_eligible: bool
    eligibility_score: float = Field(ge=0.0, le=1.0, description="Match confidence score based on student attributes")
    reasons: list[str] = Field(default_factory=list)
    missing_criteria: list[str] = Field(default_factory=list)


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
