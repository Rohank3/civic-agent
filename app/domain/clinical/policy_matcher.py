from .schemas import ClinicalRecord, MISSING
from openai import AsyncOpenAI
from sqlalchemy import text
from pgvector import Vector


def missing_requirements(record: ClinicalRecord, required_fields: list[str]) -> list[str]:
    """Evaluate a clinic-supplied evidence checklist, without inferring a determination."""
    return [field for field in required_fields if getattr(record, field) == MISSING]


async def policy_references(engine, endpoint, model, payer, record):
    """Retrieve payer-scoped policy references for staff using only extracted billing codes."""
    if not endpoint or not endpoint.startswith("https://"):
        raise ValueError("Approved embedding endpoint required")
    codes = [fact.value for field in ("cpt_hcpcs", "primary_icd10", "secondary_icd10")
             if isinstance(values := getattr(record, field), list) for fact in values]
    if not codes:
        return []
    async with AsyncOpenAI(base_url=endpoint) as client:
        result = await client.embeddings.create(model=model, input=" ".join(codes))
    vector = Vector(result.data[0].embedding).to_text()
    async with engine.connect() as conn:
        rows = await conn.execute(text("""
            SELECT policy_id, version FROM policy_embeddings
            WHERE payer = :payer AND model = :model AND current_date BETWEEN effective AND expires
            ORDER BY embedding <=> CAST(:vector AS vector) LIMIT 3
        """), {"payer": payer, "model": model, "vector": vector})
        return [dict(row) for row in rows.mappings()]
