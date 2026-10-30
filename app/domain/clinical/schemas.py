from typing import Annotated, Literal
from pydantic import BaseModel, ConfigDict, Field, StringConstraints


class Strict(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)


Text = Annotated[str, StringConstraints(min_length=1, strip_whitespace=True)]
Missing = Literal["MISSING_CLINICAL_EVIDENCE"]
MISSING = "MISSING_CLINICAL_EVIDENCE"


class Page(Strict):
    document_name: Text
    page_number: int = Field(ge=1)
    text: str


class Evidence(Strict):
    value: Text
    document_name: Text
    page_number: int = Field(ge=1)
    verbatim_quote: Text


Facts = Annotated[list[Evidence], Field(min_length=1)] | Missing


class ClinicalRecord(Strict):
    primary_icd10: Facts = MISSING
    secondary_icd10: Facts = MISSING
    cpt_hcpcs: Facts = MISSING
    rendering_npi: Facts = MISSING
    ordering_npi: Facts = MISSING
    conservative_therapies: Facts = MISSING
    duration_weeks: Facts = MISSING
    failed_medications: Facts = MISSING
    imaging_findings: Facts = MISSING
    functional_scores: Facts = MISSING
