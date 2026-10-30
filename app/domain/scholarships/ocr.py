import base64
import io
import logging
import re
from typing import Any
from pypdf import PdfReader
from .schemas import TranscriptExtractionResult

logger = logging.getLogger(__name__)


def extract_transcript_data(file_bytes: bytes, file_name: str) -> TranscriptExtractionResult:
    """Extract academic and demographic fields from uploaded transcript or marksheet."""
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

    # GPA patterns: "GPA: 3.8", "CGPA: 8.9", "Grade Point Average: 3.92"
    gpa_match = re.search(r"(?:CGPA|GPA|Grade Point Average)[\t :]+([0-9]+\.?[0-9]*)", text_content, re.IGNORECASE)
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
    name_match = re.search(r"(?:Student Name|Applicant Name|Candidate Name|Name)[\t :]+([A-Za-z. ]{2,50})", text_content, re.IGNORECASE)
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
