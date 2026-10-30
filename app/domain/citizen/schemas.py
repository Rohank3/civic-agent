from typing import Annotated, Any, Literal
from pydantic import BaseModel, ConfigDict, Field, StringConstraints

Text = Annotated[str, StringConstraints(min_length=1, strip_whitespace=True)]


class Strict(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)


class SupportingDocument(BaseModel):
    name: str = Field(min_length=1, max_length=160, pattern=r"^[^/\\]+$")
    kind: Literal["text", "pdf", "image"]
    content: str = Field(description="Raw text or Base64 encoded payload for PDF/images")


class CitizenProfile(BaseModel):
    full_name: str = Field(min_length=1, max_length=120)
    date_of_birth: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$", description="ISO 8601 YYYY-MM-DD")
    national_id: str = Field(min_length=4, max_length=50, description="SSN, National ID, or State ID")
    email: str = Field(pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    phone: str = Field(min_length=7, max_length=25)
    address_street: str = Field(min_length=1, max_length=200)
    address_city: str = Field(min_length=1, max_length=100)
    address_state: str = Field(min_length=1, max_length=50)
    address_zip: str = Field(min_length=3, max_length=20)
    income_annual: float | None = Field(default=None, ge=0.0)
    household_size: int | None = Field(default=None, ge=1)
    attributes: dict[str, Any] = Field(default_factory=dict, description="Extensible bag for service-specific fields")


class ServiceRequest(BaseModel):
    service_id: str = Field(min_length=1, max_length=100, description="Unique identifier for the public service")
    portal_url: str = Field(min_length=1)
    profile: CitizenProfile
    documents: list[SupportingDocument] = Field(default_factory=list, max_length=50)
    target_fields: dict[str, Any] = Field(default_factory=dict, description="Service-specific parameters")
    require_review: bool = Field(default=False, description="Pause for explicit citizen sign-off prior to submission")
    credentials_ref: str | None = Field(default=None, description="Vault secret path for pre-configured credentials")


class TrackingReceipt(BaseModel):
    case_id: str
    service_id: str
    tracking_number: str
    timestamp: str
    portal_url: str
    status: str
    receipt_artifact_digest: str
    screenshot_artifact_digest: str
    details: dict[str, Any] = Field(default_factory=dict)
