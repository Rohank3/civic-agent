import os
import hashlib
from typing import Any
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.domain.citizen.schemas import CitizenProfile

router = APIRouter(tags=["citizen"])

# Persistent in-memory user registry & profile store
REGISTERED_CITIZENS_STORE: dict[str, dict[str, Any]] = {}
CITIZEN_PROFILE_STORE: dict[str, dict[str, Any]] = {}
CITIZEN_APPLICATIONS_STORE: dict[str, list[dict[str, Any]]] = {}


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


class MeriPehchaanConfigResponse(BaseModel):
    configured: bool
    client_id: str | None = None
    auth_url: str
    redirect_uri: str
    provider: str
    governing_body: str
    sandbox_mode: bool
    instructions: str


class CitizenRegisterRequest(BaseModel):
    username: str = Field(min_length=2, max_length=50)
    full_name: str = Field(min_length=2, max_length=120)
    email: str = Field(min_length=5, max_length=120)
    password: str = Field(min_length=4)
    national_id: str = Field(default="")
    address_state: str = Field(default="Karnataka")
    address_city: str = Field(default="")
    phone: str = Field(default="9876543210")
    income_annual: float = Field(default=180000.0)
    category: str = Field(default="GENERAL")


class CitizenLoginRequest(BaseModel):
    username: str
    password: str


@router.get("/auth/meripehchaan/config", response_model=MeriPehchaanConfigResponse)
async def get_meripehchaan_config():
    """Report MeriPehchaan / DigiLocker National SSO live configuration status."""
    client_id = os.environ.get("MERIPEHCHAAN_CLIENT_ID")
    client_secret = os.environ.get("MERIPEHCHAAN_CLIENT_SECRET")
    redirect_uri = os.environ.get("MERIPEHCHAAN_REDIRECT_URI", "http://localhost:5173/auth/meripehchaan/callback")
    auth_url = os.environ.get("MERIPEHCHAAN_AUTH_URL", "https://meripehchaan.gov.in/oauth2/authorize")

    is_configured = bool(client_id and client_secret)

    return MeriPehchaanConfigResponse(
        configured=is_configured,
        client_id=client_id if is_configured else None,
        auth_url=f"{auth_url}?client_id={client_id}&response_type=code&redirect_uri={redirect_uri}" if is_configured else auth_url,
        redirect_uri=redirect_uri,
        provider="MeriPehchaan (National Single Sign-On / NSSO)",
        governing_body="National Informatics Centre (NIC) / NeGD / MeitY",
        sandbox_mode=not is_configured,
        instructions=(
            "Live MeriPehchaan OAuth requires an NIC/NeGD-approved Service Provider Client ID & Secret. "
            "In local sandbox mode, citizen profiles authenticate directly with verified citizen inputs or DigiLocker documents."
        ),
    )


@router.post("/auth/register")
async def register_citizen(req: CitizenRegisterRequest):
    """Register a new citizen account and initialize their citizen profile."""
    uname_lower = req.username.lower().strip()
    if uname_lower in REGISTERED_CITIZENS_STORE:
        raise HTTPException(status_code=400, detail="An account with this username already exists.")

    user_id = f"user_{uname_lower}"
    hashed = hash_password(req.password)

    profile_dict = {
        "full_name": req.full_name.strip(),
        "date_of_birth": "2003-01-01",
        "national_id": req.national_id.strip() or f"ID-{uname_lower.upper()}",
        "email": req.email.strip(),
        "phone": req.phone.strip(),
        "address_street": "",
        "address_city": req.address_city.strip(),
        "address_state": req.address_state.strip(),
        "address_zip": "560001",
        "income_annual": req.income_annual,
        "household_size": 4,
        "category": req.category,
        "attributes": {},
    }

    user_dict = {
        "id": user_id,
        "username": req.username.strip(),
        "full_name": req.full_name.strip(),
        "email": req.email.strip(),
        "password_hash": hashed,
        "role": "applicant",
        "auth_method": "password",
        "profile": profile_dict,
    }

    REGISTERED_CITIZENS_STORE[uname_lower] = user_dict
    CITIZEN_PROFILE_STORE[user_id] = profile_dict

    return {
        "status": "REGISTERED",
        "user": {
            "id": user_id,
            "username": req.username.strip(),
            "fullName": req.full_name.strip(),
            "email": req.email.strip(),
            "role": "applicant",
            "authMethod": "password",
            "profile": profile_dict,
        }
    }


@router.post("/auth/login")
async def login_citizen(req: CitizenLoginRequest):
    """Authenticate an existing citizen using registered credentials."""
    uname_lower = req.username.lower().strip()
    user_record = REGISTERED_CITIZENS_STORE.get(uname_lower)

    if not user_record:
        raise HTTPException(status_code=404, detail="Citizen account not found. Please click 'Create Account' to sign up.")

    if user_record["password_hash"] != hash_password(req.password):
        raise HTTPException(status_code=401, detail="Incorrect password. Please verify your credentials.")

    profile = CITIZEN_PROFILE_STORE.get(user_record["id"], user_record.get("profile", {}))

    return {
        "status": "AUTHENTICATED",
        "user": {
            "id": user_record["id"],
            "username": user_record["username"],
            "fullName": user_record["full_name"],
            "email": user_record["email"],
            "role": user_record["role"],
            "authMethod": "password",
            "profile": profile,
        }
    }


@router.get("/citizen/profile/{user_id}", response_model=CitizenProfile | dict)
async def get_citizen_profile(user_id: str):
    """Retrieve saved citizen profile for the specified user."""
    profile = CITIZEN_PROFILE_STORE.get(user_id)
    if not profile:
        return {}
    return profile


@router.put("/citizen/profile/{user_id}")
async def save_citizen_profile(user_id: str, profile: CitizenProfile):
    """Save or update citizen profile for the specified user."""
    CITIZEN_PROFILE_STORE[user_id] = profile.model_dump()
    return {"status": "SAVED", "user_id": user_id, "profile": CITIZEN_PROFILE_STORE[user_id]}


@router.get("/citizen/applications/{user_id}")
async def get_applied_scholarships(user_id: str):
    """Retrieve all submitted scholarship applications for the specified citizen."""
    return CITIZEN_APPLICATIONS_STORE.get(user_id, [])


@router.post("/citizen/applications/{user_id}")
async def save_applied_scholarship(user_id: str, application: dict[str, Any]):
    """Record a newly filed and verified scholarship application."""
    if user_id not in CITIZEN_APPLICATIONS_STORE:
        CITIZEN_APPLICATIONS_STORE[user_id] = []
    # Deduplicate by tracking number or id
    CITIZEN_APPLICATIONS_STORE[user_id] = [
        a for a in CITIZEN_APPLICATIONS_STORE[user_id] 
        if a.get("trackingNumber") != application.get("trackingNumber")
    ]
    CITIZEN_APPLICATIONS_STORE[user_id].insert(0, application)
    return {"status": "RECORDED", "total_applications": len(CITIZEN_APPLICATIONS_STORE[user_id])}
