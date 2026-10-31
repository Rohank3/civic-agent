import asyncio
import os
from pathlib import Path
from playwright.async_api import async_playwright

OUTPUT_DIR = Path(__file__).resolve().parent.parent / "sample_documents"
FRONTEND_SAMPLES = Path(__file__).resolve().parent.parent / "frontend" / "public" / "samples"

AARAV_TRANSCRIPT_HTML = """
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body { font-family: 'Helvetica Neue', Arial, sans-serif; margin: 40px; color: #111; line-height: 1.4; }
  .header { text-align: center; border-bottom: 2px solid #1e3a8a; padding-bottom: 15px; margin-bottom: 25px; }
  .title { font-size: 20px; font-weight: bold; color: #1e3a8a; text-transform: uppercase; }
  .sub { font-size: 13px; color: #555; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 25px; }
  .cell { font-size: 14px; }
  .label { font-weight: bold; color: #333; }
  table { width: 100%; border-collapse: collapse; margin-top: 15px; }
  th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; font-size: 13px; }
  th { background-color: #f1f5f9; color: #1e3a8a; }
  .footer { margin-top: 40px; display: flex; justify-content: space-between; font-size: 12px; color: #666; border-top: 1px solid #e2e8f0; padding-top: 15px; }
</style>
</head>
<body>
<div class="header">
  <div class="title">State Institute of Technology</div>
  <div class="sub">Office of the Controller of Examinations | Verified Academic Record</div>
</div>
<div class="grid">
  <div class="cell"><span class="label">Student Name:</span> Aarav Sharma</div>
  <div class="cell"><span class="label">Roll Number:</span> 2024CS-1092</div>
  <div class="cell"><span class="label">Degree:</span> Bachelor of Technology</div>
  <div class="cell"><span class="label">Department:</span> Computer Science and Engineering</div>
  <div class="cell"><span class="label">Academic Year:</span> 2024-2026</div>
  <div class="cell"><span class="label">Status:</span> Regular / Full-Time</div>
</div>
<table>
  <thead>
    <tr>
      <th>Course Code</th>
      <th>Course Description</th>
      <th>Credits</th>
      <th>Grade</th>
    </tr>
  </thead>
  <tbody>
    <tr><td>CS-301</td><td>Data Structures & Algorithms</td><td>4.0</td><td>A+</td></tr>
    <tr><td>CS-302</td><td>Operating Systems</td><td>4.0</td><td>A</td></tr>
    <tr><td>CS-303</td><td>Database Management Systems</td><td>3.0</td><td>A+</td></tr>
    <tr><td>CS-304</td><td>Artificial Intelligence</td><td>4.0</td><td>O</td></tr>
  </tbody>
</table>
<div style="margin-top: 25px; padding: 15px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px;">
  <div><strong>Cumulative Grade Point Average (CGPA):</strong> 3.85 / 4.00</div>
  <div><strong>Aggregate Percentage:</strong> 82.5%</div>
</div>
<div class="footer">
  <div>Official Verification ID: SIT-EXAM-2026-9012</div>
  <div>Controller of Examinations: Signed & Sealed</div>
</div>
</body>
</html>
"""

AARAV_INCOME_HTML = """
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body { font-family: 'Helvetica Neue', Arial, sans-serif; margin: 40px; color: #111; line-height: 1.5; }
  .header { text-align: center; border-bottom: 2px solid #065f46; padding-bottom: 15px; margin-bottom: 25px; }
  .emblem { font-size: 24px; font-weight: bold; color: #065f46; }
  .title { font-size: 18px; font-weight: bold; color: #047857; text-transform: uppercase; margin-top: 5px; }
  .cert-meta { text-align: right; font-size: 13px; color: #475569; margin-bottom: 20px; }
  .content { font-size: 15px; text-align: justify; margin: 25px 0; border: 1px solid #cbd5e1; padding: 25px; border-radius: 8px; background: #fafafa; }
  .highlight { font-weight: bold; color: #0f172a; }
  .seal { margin-top: 50px; text-align: right; }
  .seal-title { font-weight: bold; font-size: 14px; }
  .seal-sub { font-size: 12px; color: #64748b; }
</style>
</head>
<body>
<div class="header">
  <div class="emblem">GOVERNMENT OF KARNATAKA</div>
  <div class="title">Revenue Department - Tahsildar Office</div>
  <div style="font-size: 13px; color: #555;">Statutory Certificate of Household Income</div>
</div>
<div class="cert-meta">
  <div><strong>Certificate No:</strong> REV/INC/2026/8819</div>
  <div><strong>Date of Issue:</strong> 2026-01-15</div>
</div>
<div class="content">
  <p>This is to officially certify that upon thorough revenue and field inquiry conducted under the statutory provisions of the Karnataka Land Revenue Act:</p>
  <p>Applicant Name: <span class="highlight">Aarav Sharma</span><br>
  Son/Daughter of: <span class="highlight">Ramesh Sharma</span><br>
  Resident of: <span class="highlight">14 MG Road, Civil Station, Bangalore Urban, Karnataka</span></p>
  <p>The total gross annual household income of the family from all verifiable sources (agriculture, trade, and wages) is assessed at:</p>
  <p style="font-size: 18px; font-weight: bold; color: #047857; text-align: center; margin: 20px 0;">
    Rs. 1,80,000 (One Lakh Eighty Thousand Indian Rupees)
  </p>
  <p>State: <strong>Karnataka</strong> | District: <strong>Bangalore Urban</strong></p>
  <p>This certificate is issued for higher education scholarship applications and statutory fee concessions for Academic Year 2026-2027.</p>
</div>
<div class="seal">
  <div class="seal-title">Office of the Tahsildar</div>
  <div class="seal-sub">Bangalore Urban Taluk | Revenue Division</div>
</div>
</body>
</html>
"""

ELEANOR_TRANSCRIPT_HTML = """
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body { font-family: 'Helvetica Neue', Arial, sans-serif; margin: 40px; color: #111; line-height: 1.4; }
  .header { text-align: center; border-bottom: 2px solid #1e3a8a; padding-bottom: 15px; margin-bottom: 25px; }
  .title { font-size: 20px; font-weight: bold; color: #1e3a8a; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 25px; }
  .cell { font-size: 14px; }
  .label { font-weight: bold; }
  table { width: 100%; border-collapse: collapse; margin-top: 15px; }
  th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; font-size: 13px; }
  th { background-color: #f1f5f9; color: #1e3a8a; }
  .footer { margin-top: 40px; display: flex; justify-content: space-between; font-size: 12px; color: #666; }
</style>
</head>
<body>
<div class="header">
  <div class="title">National Technological University</div>
  <div style="font-size: 13px; color: #555;">Official Transcript of Academic Record</div>
</div>
<div class="grid">
  <div class="cell"><span class="label">Student Name:</span> Eleanor Vance</div>
  <div class="cell"><span class="label">Roll No:</span> 2024DS-9821</div>
  <div class="cell"><span class="label">Institution:</span> National Technological University</div>
  <div class="cell"><span class="label">Major:</span> Data Science & Artificial Intelligence</div>
</div>
<div style="margin-top: 25px; padding: 15px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px;">
  <div><strong>Grade Point Average:</strong> 3.92 / 4.00</div>
  <div><strong>Aggregate Percentage:</strong> 92.0%</div>
  <div><strong>Date of Issue:</strong> 2026-05-10</div>
</div>
<div class="footer">
  <div>Registrar: Office of Academic Affairs</div>
  <div>Verification Code: NTU-VERIFY-9821</div>
</div>
</body>
</html>
"""

ELEANOR_INCOME_HTML = """
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body { font-family: 'Helvetica Neue', Arial, sans-serif; margin: 40px; color: #111; line-height: 1.5; }
  .header { text-align: center; border-bottom: 2px solid #065f46; padding-bottom: 15px; margin-bottom: 25px; }
  .title { font-size: 18px; font-weight: bold; color: #047857; text-transform: uppercase; }
  .cert-meta { text-align: right; font-size: 13px; color: #475569; margin-bottom: 20px; }
  .content { font-size: 15px; margin: 25px 0; border: 1px solid #cbd5e1; padding: 25px; border-radius: 8px; background: #fafafa; }
</style>
</head>
<body>
<div class="header">
  <div style="font-size: 20px; font-weight: bold; color: #065f46;">STATE PUBLIC WELFARE & REVENUE DIVISION</div>
  <div class="title">Statutory Family Income Certificate</div>
</div>
<div class="cert-meta">
  <div><strong>Certificate Number:</strong> PUB/INC/2026/1944</div>
  <div><strong>Date of Issue:</strong> 2026-02-01</div>
</div>
<div class="content">
  <p>Certified that Applicant: <strong>Eleanor Vance</strong><br>
  Ward of: <strong>Arthur Vance</strong><br>
  Address: <strong>72 Hill View Avenue, Kalpetta, Wayanad, Kerala</strong></p>
  <p>Total Annual Family Gross Income: <strong>Rs. 1,20,000</strong></p>
  <p>District: <strong>Wayanad</strong> | State: <strong>Kerala</strong></p>
  <p>Issuing Authority: <strong>Revenue Divisional Officer</strong></p>
</div>
</body>
</html>
"""

async def generate_pdfs():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    FRONTEND_SAMPLES.mkdir(parents=True, exist_ok=True)

    items = [
        ("Academic_Marksheet_Aarav_Sharma.pdf", AARAV_TRANSCRIPT_HTML),
        ("Income_Certificate_Aarav_Sharma.pdf", AARAV_INCOME_HTML),
        ("Official_Transcript_Eleanor_Vance.pdf", ELEANOR_TRANSCRIPT_HTML),
        ("Statutory_Income_Certificate_Eleanor_Vance.pdf", ELEANOR_INCOME_HTML),
    ]

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        page = await browser.new_page()

        for filename, html in items:
            await page.set_content(html, wait_until="load")
            dest1 = OUTPUT_DIR / filename
            dest2 = FRONTEND_SAMPLES / filename
            await page.pdf(path=str(dest1), format="A4", print_background=True)
            await page.pdf(path=str(dest2), format="A4", print_background=True)
            print(f"Generated {filename} -> {dest1}")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(generate_pdfs())
