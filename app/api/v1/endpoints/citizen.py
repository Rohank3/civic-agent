import hashlib
import json
import logging
import os
import threading
import time
import uuid
from typing import Any
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.domain.citizen.schemas import CitizenProfile

logger = logging.getLogger(__name__)

router = APIRouter(tags=["citizen"])

_CITIZEN_DB_INITIALIZED = False
_CITIZEN_DB_LOCK = threading.Lock()


def hash_password(password: str, salt: str | None = None) -> str:
    """Hash password using PBKDF2-HMAC-SHA256 with 100,000 iterations and 16-byte random salt."""
    if salt is None:
        salt_bytes = os.urandom(16)
        salt_hex = salt_bytes.hex()
    else:
        salt_hex = salt
        salt_bytes = bytes.fromhex(salt_hex)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt_bytes, 100_000)
    return f"{salt_hex}:{dk.hex()}"


def verify_password(password: str, stored_hash: str) -> bool:
    """Verify password against stored salt:hash or legacy unsalted SHA-256 hash."""
    if ":" not in stored_hash:
        return hashlib.sha256(password.encode("utf-8")).hexdigest() == stored_hash
    salt_hex, _ = stored_hash.split(":", 1)
    return hash_password(password, salt=salt_hex) == stored_hash


def init_citizen_tables(force: bool = False) -> None:
    """Ensure citizens, profiles, and application history tables exist in persistent SQLite database and pre-seed evaluator account."""
    global _CITIZEN_DB_INITIALIZED
    if _CITIZEN_DB_INITIALIZED and not force:
        return
    with _CITIZEN_DB_LOCK:
        if _CITIZEN_DB_INITIALIZED and not force:
            return
        from app.domain.scholarships.client import get_db_connection, _DB_WRITE_LOCK
        conn = get_db_connection()
        with _DB_WRITE_LOCK:
            with conn:
                conn.execute("""
                    CREATE TABLE IF NOT EXISTS citizens (
                        id TEXT PRIMARY KEY,
                        username TEXT UNIQUE NOT NULL,
                        full_name TEXT NOT NULL,
                        email TEXT NOT NULL,
                        password_hash TEXT NOT NULL,
                        role TEXT NOT NULL DEFAULT 'applicant',
                        auth_method TEXT NOT NULL DEFAULT 'password',
                        created_at TEXT NOT NULL
                    )
                """)
                conn.execute("""
                    CREATE TABLE IF NOT EXISTS citizen_profiles (
                        user_id TEXT PRIMARY KEY,
                        payload TEXT NOT NULL,
                        updated_at TEXT NOT NULL,
                        FOREIGN KEY (user_id) REFERENCES citizens(id)
                    )
                """)
                conn.execute("""
                    CREATE TABLE IF NOT EXISTS citizen_applications (
                        id TEXT PRIMARY KEY,
                        user_id TEXT NOT NULL,
                        tracking_number TEXT NOT NULL,
                        payload TEXT NOT NULL,
                        submitted_at TEXT NOT NULL
                    )
                """)
                # Pre-seed verified evaluator judge account if not exists
                cur = conn.execute("SELECT COUNT(*) FROM citizens WHERE lower(username) = 'evaluator'")
                if cur.fetchone()[0] == 0:
                    now_str = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
                    eval_hash = hash_password("Evaluator@2026")
                    eval_id = "user_evaluator"
                    conn.execute("""
                        INSERT INTO citizens (id, username, full_name, email, password_hash, role, auth_method, created_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """, (eval_id, "evaluator", "Judge Evaluator", "evaluator@gov.in", eval_hash, "judge_evaluator", "password", now_str))

                    eval_profile = {
                        "full_name": "Judge Evaluator",
                        "date_of_birth": "2000-01-01",
                        "national_id": "ID-EVALUATOR-2026",
                        "email": "evaluator@gov.in",
                        "phone": "+91-9876543210",
                        "address_street": "Ministry of Electronics & Information Technology",
                        "address_city": "New Delhi",
                        "address_state": "Delhi",
                        "address_zip": "110003",
                        "income_annual": 250000.0,
                        "household_size": 4,
                        "category": "GENERAL",
                        "attributes": {}
                    }
                    conn.execute("""
                        INSERT OR REPLACE INTO citizen_profiles (user_id, payload, updated_at)
                        VALUES (?, ?, ?)
                    """, (eval_id, json.dumps(eval_profile), now_str))
                    logger.info("Pre-seeded SQLite Evaluator account (user_evaluator)")
        _CITIZEN_DB_INITIALIZED = True


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


class CitizenUserResponse(BaseModel):
    id: str
    username: str
    fullName: str
    email: str
    role: str
    authMethod: str
    profile: dict[str, Any]


class CitizenAuthResponse(BaseModel):
    status: str
    user: CitizenUserResponse


class CitizenProfileSaveResponse(BaseModel):
    status: str
    user_id: str
    profile: dict[str, Any]


class ApplicationRecordResponse(BaseModel):
    status: str
    total_applications: int


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


@router.post("/auth/register", response_model=CitizenAuthResponse)
async def register_citizen(req: CitizenRegisterRequest):
    """Register a new citizen account and initialize their citizen profile in persistent SQLite database."""
    init_citizen_tables()
    from app.domain.scholarships.client import get_db_connection, _DB_WRITE_LOCK
    conn = get_db_connection()

    uname_lower = req.username.lower().strip()
    row = conn.execute("SELECT id FROM citizens WHERE lower(username) = ?", (uname_lower,)).fetchone()
    if row:
        raise HTTPException(status_code=400, detail="An account with this username already exists.")

    user_id = f"user_{uname_lower}"
    hashed = hash_password(req.password)
    now_str = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

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

    with _DB_WRITE_LOCK:
        with conn:
            conn.execute("""
                INSERT INTO citizens (id, username, full_name, email, password_hash, role, auth_method, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                user_id,
                req.username.strip(),
                req.full_name.strip(),
                req.email.strip(),
                hashed,
                "applicant",
                "password",
                now_str
            ))
            conn.execute("""
                INSERT OR REPLACE INTO citizen_profiles (user_id, payload, updated_at)
                VALUES (?, ?, ?)
            """, (
                user_id,
                json.dumps(profile_dict),
                now_str
            ))

    return CitizenAuthResponse(
        status="REGISTERED",
        user=CitizenUserResponse(
            id=user_id,
            username=req.username.strip(),
            fullName=req.full_name.strip(),
            email=req.email.strip(),
            role="applicant",
            authMethod="password",
            profile=profile_dict,
        )
    )


@router.post("/auth/login", response_model=CitizenAuthResponse)
async def login_citizen(req: CitizenLoginRequest):
    """Authenticate an existing citizen using registered credentials from SQLite database."""
    init_citizen_tables()
    from app.domain.scholarships.client import get_db_connection
    conn = get_db_connection()

    uname_lower = req.username.lower().strip()
    user_row = conn.execute("SELECT * FROM citizens WHERE lower(username) = ?", (uname_lower,)).fetchone()

    if not user_row:
        raise HTTPException(status_code=404, detail="Citizen account not found. Please click 'Create Account' to sign up.")

    if not verify_password(req.password, user_row["password_hash"]):
        raise HTTPException(status_code=401, detail="Incorrect password. Please verify your credentials.")

    profile_row = conn.execute("SELECT payload FROM citizen_profiles WHERE user_id = ?", (user_row["id"],)).fetchone()
    profile = json.loads(profile_row["payload"]) if profile_row and profile_row["payload"] else {}

    return CitizenAuthResponse(
        status="AUTHENTICATED",
        user=CitizenUserResponse(
            id=user_row["id"],
            username=user_row["username"],
            fullName=user_row["full_name"],
            email=user_row["email"],
            role=user_row["role"],
            authMethod=user_row["auth_method"],
            profile=profile,
        )
    )


@router.get("/citizen/profile/{user_id}", response_model=CitizenProfile | dict)
async def get_citizen_profile(user_id: str):
    """Retrieve saved citizen profile for the specified user from SQLite database."""
    init_citizen_tables()
    from app.domain.scholarships.client import get_db_connection
    conn = get_db_connection()
    row = conn.execute("SELECT payload FROM citizen_profiles WHERE user_id = ?", (user_id,)).fetchone()
    if not row or not row["payload"]:
        return {}
    try:
        return json.loads(row["payload"])
    except Exception:
        return {}


@router.put("/citizen/profile/{user_id}", response_model=CitizenProfileSaveResponse)
async def save_citizen_profile(user_id: str, profile: CitizenProfile):
    """Save or update citizen profile for the specified user in persistent SQLite database."""
    init_citizen_tables()
    from app.domain.scholarships.client import get_db_connection, _DB_WRITE_LOCK
    conn = get_db_connection()
    dumped = profile.model_dump()
    now_str = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

    with _DB_WRITE_LOCK:
        with conn:
            conn.execute("""
                INSERT OR REPLACE INTO citizen_profiles (user_id, payload, updated_at)
                VALUES (?, ?, ?)
            """, (
                user_id,
                json.dumps(dumped),
                now_str
            ))

    return CitizenProfileSaveResponse(status="SAVED", user_id=user_id, profile=dumped)


@router.get("/citizen/applications/{user_id}")
async def get_applied_scholarships(user_id: str):
    """Retrieve all submitted scholarship applications for the specified citizen from SQLite database."""
    init_citizen_tables()
    from app.domain.scholarships.client import get_db_connection
    conn = get_db_connection()
    rows = conn.execute("""
        SELECT payload FROM citizen_applications
        WHERE user_id = ?
        ORDER BY submitted_at DESC
    """, (user_id,)).fetchall()
    results = []
    for r in rows:
        try:
            results.append(json.loads(r["payload"]))
        except Exception:
            pass
    return results


@router.post("/citizen/applications/{user_id}", response_model=ApplicationRecordResponse)
async def save_applied_scholarship(user_id: str, application: dict[str, Any]):
    """Record a newly filed and verified scholarship application into persistent SQLite database."""
    init_citizen_tables()
    import uuid
    from app.domain.scholarships.client import get_db_connection, _DB_WRITE_LOCK
    conn = get_db_connection()
    tracking_no = application.get("trackingNumber") or application.get("tracking_number") or f"TRK-{uuid.uuid4().hex[:8].upper()}"
    app_id = f"{user_id}_{tracking_no}"
    now_str = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

    with _DB_WRITE_LOCK:
        with conn:
            conn.execute("""
                INSERT OR REPLACE INTO citizen_applications (id, user_id, tracking_number, payload, submitted_at)
                VALUES (?, ?, ?, ?, ?)
            """, (
                app_id,
                user_id,
                tracking_no,
                json.dumps(application),
                now_str
            ))

    cur = conn.execute("SELECT COUNT(*) FROM citizen_applications WHERE user_id = ?", (user_id,))
    total = cur.fetchone()[0]
    return ApplicationRecordResponse(status="RECORDED", total_applications=total)
