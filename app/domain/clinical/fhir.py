import json
import re
from .schemas import Page

SUPPORTED = {"Coverage", "ServiceRequest", "Condition", "Patient", "Practitioner"}
FHIR_ID = re.compile(r"[A-Za-z0-9.-]{1,64}")
MAX_RESOURCES = 500
MAX_TEXT = 2_000_000


def _object(value):
    if not isinstance(value, dict):
        raise ValueError("Malformed FHIR object")
    return value


def _objects(value):
    if not isinstance(value, list) or len(value) > MAX_RESOURCES:
        raise ValueError("Malformed FHIR array")
    return [_object(item) for item in value]


def document_entries(payload):
    payload = _object(payload)
    if payload.get("resourceType") != "Bundle":
        return [(None, payload)]
    return [(entry.get("fullUrl"), _object(entry.get("resource")))
            for entry in _objects(payload.get("entry"))]


def _validate_service_request(resource):
    for coding in _objects(_object(resource.get("code", {})).get("coding", [])):
        if any(not isinstance(coding.get(key, ""), str) for key in ("system", "code")):
            raise ValueError("Malformed FHIR coding")
    refs = [_object(resource.get("requester", {})), *_objects(resource.get("performer", []))]
    for ref in refs:
        ident = _object(ref.get("identifier", {}))
        if any(not isinstance(ident.get(key, ""), str) for key in ("system", "value")):
            raise ValueError("Malformed FHIR identifier")


def validate_case_subjects(payloads):
    entries = [entry for payload in payloads for entry in document_entries(payload)]
    if len(entries) > MAX_RESOURCES:
        raise ValueError("Too many FHIR resources")
    aliases = {}
    patients = set()
    subjects = set()
    for url, resource in entries:
        kind = resource.get("resourceType")
        if not isinstance(kind, str) or (url is not None and not isinstance(url, str)):
            raise ValueError("Malformed FHIR resource")
        if kind == "Patient":
            identifier = resource.get("id")
            if identifier is not None and (not isinstance(identifier, str) or not FHIR_ID.fullmatch(identifier)):
                raise ValueError("Malformed patient id")
            local = f"Patient/{identifier}" if identifier else None
            canonical = url or local
            if not canonical:
                raise ValueError("Patient identity required")
            patients.add(canonical)
            if local and (url or local not in aliases):
                aliases[local] = canonical
        if kind == "ServiceRequest":
            _validate_service_request(resource)
        if kind in {"Coverage", "ServiceRequest", "Condition"}:
            for field in ("subject", "beneficiary"):
                if field in resource:
                    ref = _object(resource[field]).get("reference")
                    if not isinstance(ref, str) or not ref:
                        raise ValueError("Unresolved FHIR patient reference")
                    subjects.add(ref)
    # The same patient may occur in multiple documents, including as a standalone
    # Patient and as a Bundle entry with a fullUrl. Never collapse absolute origins.
    resolved = {aliases.get(value, value) for value in patients | subjects}
    if len(resolved) > 1:
        raise ValueError("Expected one patient per case")


def fhir_pages(name, payload):
    validate_case_subjects([payload])
    pages = []
    size = 0
    for index, (_, resource) in enumerate(document_entries(payload), 1):
        if resource["resourceType"] in SUPPORTED:
            text = json.dumps(resource, ensure_ascii=False)
            size += len(text)
            if size > MAX_TEXT:
                raise ValueError("FHIR source too large")
            pages.append(Page(document_name=name, page_number=index, text=text))
    return pages
