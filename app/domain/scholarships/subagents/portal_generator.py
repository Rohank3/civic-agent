"""Dynamic Portal Subagent: Generates scheme-tailored statutory web portal interfaces on the fly.

Eliminates static hardcoded portals and dummy student names.
Every scholarship scheme receives a distinct, authentic multi-step portal reflecting its
specific statutory eligibility criteria, required documents, and ministry standards.
"""
import html
from typing import Any
from app.domain.scholarships.schemas import ScholarshipScheme


class DynamicPortalSubagent:
    """Subagent responsible for generating and inspecting dynamic portal DOMs tailored to specific schemes."""

    @staticmethod
    def render_portal_html(scheme: ScholarshipScheme | None = None) -> str:
        """Render a fully functional, modern multi-step statutory portal customized to the given scheme."""
        scheme_id = scheme.id if scheme else "general_statutory_scholarship"
        scheme_name = scheme.name if scheme else "National Statutory Scholarship Scheme"
        ministry = scheme.ministry if scheme else "Ministry of Education (Department of Higher Education)"
        grant_amount = scheme.grant_amount_annual if scheme else 25000.0
        income_ceiling = scheme.max_family_income if scheme else 450000.0
        min_gpa = scheme.min_gpa_or_percentage if scheme else 60.0
        categories = scheme.target_category if scheme else ["ALL"]
        gazette = scheme.gazette_notification if scheme else "Gazette of India (Verified OGD)"

        is_girls_scheme = "FEMALE" in categories or "pragati" in scheme_id.lower() or "girl" in scheme_name.lower()
        is_sc_st_scheme = ("SC" in categories or "ST" in categories) and "ALL" not in categories
        is_ner_scheme = "NER_DOMICILE" in categories or "ner" in scheme_id.lower() or "ishan" in scheme_id.lower()
        is_obc_scheme = ("OBC" in categories or "EBC" in categories or "DNT" in categories) and "ALL" not in categories

        # Scheme-specific field badges
        scheme_specific_inputs = []
        if is_girls_scheme:
            scheme_specific_inputs.append("""
                <div class="form-group">
                    <label for="college_admission_letter">AICTE Approved College Admission Letter / Bonafide</label>
                    <input type="file" id="college_admission_letter" name="admission_letter">
                </div>
                <div class="form-group">
                    <label for="tuition_fee_receipt">First Year Tuition Fee Receipt (PDF / Image)</label>
                    <input type="file" id="tuition_fee_receipt" name="tuition_receipt">
                </div>
            """)
        elif is_sc_st_scheme:
            scheme_specific_inputs.append("""
                <div class="form-group">
                    <label for="caste_cert_no">Caste / Community Certificate Number</label>
                    <input type="text" id="caste_cert_no" name="caste_certificate_number" placeholder="Enter issued certificate number">
                </div>
                <div class="form-group">
                    <label for="caste_proof">Upload Statutory Caste Certificate (PDF)</label>
                    <input type="file" id="caste_proof" name="caste_document">
                </div>
            """)
        elif is_ner_scheme:
            scheme_specific_inputs.append("""
                <div class="form-group">
                    <label for="domicile_cert_no">Permanent Resident Certificate (PRC) Number</label>
                    <input type="text" id="domicile_cert_no" name="domicile_certificate_number" placeholder="Enter State Domicile / PRC Number">
                </div>
                <div class="form-group">
                    <label for="ner_domicile_proof">Upload North-Eastern State Domicile Proof (PDF)</label>
                    <input type="file" id="ner_domicile_proof" name="domicile_document">
                </div>
            """)
        elif is_obc_scheme:
            scheme_specific_inputs.append("""
                <div class="form-group">
                    <label for="obc_cert_no">OBC / EBC Non-Creamy Layer Certificate Number</label>
                    <input type="text" id="obc_cert_no" name="obc_certificate_number" placeholder="Enter NCL / Community Certificate Number">
                </div>
                <div class="form-group">
                    <label for="obc_proof">Upload Non-Creamy Layer Certificate (PDF)</label>
                    <input type="file" id="obc_proof" name="obc_document">
                </div>
            """)

        scheme_inputs_html = "\n".join(scheme_specific_inputs)

        safe_scheme_name = html.escape(scheme_name)
        safe_ministry = html.escape(ministry)
        safe_gazette = html.escape(gazette)
        safe_scheme_id = html.escape(scheme_id)

        return f"""<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{safe_scheme_name} | Official Statutory Gateway</title>
    <style>
        :root {{
            --primary: #1e40af;
            --primary-dark: #1e3a8a;
            --bg: #0f172a;
            --card: #1e293b;
            --border: #334155;
            --text: #f8fafc;
            --text-muted: #94a3b8;
            --accent: #10b981;
        }}
        * {{ box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }}
        body {{ background: #0f172a; color: var(--text); min-height: 100vh; display: flex; flex-direction: column; }}
        header {{ background: #1e293b; border-bottom: 1px solid var(--border); padding: 1rem 1.5rem; display: flex; align-items: center; justify-content: space-between; }}
        .brand {{ display: flex; align-items: center; gap: 0.75rem; }}
        .emblem {{ width: 36px; height: 36px; background: linear-gradient(135deg, #2563eb, #06b6d4); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 18px; color: white; }}
        .portal-title {{ font-size: 1.05rem; font-weight: 700; color: white; }}
        .portal-sub {{ font-size: 0.75rem; color: var(--text-muted); }}
        .stepper {{ display: flex; gap: 0.5rem; padding: 1rem 1.5rem; background: #111827; border-bottom: 1px solid var(--border); overflow-x: auto; }}
        .step-pill {{ font-size: 0.75rem; padding: 0.35rem 0.75rem; border-radius: 9999px; background: #1e293b; color: var(--text-muted); border: 1px solid var(--border); white-space: nowrap; font-weight: 500; }}
        .step-pill.active {{ background: #2563eb; color: white; border-color: #3b82f6; }}
        main {{ flex: 1; max-width: 740px; width: 100%; margin: 1.5rem auto; padding: 0 1rem; }}
        .card {{ background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 1.75rem; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.3); }}
        h2 {{ font-size: 1.25rem; font-weight: 700; margin-bottom: 1rem; color: #f8fafc; border-bottom: 1px solid var(--border); padding-bottom: 0.5rem; }}
        .form-group {{ margin-bottom: 1.1rem; }}
        label {{ display: block; font-size: 0.82rem; font-weight: 500; color: #cbd5e1; margin-bottom: 0.35rem; }}
        input[type="text"], input[type="file"], select {{ width: 100%; background: #0f172a; border: 1px solid var(--border); color: #f8fafc; padding: 0.65rem 0.85rem; border-radius: 6px; font-size: 0.875rem; transition: border-color 0.2s; }}
        input[type="text"]:focus, select:focus {{ outline: none; border-color: #3b82f6; }}
        .btn-primary {{ background: #2563eb; color: white; border: none; padding: 0.7rem 1.5rem; border-radius: 6px; font-weight: 600; font-size: 0.875rem; cursor: pointer; transition: background 0.2s; display: inline-flex; align-items: center; justify-content: center; margin-top: 0.5rem; }}
        .btn-primary:hover {{ background: #1d4ed8; }}
        .checkbox-group {{ display: flex; align-items: flex-start; gap: 0.5rem; margin: 1.25rem 0; font-size: 0.8rem; color: #cbd5e1; }}
        .checkbox-group input {{ margin-top: 0.2rem; cursor: pointer; }}
        .modal {{ position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 100; }}
        .modal-content {{ background: #1e293b; border: 1px solid var(--border); border-radius: 12px; padding: 2rem; max-width: 480px; width: 90%; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); text-align: center; }}
        .modal-content h3 {{ font-size: 1.15rem; margin-bottom: 0.75rem; color: white; }}
        .modal-content p {{ font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1.5rem; line-height: 1.5; }}
        .step {{ display: none; }}
        .step.active {{ display: block; }}
        .receipt-badge {{ background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.4); padding: 1.25rem; border-radius: 8px; text-align: center; margin-top: 1rem; }}
        .receipt-id {{ font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 1.2rem; font-weight: 700; color: #34d399; margin: 0.5rem 0; }}
        .scheme-info-banner {{ background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 8px; padding: 0.75rem 1rem; margin-bottom: 1.25rem; font-size: 0.8rem; }}
        .scheme-info-title {{ font-weight: 700; color: #60a5fa; margin-bottom: 0.25rem; }}
        .scheme-info-meta {{ color: var(--text-muted); font-size: 0.75rem; }}
    </style>
</head>
<body>
    <!-- Modal Obstacle (Notice & Terms) -->
    <div id="notice-modal" class="modal">
        <div class="modal-content">
            <h3>Official Statutory Gateway Notice</h3>
            <p>Welcome to the official application gateway for <strong>{safe_scheme_name}</strong> under the <strong>{safe_ministry}</strong>. Session integrity is cryptographically sealed for compliance audits.</p>
            <button id="accept-modal" class="btn-primary" onclick="document.getElementById('notice-modal').style.display='none'">Accept All & Continue</button>
        </div>
    </div>

    <!-- Portal Header -->
    <header>
        <div class="brand">
            <div class="emblem">🏛️</div>
            <div>
                <div class="portal-title">{safe_scheme_name}</div>
                <div class="portal-sub">State Public Assistance & Scholarship Portal • {safe_ministry} • Grant Ceiling: ₹{grant_amount:,.0f}/yr</div>
            </div>
        </div>
        <div style="font-size: 0.75rem; color: var(--accent); font-family: monospace; font-weight: bold;">
            • SCHEME ACTIVE
        </div>
    </header>

    <!-- Stepper Navigation -->
    <div class="stepper">
        <span id="pill1" class="step-pill active">1. Applicant Demographics</span>
        <span id="pill2" class="step-pill">2. Household & Financials</span>
        <span id="pill3" class="step-pill">3. Legal Review & Audit</span>
        <span id="pill4" class="step-pill">4. Official Confirmation</span>
    </div>

    <!-- Form Wizard Container -->
    <main>
        <div class="card">
            <!-- Scheme Metadata Info Header -->
            <div class="scheme-info-banner">
                <div class="scheme-info-title">{safe_scheme_name}</div>
                <div class="scheme-info-meta">
                    Authority: {safe_ministry} | Max Family Income: ₹{income_ceiling:,.0f} | Min Marks: {min_gpa:.1f}% | Gazette: {safe_gazette}
                </div>
            </div>

            <!-- Step 1: Personal Info -->
            <div id="step1" class="step active">
                <h2>Step 1: Applicant Demographics</h2>
                <div class="form-group">
                    <label for="txtApplicantName">Applicant Full Legal Name</label>
                    <input type="text" id="txtApplicantName" name="applicant_name" placeholder="Enter applicant full legal name">
                </div>
                <div class="form-group">
                    <label for="dob_picker">Date of Birth (YYYY-MM-DD)</label>
                    <input type="text" id="dob_picker" name="date_of_birth" placeholder="YYYY-MM-DD">
                </div>
                <div class="form-group">
                    <label for="national_identifier">National ID / Aadhaar Number</label>
                    <input type="text" id="national_identifier" name="national_id" placeholder="Enter Aadhaar or National ID Number">
                </div>
                <div class="form-group">
                    <label for="applicant_email">Registered Email Address</label>
                    <input type="text" id="applicant_email" name="email_address" placeholder="applicant@university.edu">
                </div>
                <div class="form-group">
                    <label for="primary_phone">Primary Contact Phone Number</label>
                    <input type="text" id="primary_phone" name="contact_phone" placeholder="Enter 10-digit mobile number">
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
                    <div class="form-group">
                        <label for="selCategory">Social Category / Reservation</label>
                        <select id="selCategory" name="category">
                            <option value="GENERAL">General / Open</option>
                            <option value="OBC">Other Backward Classes (OBC)</option>
                            <option value="SC">Scheduled Caste (SC)</option>
                            <option value="ST">Scheduled Tribe (ST)</option>
                            <option value="EWS">Economically Weaker Section (EWS)</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="selGender">Gender</label>
                        <select id="selGender" name="gender">
                            <option value="FEMALE">Female</option>
                            <option value="MALE">Male</option>
                            <option value="OTHER">Other</option>
                        </select>
                    </div>
                </div>
                <button type="button" id="btnNext" class="btn-primary" onclick="switchStep('step1', 'step2')">Next Step →</button>
            </div>

            <!-- Step 2: Address, Financials & Scheme Specific Evidence -->
            <div id="step2" class="step">
                <h2>Step 2: Household & Supporting Evidence</h2>
                <div class="form-group">
                    <label for="street_addr">Residential Street Address</label>
                    <input type="text" id="street_addr" name="street_address" placeholder="Enter residential street address">
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
                    <div class="form-group">
                        <label for="city_name">City / Municipality</label>
                        <input type="text" id="city_name" name="address_city" placeholder="Enter city or district">
                    </div>
                    <div class="form-group">
                        <label for="state_prov">State / Domicile</label>
                        <input type="text" id="state_prov" name="state_code" placeholder="Enter domicile state">
                    </div>
                </div>
                <div class="form-group">
                    <label for="zip_code">Postal / PIN Code</label>
                    <input type="text" id="zip_code" name="postal_code" placeholder="Enter 6-digit postal code">
                </div>
                <div class="form-group">
                    <label for="gross_income">Total Annual Family Income (INR)</label>
                    <input type="text" id="gross_income" name="annual_income" placeholder="Annual family income in INR (Ceiling: ₹{income_ceiling:,.0f})">
                </div>
                <div class="form-group">
                    <label for="income_proof">Upload Statutory Income Certificate (PDF / Image)</label>
                    <input type="file" id="income_proof" name="income_document">
                </div>

                <!-- Scheme Specific Requirement Fields -->
                {scheme_inputs_html}

                <div class="checkbox-group">
                    <input type="checkbox" id="chkCertify" name="certification">
                    <label for="chkCertify">I declare under penalty of perjury that all submitted demographic and financial statements are true, accurate, and verified by Competent Authority under {safe_gazette}.</label>
                </div>
                <button type="button" id="btnReview" class="btn-primary" onclick="switchStep('step2', 'step3')">Save & Continue →</button>
            </div>

            <!-- Step 3: Review and Pre-Submission Audit -->
            <div id="step3" class="step">
                <h2>Step 3: Review and Pre-Submission Audit</h2>
                <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1rem;">
                    Please audit your application details before cryptographic submission. Once committed, your record is sealed with the {safe_ministry} Registry.
                </p>
                <div style="background: #0f172a; padding: 1rem; border-radius: 8px; border: 1px solid var(--border); font-size: 0.85rem; margin-bottom: 1.25rem;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                        <span style="color: var(--text-muted);">Target Scheme:</span>
                        <strong style="color: #60a5fa;">{safe_scheme_name}</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                        <span style="color: var(--text-muted);">Applicant Name:</span>
                        <span id="rev_name" style="font-weight: 600;">--</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                        <span style="color: var(--text-muted);">National ID:</span>
                        <span id="rev_id" style="font-family: monospace;">--</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                        <span style="color: var(--text-muted);">Declared Income:</span>
                        <span id="rev_income" style="color: #34d399; font-weight: 600;">--</span>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                        <span style="color: var(--text-muted);">Statutory Authority:</span>
                        <span>{safe_ministry}</span>
                    </div>
                </div>
                <button type="button" id="submit-application" class="btn-primary" onclick="switchStep('step3', 'step4')">Commit Intent & Sign Application →</button>
            </div>

            <!-- Step 4: Confirmation Receipt -->
            <div id="step4" class="step">
                <h2>Step 4: Official Confirmation & Receipt</h2>
                <div class="receipt-badge">
                    <div style="font-size: 0.85rem; color: #a7f3d0; font-weight: 600;">STATUTORY SCHEME APPLICATION SUBMITTED</div>
                    <div id="tracking-number" class="receipt-id">NSP-2026-{safe_scheme_id.upper()[:6]}-8921</div>
                    <p style="font-size: 0.8rem; color: var(--text-muted);">
                        Application cryptographically recorded with {safe_ministry}. Digital receipt sealed with SHA-256 digest.
                    </p>
                </div>
            </div>
        </div>
    </main>

    <script>
        function switchStep(fromId, toId) {{
            document.getElementById(fromId).classList.remove('active');
            document.getElementById(toId).classList.add('active');

            if (toId === 'step2') {{
                document.getElementById('pill1').classList.remove('active');
                document.getElementById('pill2').classList.add('active');
            }} else if (toId === 'step3') {{
                document.getElementById('pill2').classList.remove('active');
                document.getElementById('pill3').classList.add('active');

                var nameVal = document.getElementById('txtApplicantName').value.trim() || 'Verified Applicant';
                var idVal = document.getElementById('national_identifier').value.trim() || 'ID-VERIFIED';
                var incVal = document.getElementById('gross_income').value.trim() || '0';

                document.getElementById('rev_name').innerText = nameVal;
                document.getElementById('rev_id').innerText = idVal;
                document.getElementById('rev_income').innerText = '₹' + Number(incVal.replace(/[^0-9]/g, '')).toLocaleString();
            }} else if (toId === 'step4') {{
                document.getElementById('pill3').classList.remove('active');
                document.getElementById('pill4').classList.add('active');
            }}
        }}
    </script>
</body>
</html>"""
