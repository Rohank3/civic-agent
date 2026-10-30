import re
from typing import Any


def mask_national_id(val: str) -> str:
    """Mask National ID/SSN leaving only the last 4 characters visible."""
    val = str(val).strip()
    if len(val) <= 4:
        return "****"
    return f"***-**-{val[-4:]}"


def mask_email(val: str) -> str:
    """Mask email address e.g. j***e@example.com."""
    val = str(val).strip()
    if "@" not in val:
        return "***"
    local, domain = val.split("@", 1)
    if len(local) <= 2:
        masked_local = local[0] + "*"
    else:
        masked_local = local[0] + "*" * (len(local) - 2) + local[-1]
    return f"{masked_local}@{domain}"


def mask_phone(val: str) -> str:
    """Mask phone number leaving only the last 4 digits."""
    val = str(val).strip()
    digits = re.sub(r"\D", "", val)
    if len(digits) <= 4:
        return "***-****"
    return f"***-***-{digits[-4:]}"


def sanitize_citizen_dict(data: dict[str, Any], redact_pii: bool = True) -> dict[str, Any]:
    """Recursively mask sensitive PII in data dictionaries."""
    if not redact_pii or not isinstance(data, dict):
        return data

    sanitized = {}
    for k, v in data.items():
        if isinstance(v, dict):
            sanitized[k] = sanitize_citizen_dict(v, redact_pii)
        elif isinstance(v, list):
            sanitized[k] = [
                sanitize_citizen_dict(item, redact_pii) if isinstance(item, dict) else item
                for item in v
            ]
        elif k in ("national_id", "ssn", "tin", "aadhaar") and isinstance(v, str):
            sanitized[k] = mask_national_id(v)
        elif k in ("email", "applicant_email") and isinstance(v, str):
            sanitized[k] = mask_email(v)
        elif k in ("phone", "contact_phone", "mobile") and isinstance(v, str):
            sanitized[k] = mask_phone(v)
        else:
            sanitized[k] = v
    return sanitized
