from .schemas import ClinicalRecord, MISSING


def missing_requirements(record: ClinicalRecord, required_fields: list[str]) -> list[str]:
    """Evaluate a clinic-supplied evidence checklist, without inferring a determination."""
    return [field for field in required_fields if getattr(record, field) == MISSING]
