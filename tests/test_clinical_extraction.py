import pytest
from io import BytesIO
from pypdf import PdfWriter
from app.domain.clinical.extractor import ClinicalExtractor, Page, fhir_pages, pdf_pages
from app.domain.clinical.schemas import ClinicalRecord, Evidence, MISSING


async def test_labelled_notes():
    pages = [Page(document_name="note", page_number=2, text="duration_weeks: 6 weeks\nprimary_icd10: M54.50")]
    record = await ClinicalExtractor().extract(pages)
    assert record.duration_weeks[0].value == "6"
    assert record.primary_icd10[0].verbatim_quote == "primary_icd10: M54.50"
    assert record.failed_medications == MISSING


@pytest.mark.parametrize("quote,value,page", [("invented", "6", 1), ("6 weeks", "60", 1),
                                              ("6 weeks", "6", 2), ("6 months", "6", 1)])
async def test_ungrounded_proposals(quote, value, page):
    async def propose(_):
        return ClinicalRecord(duration_weeks=[Evidence(value=value, document_name="chart",
                              page_number=page, verbatim_quote=quote)])
    record = await ClinicalExtractor(propose).extract([Page(document_name="chart", page_number=1,
                                                            text="6 weeks and 6 months")])
    assert record.duration_weeks == MISSING


def test_scanned_pdf_requires_ocr():
    writer = PdfWriter()
    writer.add_blank_page(100, 100)
    buf = BytesIO()
    writer.write(buf)
    with pytest.raises(ValueError, match="OCR"):
        pdf_pages("scan", buf.getvalue())
    assert pdf_pages("scan", buf.getvalue(), lambda _, i: "page one")[0].page_number == 1


async def test_fhir_procedure_and_ordering_identifier():
    request = {"resourceType": "ServiceRequest", "code": {"coding": [
        {"system": "http://www.ama-assn.org/go/cpt", "code": "97110"}]},
        "requester": {"identifier": {"system": "http://hl7.org/fhir/sid/us-npi", "value": "1234567893"}}}
    record = await ClinicalExtractor().extract(fhir_pages("order.json", request))
    assert record.cpt_hcpcs[0].value == "97110"
    assert record.ordering_npi[0].value == "1234567893"
    assert record.rendering_npi == MISSING


def test_fhir_source_and_subject_validation():
    payload = {"resourceType": "Bundle", "entry": [{"resource": {"resourceType": "Patient", "id": "A"}},
               {"resource": {"resourceType": "Condition", "subject": {"reference": "Patient/A"}}}]}
    assert len(fhir_pages("fhir", payload)) == 2
    payload["entry"][1]["resource"]["subject"]["reference"] = "Patient/B"
    with pytest.raises(ValueError):
        fhir_pages("fhir", payload)
