import asyncio
import base64
from datetime import date
from temporalio import activity
from app.domain.clinical.extractor import ClinicalExtractor, Page, fhir_pages, pdf_pages
from app.domain.clinical.policy_matcher import missing_requirements


class ClinicalActivities:
    def __init__(self, runtime):
        self.rt = runtime

    @activity.defn
    async def extract(self, case: str, source: str) -> str:
        data = self.rt.audit.read_json(case, "source", source)
        if data["payer"] == "caqh_proview":
            return self.rt.audit.json(case, "fields", data["dates"])
        pages = []
        for doc in data["documents"]:
            name = doc["name"]
            match doc["kind"]:
                case "text":
                    pages.append(Page(document_name=name, page_number=1, text=doc["content"]))
                case "fhir":
                    pages.extend(fhir_pages(name, doc["content"]))
                case "pdf":
                    pages.extend(await asyncio.to_thread(pdf_pages, name, base64.b64decode(doc["content"], validate=True)))
                case _:
                    raise ValueError("Unknown document kind")
        cfg = self.rt.settings
        extractor = (ClinicalExtractor.instructor(cfg.model, cfg.approved_model_endpoint)
                     if cfg.model else ClinicalExtractor())
        record = await extractor.extract(pages)
        profile = await self.rt.vault.read("portals/" + data["profile"])
        if missing_requirements(record, profile["required_fields"]):
            raise ValueError("MISSING_CLINICAL_EVIDENCE")
        fields = {key: "; ".join(e.value for e in values) for key in profile["fields"]
                  if isinstance(values := getattr(record, key), list)}
        evidence = self.rt.audit.json(case, "evidence", record.model_dump())
        return self.rt.audit.json(case, "fields", {"values": fields, "evidence": evidence})

    @activity.defn
    async def credential_case(self, case: str, provider: str, profile: str) -> str:
        data = await self.rt.vault.read("providers/" + provider)
        today = date.today()
        fields = {}
        for key in ("state_license", "cds", "dea", "malpractice"):
            expires = date.fromisoformat(data[key]["expires"])
            if expires <= today:
                raise ValueError("Credential requires renewal")
            fields[key] = expires.isoformat()
        return self.rt.audit.json(case, "source", {"payer": "caqh_proview", "profile": profile,
            "expected_draft_id": data["draft_id"], "dates": {"values": fields},
            "documents": data["documents"], "previous": data["previous"]})
