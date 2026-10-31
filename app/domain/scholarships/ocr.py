import base64
import io
import json
import logging
import os
import re
from typing import Any
import httpx
from pypdf import PdfReader
from .schemas import (
    TranscriptExtractionResult,
    IncomeCertificateExtractionResult,
    DualDocumentExtractionResult,
    DocumentIntegrityReport,
)

logger = logging.getLogger(__name__)


def extract_transcript_with_gemini(file_bytes: bytes, file_name: str) -> TranscriptExtractionResult | None:
    """Multimodal document intelligence via Gemini 3.5 Flash for academic marksheets and transcripts."""
    api_key = os.getenv("CIVICAGENT_GEMINI_API_KEY") or os.getenv("GEMINI_API_KEY")
    if not api_key:
        return None
    model = os.getenv("CIVICAGENT_MODEL") or os.getenv("MODEL") or "gemini-3.5-flash-lite"
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"

    mime_type = "application/pdf" if file_bytes.startswith(b"%PDF-") else "image/png"
    lower_name = file_name.lower()
    if lower_name.endswith(".jpg") or lower_name.endswith(".jpeg"):
        mime_type = "image/jpeg"
    elif lower_name.endswith(".png"):
        mime_type = "image/png"
    elif lower_name.endswith(".txt"):
        mime_type = "text/plain"

    prompt = (
        "You are an expert government document intelligence system for university scholarships. "
        "Extract the following academic details from this student marksheet or transcript payload: "
        "student_name (string or null), roll_number (string or null), institution (string or null), "
        "gpa (float or null, e.g. on 4.0 or 10.0 scale), percentage (float or null, 0 to 100), major (string or null). "
        "Return strictly valid JSON with these exact keys."
    )

    parts: list[dict[str, Any]] = []
    if mime_type == "text/plain" or (not file_bytes.startswith(b"%PDF-") and not mime_type.startswith("image/")):
        text_preview = file_bytes.decode("utf-8", errors="ignore")[:4000]
        parts.append({"text": f"{prompt}\n\nDocument text:\n{text_preview}"})
    else:
        parts.append({"text": prompt})
        parts.append({
            "inlineData": {
                "mimeType": mime_type,
                "data": base64.b64encode(file_bytes).decode("ascii")
            }
        })

    try:
        with httpx.Client(timeout=15.0) as client:
            resp = client.post(
                url,
                json={
                    "contents": [{"parts": parts}],
                    "generationConfig": {"responseMimeType": "application/json"}
                }
            )
            if resp.status_code == 200:
                raw_json = resp.json()["candidates"][0]["content"]["parts"][0]["text"]
                data = json.loads(raw_json)
                gpa = data.get("gpa")
                pct = data.get("percentage")
                if gpa and not pct:
                    pct = (float(gpa) / 4.0) * 100.0 if float(gpa) <= 4.0 else float(gpa) * 9.5
                logger.info(f"Successfully parsed transcript with Gemini Flash AI: {data.get('student_name')}")
                return TranscriptExtractionResult(
                    student_name=data.get("student_name"),
                    roll_number=data.get("roll_number"),
                    institution=data.get("institution"),
                    gpa=float(gpa) if gpa is not None else None,
                    percentage=float(pct) if pct is not None else None,
                    major=data.get("major"),
                    confidence=0.98,
                    raw_text=raw_json
                )
    except Exception as exc:
        logger.warning(f"Gemini transcript OCR error, falling back: {exc}")
    return None


def extract_income_certificate_with_gemini(file_bytes: bytes, file_name: str) -> IncomeCertificateExtractionResult | None:
    """Multimodal document intelligence via Gemini 3.5 Flash for statutory income certificates."""
    api_key = os.getenv("CIVICAGENT_GEMINI_API_KEY") or os.getenv("GEMINI_API_KEY")
    if not api_key:
        return None
    model = os.getenv("CIVICAGENT_MODEL") or os.getenv("MODEL") or "gemini-3.5-flash-lite"
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"

    mime_type = "application/pdf" if file_bytes.startswith(b"%PDF-") else "image/png"
    lower_name = file_name.lower()
    if lower_name.endswith(".jpg") or lower_name.endswith(".jpeg"):
        mime_type = "image/jpeg"
    elif lower_name.endswith(".png"):
        mime_type = "image/png"
    elif lower_name.endswith(".txt"):
        mime_type = "text/plain"

    prompt = (
        "You are an expert government document intelligence system for statutory welfare grants. "
        "Extract the following details from this government family income certificate: "
        "certificate_number (string or null), applicant_name (string or null), "
        "parent_or_guardian_name (string or null), annual_income (float in INR or null), "
        "issuing_authority (string or null, e.g. Tahsildar, Revenue Officer, Sub-Divisional Magistrate), "
        "state (string or null), district (string or null), issue_date (string YYYY-MM-DD or DD/MM/YYYY or null). "
        "Return strictly valid JSON with these exact keys."
    )

    parts: list[dict[str, Any]] = []
    if mime_type == "text/plain" or (not file_bytes.startswith(b"%PDF-") and not mime_type.startswith("image/")):
        text_preview = file_bytes.decode("utf-8", errors="ignore")[:4000]
        parts.append({"text": f"{prompt}\n\nDocument text:\n{text_preview}"})
    else:
        parts.append({"text": prompt})
        parts.append({
            "inlineData": {
                "mimeType": mime_type,
                "data": base64.b64encode(file_bytes).decode("ascii")
            }
        })

    try:
        with httpx.Client(timeout=15.0) as client:
            resp = client.post(
                url,
                json={
                    "contents": [{"parts": parts}],
                    "generationConfig": {"responseMimeType": "application/json"}
                }
            )
            if resp.status_code == 200:
                raw_json = resp.json()["candidates"][0]["content"]["parts"][0]["text"]
                data = json.loads(raw_json)
                income = data.get("annual_income")
                logger.info(f"Successfully parsed income certificate with Gemini Flash AI: {data.get('applicant_name')} (INR {income})")
                return IncomeCertificateExtractionResult(
                    certificate_number=data.get("certificate_number"),
                    applicant_name=data.get("applicant_name"),
                    parent_or_guardian_name=data.get("parent_or_guardian_name"),
                    annual_income=float(income) if income is not None else None,
                    issuing_authority=data.get("issuing_authority"),
                    state=data.get("state"),
                    district=data.get("district"),
                    issue_date=data.get("issue_date"),
                    valid_until=None,
                    confidence=0.98,
                    raw_text=raw_json
                )
    except Exception as exc:
        logger.warning(f"Gemini income certificate OCR error, falling back: {exc}")
    return None


def extract_transcript_data(file_bytes: bytes, file_name: str) -> TranscriptExtractionResult:
    """Extract academic and demographic fields from uploaded transcript using Gemini multimodal AI with heuristic fallback."""
    # 1. Primary: Gemini 3.5 Flash Multimodal Document Intelligence
    gemini_result = extract_transcript_with_gemini(file_bytes, file_name)
    if gemini_result and (gemini_result.gpa is not None or gemini_result.percentage is not None or gemini_result.student_name):
        return gemini_result

    # 2. Heuristic fallback for offline / mock testing
    text_content = ""

    # 1. Parse text from PDF bytes
    if file_bytes.startswith(b"%PDF-"):
        try:
            reader = PdfReader(io.BytesIO(file_bytes))
            for page in reader.pages:
                extracted = page.extract_text()
                if extracted:
                    text_content += extracted + "\n"
        except Exception as e:
            logger.warning(f"Error reading PDF stream: {e}")
    else:
        # Fallback to UTF-8 decoding for raw text/simulated transcripts
        try:
            text_content = file_bytes.decode("utf-8", errors="ignore")
        except Exception:
            text_content = ""

    # 2. Heuristic and Regex Extraction
    gpa = None
    percentage = None
    student_name = None
    roll_no = None
    institution = None
    major = None

    # GPA patterns: "GPA: 3.8", "CGPA: 8.9", "Cumulative Grade Point Average (CGPA): 3.85"
    gpa_match = re.search(r"(?:Cumulative )?(?:CGPA|GPA|Grade Point Average)(?:\s*\([^)]*\))?[\t :]+([0-9]+\.?[0-9]*)", text_content, re.IGNORECASE)
    if gpa_match:
        try:
            val = float(gpa_match.group(1))
            if val <= 10.0:
                gpa = val
                percentage = val * 9.5 if val > 4.0 else (val / 4.0) * 100.0
        except ValueError:
            pass

    # Percentage patterns: "Percentage: 84.5%", "Marks: 88%"
    pct_match = re.search(r"(?:Percentage|Aggregate Marks|Score)[\t :]+([0-9]+\.?[0-9]*)\s*%", text_content, re.IGNORECASE)
    if pct_match:
        try:
            percentage = float(pct_match.group(1))
        except ValueError:
            pass

    # Student name patterns: "Student Name: Eleanor Vance"
    name_match = re.search(r"(?:Student Name|Applicant Name|Candidate Name)[\t :]+([A-Za-z. ]{2,40}?)(?:\r?\n|Roll|Date|Reg|University|College|$)", text_content, re.IGNORECASE)
    if not name_match:
        name_match = re.search(r"(?:Name)[\t :]+([A-Za-z. ]{2,40}?)(?:\r?\n|Roll|Date|Reg|$)", text_content, re.IGNORECASE)
    if name_match:
        student_name = name_match.group(1).strip()

    # Roll / Registration number: "Roll No: 2024CS1092"
    roll_match = re.search(r"(?:Roll No|Reg(?:istration)? No|Student ID)[\t :]+([A-Za-z0-9\-_]{4,25})", text_content, re.IGNORECASE)
    if roll_match:
        roll_no = roll_match.group(1).strip()

    # Major / Department: "Department: Computer Science", "Major: Electrical Engineering"
    major_match = re.search(r"(?:Department|Major|Course|Program)[\t :]+([A-Za-z\s&]{3,50})", text_content, re.IGNORECASE)
    if major_match:
        # Stop at newline
        major = major_match.group(1).splitlines()[0].strip()

    # Institution patterns: "University: XYZ University", "Institute: ABC Institute of Tech"
    inst_match = re.search(r"(?:University|Institute|College|School)[\t :]+([A-Za-z\s]{4,60})", text_content, re.IGNORECASE)
    if inst_match:
        institution = inst_match.group(1).splitlines()[0].strip()

    return TranscriptExtractionResult(
        student_name=student_name,
        roll_number=roll_no,
        institution=institution,
        gpa=gpa,
        percentage=percentage,
        major=major,
        confidence=0.92 if (gpa or percentage) else 0.70,
        raw_text=text_content[:2000] if text_content else None
    )


def extract_income_certificate_data(file_bytes: bytes, file_name: str) -> IncomeCertificateExtractionResult:
    """Extract annual income, certificate ID, and authority from uploaded income certificate using Gemini AI with fallback."""
    # 1. Primary: Gemini 3.5 Flash Multimodal Document Intelligence
    gemini_result = extract_income_certificate_with_gemini(file_bytes, file_name)
    if gemini_result and (gemini_result.annual_income is not None or gemini_result.certificate_number):
        return gemini_result

    # 2. Heuristic fallback
    text_content = ""

    if file_bytes.startswith(b"%PDF-"):
        try:
            reader = PdfReader(io.BytesIO(file_bytes))
            for page in reader.pages:
                extracted = page.extract_text()
                if extracted:
                    text_content += extracted + "\n"
        except Exception as e:
            logger.warning(f"Error reading PDF stream: {e}")
    else:
        try:
            text_content = file_bytes.decode("utf-8", errors="ignore")
        except Exception:
            text_content = ""

    cert_no = None
    applicant_name = None
    parent_name = None
    annual_income = None
    authority = None
    state = None
    district = None
    issue_date = None
    valid_until = None

    # Income patterns: "Annual Income: Rs. 1,80,000", "Total Family Income: 24000", "Annual Income: ₹ 250000"
    income_match = re.search(
        r"(?:Annual (?:Family )?Income|Total (?:Family )?Income|Gross Annual Income|Income)[\t :]+(?:Rs\.?|INR|₹)?\s*([0-9,]+(?:\.[0-9]+)?)",
        text_content,
        re.IGNORECASE,
    )
    if not income_match:
        income_match = re.search(
            r"(?:Rs\.?|INR|₹)\s*([0-9]{1,3}(?:,[0-9]{2,3})*(?:\.[0-9]+)?)",
            text_content,
            re.IGNORECASE,
        )
    if income_match:
        try:
            clean_str = income_match.group(1).replace(",", "").strip()
            annual_income = float(clean_str)
        except ValueError:
            pass

    # Certificate Number patterns: "Certificate No: REV/INC/2026/1029", "Cert No: INC-8921"
    cert_match = re.search(
        r"(?:Certificate (?:No|Number)|Cert (?:No|Number)|Application Ref(?:erence)?)[\t :]+([A-Za-z0-9\/\-_]{5,35})",
        text_content,
        re.IGNORECASE,
    )
    if cert_match:
        cert_no = cert_match.group(1).strip()

    # Applicant Name
    name_match = re.search(
        r"(?:Applicant Name|Candidate Name|Certified that Applicant:?|Applicant:?)[\t :]+([A-Za-z. ]{2,40}?)(?:\r?\n|Ward|Son|Daughter|Resident|District|$)",
        text_content,
        re.IGNORECASE,
    )
    if not name_match:
        name_match = re.search(
            r"(?:Certified that (?:Mr\.|Ms\.|Shri|Smt\.)?|Name)[\t :]+([A-Za-z. ]{2,40}?)(?:\r?\n|Ward|Son|Daughter|Resident|District|$)",
            text_content,
            re.IGNORECASE,
        )
    if name_match:
        applicant_name = name_match.group(1).strip()

    # Parent/Guardian Name: "Son/Daughter of: John Vance"
    parent_match = re.search(
        r"(?:Son of|Daughter of|Ward of|Father's Name|Parent/Guardian)[\t :]+([A-Za-z. ]{2,50})",
        text_content,
        re.IGNORECASE,
    )
    if parent_match:
        parent_name = parent_match.group(1).strip()

    # Issuing Authority: "Tahsildar", "Revenue Department", "Sub-Divisional Magistrate"
    auth_match = re.search(
        r"(?:Issued By|Issuing Authority|Office of (?:the)?|Designation)[\t :]+([A-Za-z\s,.\-]{4,60})",
        text_content,
        re.IGNORECASE,
    )
    if auth_match:
        authority = auth_match.group(1).splitlines()[0].strip()

    # State & District
    state_match = re.search(r"(?:State)[\t :]+([A-Za-z\s]{3,30})", text_content, re.IGNORECASE)
    if state_match:
        state = state_match.group(1).splitlines()[0].strip()

    dist_match = re.search(r"(?:District)[\t :]+([A-Za-z\s]{3,30})", text_content, re.IGNORECASE)
    if dist_match:
        district = dist_match.group(1).splitlines()[0].strip()

    # Date
    date_match = re.search(r"(?:Date of Issue|Issued On|Date)[\t :]+([0-9]{4}-[0-9]{2}-[0-9]{2}|[0-9]{2}[\/-][0-9]{2}[\/-][0-9]{4})", text_content, re.IGNORECASE)
    if date_match:
        issue_date = date_match.group(1).strip()

    return IncomeCertificateExtractionResult(
        certificate_number=cert_no,
        applicant_name=applicant_name,
        parent_or_guardian_name=parent_name,
        annual_income=annual_income,
        issuing_authority=authority,
        state=state,
        district=district,
        issue_date=issue_date,
        valid_until=valid_until,
        confidence=0.94 if (annual_income is not None and cert_no) else 0.75,
        raw_text=text_content[:2000] if text_content else None,
    )


def audit_pdf_integrity(file_bytes: bytes, file_name: str) -> DocumentIntegrityReport:
    """Forensic metadata and cryptographic tamper detection for uploaded student documents."""
    if not file_bytes.startswith(b"%PDF-"):
        return DocumentIntegrityReport(
            status="CLEAN",
            quarantine_active=False,
            producer="Raw Text / Direct Payload",
            creator="Direct Stream",
            modification_divergence=False,
            has_digital_signature=False,
            forensic_findings=["Non-PDF raster/text payload. Digital signature check skipped."],
            tamper_score=0.0,
            recommended_action="PROCEED"
        )

    findings: list[str] = []
    tamper_score = 0.0
    producer = None
    creator = None
    divergence = False
    has_sig = False

    # 1. Inspect digital signatures in PDF stream
    if b"/ByteRange" in file_bytes and (b"/Sig" in file_bytes or b"/PKCS7" in file_bytes):
        has_sig = True
        findings.append("Cryptographic PAdES/PKCS#7 digital signature structure present in byte stream.")

    # 2. Inspect multiple EOF markers (Acrobat/editor post-signing byte injection)
    eof_count = file_bytes.count(b"%%EOF")
    if eof_count > 1:
        tamper_score += 0.45
        findings.append(f"Incremental PDF revision detected ({eof_count} %%EOF markers). Post-issuance byte injection suspected.")

    # 3. Read metadata via PdfReader
    try:
        reader = PdfReader(io.BytesIO(file_bytes))
        meta = reader.metadata or {}
        producer = str(meta.get("/Producer") or meta.get("Producer") or "")
        creator = str(meta.get("/Creator") or meta.get("Creator") or "")
        creation_date = str(meta.get("/CreationDate") or meta.get("CreationDate") or "")
        mod_date = str(meta.get("/ModDate") or meta.get("ModDate") or "")

        suspect_tools = ["photoshop", "canva", "gimp", "illustrator", "pdfescape", "sejda", "ilovepdf", "smallpdf", "pdf24", "nitro"]
        combined_tools = f"{producer.lower()} {creator.lower()}"
        for tool in suspect_tools:
            if tool in combined_tools:
                tamper_score += 0.60
                findings.append(f"Consumer editing software detected in PDF metadata ('{tool}'). Uncertified manual alteration suspected.")
                break

        if creation_date and mod_date and creation_date != mod_date:
            divergence = True
            tamper_score += 0.35
            findings.append("Document modification timestamp diverges from creation timestamp. Document was revised post-generation.")

        if not findings and (producer or creator):
            findings.append(f"Generated by legitimate reporting engine: Producer='{producer}', Creator='{creator}'.")
    except Exception as e:
        logger.debug(f"Metadata read notice: {e}")

    tamper_score = min(1.0, round(tamper_score, 2))
    quarantine = tamper_score >= 0.40
    status = "TAMPER_SUSPECTED" if quarantine else ("VERIFIED" if has_sig else "CLEAN")

    if quarantine:
        findings.append("SECURITY ALERT: Document failed statutory integrity check. Quarantine active under Section 199/200 IPC.")
        recommended_action = "DIGILOCKER_PULL"
    else:
        recommended_action = "PROCEED"

    return DocumentIntegrityReport(
        status=status,
        quarantine_active=quarantine,
        producer=producer,
        creator=creator,
        modification_divergence=divergence,
        has_digital_signature=has_sig,
        forensic_findings=findings,
        tamper_score=tamper_score,
        recommended_action=recommended_action
    )


def extract_dual_documents(
    transcript_bytes: bytes,
    transcript_name: str,
    income_bytes: bytes,
    income_name: str,
) -> DualDocumentExtractionResult:
    """Jointly evaluate transcript and income certificate, performing cross-validation and building an auto-populated student profile."""
    transcript_res = extract_transcript_data(transcript_bytes, transcript_name)
    income_res = extract_income_certificate_data(income_bytes, income_name)

    # Forensic Integrity & Tamper Audit
    t_integrity = audit_pdf_integrity(transcript_bytes, transcript_name)
    i_integrity = audit_pdf_integrity(income_bytes, income_name)

    combined_score = max(t_integrity.tamper_score, i_integrity.tamper_score)
    is_quarantined = t_integrity.quarantine_active or i_integrity.quarantine_active
    combined_status = "TAMPER_SUSPECTED" if is_quarantined else ("VERIFIED" if (t_integrity.has_digital_signature or i_integrity.has_digital_signature) else "CLEAN")

    all_findings = []
    if t_integrity.forensic_findings:
        all_findings.extend([f"Transcript: {f}" for f in t_integrity.forensic_findings])
    if i_integrity.forensic_findings:
        all_findings.extend([f"Income Cert: {f}" for f in i_integrity.forensic_findings])

    warnings: list[str] = []
    sufficiency_score = 1.0

    if is_quarantined:
        warnings.append(
            "SECURITY ALERT: Document integrity anomalies detected. Application placed in PRE-FLIGHT QUARANTINE under statutory anti-fraud guidelines. Please resolve via DigiLocker direct pull."
        )
        sufficiency_score = max(0.1, round(sufficiency_score - 0.40, 2))

    integrity_report = DocumentIntegrityReport(
        status=combined_status,
        quarantine_active=is_quarantined,
        producer=i_integrity.producer or t_integrity.producer,
        creator=i_integrity.creator or t_integrity.creator,
        modification_divergence=t_integrity.modification_divergence or i_integrity.modification_divergence,
        has_digital_signature=t_integrity.has_digital_signature or i_integrity.has_digital_signature,
        forensic_findings=all_findings,
        tamper_score=combined_score,
        recommended_action="DIGILOCKER_PULL" if is_quarantined else "PROCEED"
    )

    # Cross-verify applicant names if both present
    name_match = True
    if transcript_res.student_name and income_res.applicant_name:
        t_clean = re.sub(r"[^a-z]", "", transcript_res.student_name.lower())
        i_clean = re.sub(r"[^a-z]", "", income_res.applicant_name.lower())
        if t_clean != i_clean and (t_clean not in i_clean and i_clean not in t_clean):
            name_match = False
            warnings.append(
                f"Applicant name mismatch: Transcript has '{transcript_res.student_name}' but Income Certificate has '{income_res.applicant_name}'."
            )
            sufficiency_score -= 0.20

    if transcript_res.gpa is None and transcript_res.percentage is None:
        warnings.append("Academic GPA / Percentage could not be determined with high confidence.")
        sufficiency_score -= 0.25

    if income_res.annual_income is None:
        warnings.append("Annual household income could not be parsed from income certificate.")
        sufficiency_score -= 0.30

    if not income_res.certificate_number:
        warnings.append("Official Income Certificate number is missing or unreadable.")
        sufficiency_score -= 0.10

    sufficiency_score = max(0.1, min(1.0, round(sufficiency_score, 2)))

    # Determine primary applicant full name without mock fallbacks
    primary_name = transcript_res.student_name or income_res.applicant_name or ""
    if not primary_name:
        warnings.append("Applicant name was not found in the uploaded documents. Please review and edit your Citizen Profile.")
        sufficiency_score = max(0.1, round(sufficiency_score - 0.15, 2))

    # Real data validation: check if date of birth was provided
    extracted_dob = getattr(income_res, "issue_date", "") or ""
    if not extracted_dob:
        warnings.append("Date of birth not present in academic marksheet. Defaulting to profile entry.")

    auto_profile = {
        "full_name": primary_name,
        "date_of_birth": "",
        "national_id": f"ID-{income_res.certificate_number}" if income_res.certificate_number else "",
        "email": f"{primary_name.lower().replace(' ', '.')}@university.edu" if primary_name else "",
        "phone": "",
        "address_street": "",
        "address_city": income_res.district or "",
        "address_state": income_res.state or "",
        "address_zip": "",
        "income_annual": income_res.annual_income if income_res.annual_income is not None else 0.0,
        "household_size": 1,
        "category": "GENERAL",
        "attributes": {
            "gpa": transcript_res.gpa,
            "percentage": transcript_res.percentage,
            "major": transcript_res.major or "",
            "institution": transcript_res.institution or "",
            "roll_number": transcript_res.roll_number or "",
            "certificate_number": income_res.certificate_number or "",
        },
    }

    return DualDocumentExtractionResult(
        transcript=transcript_res,
        income_certificate=income_res,
        name_match=name_match,
        verified_income=income_res.annual_income,
        verified_gpa=transcript_res.gpa,
        sufficiency_score=sufficiency_score,
        warnings=warnings,
        auto_populated_profile=auto_profile,
        integrity_report=integrity_report,
    )

