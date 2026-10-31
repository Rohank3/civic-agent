STATUTORY_PORTAL_HTML = """<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>State Public Assistance & Scholarship Portal | Statutory Gateway</title>
    <style>
        :root {
            --primary: #1e40af;
            --primary-dark: #1e3a8a;
            --bg: #0f172a;
            --card: #1e293b;
            --border: #334155;
            --text: #f8fafc;
            --text-muted: #94a3b8;
            --accent: #10b981;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
        body { background: #0f172a; color: var(--text); min-height: 100vh; display: flex; flex-direction: column; }
        header { background: #1e293b; border-bottom: 1px solid var(--border); padding: 1rem 1.5rem; display: flex; align-items: center; justify-content: space-between; }
        .brand { display: flex; align-items: center; gap: 0.75rem; }
        .emblem { width: 36px; height: 36px; background: linear-gradient(135deg, #2563eb, #06b6d4); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 18px; color: white; }
        .portal-title { font-size: 1.1rem; font-weight: 700; color: white; }
        .portal-sub { font-size: 0.75rem; color: var(--text-muted); }
        .stepper { display: flex; gap: 0.5rem; padding: 1rem 1.5rem; background: #111827; border-bottom: 1px solid var(--border); overflow-x: auto; }
        .step-pill { font-size: 0.75rem; padding: 0.35rem 0.75rem; border-radius: 9999px; background: #1e293b; color: var(--text-muted); border: 1px solid var(--border); white-space: nowrap; font-weight: 500; }
        .step-pill.active { background: #2563eb; color: white; border-color: #3b82f6; }
        main { flex: 1; max-width: 720px; width: 100%; margin: 1.5rem auto; padding: 0 1rem; }
        .card { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 1.75rem; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.3); }
        h2 { font-size: 1.25rem; font-weight: 700; margin-bottom: 1rem; color: #f8fafc; border-bottom: 1px solid var(--border); padding-bottom: 0.5rem; }
        .form-group { margin-bottom: 1.1rem; }
        label { display: block; font-size: 0.82rem; font-weight: 500; color: #cbd5e1; margin-bottom: 0.35rem; }
        input[type="text"], input[type="file"] { width: 100%; background: #0f172a; border: 1px solid var(--border); color: #f8fafc; padding: 0.65rem 0.85rem; border-radius: 6px; font-size: 0.875rem; transition: border-color 0.2s; }
        input[type="text"]:focus { outline: none; border-color: #3b82f6; }
        .btn-primary { background: #2563eb; color: white; border: none; padding: 0.7rem 1.5rem; border-radius: 6px; font-weight: 600; font-size: 0.875rem; cursor: pointer; transition: background 0.2s; display: inline-flex; align-items: center; justify-content: center; margin-top: 0.5rem; }
        .btn-primary:hover { background: #1d4ed8; }
        .checkbox-group { display: flex; align-items: flex-start; gap: 0.5rem; margin: 1.25rem 0; font-size: 0.8rem; color: #cbd5e1; }
        .checkbox-group input { margin-top: 0.2rem; cursor: pointer; }
        .modal { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 100; }
        .modal-content { background: #1e293b; border: 1px solid var(--border); border-radius: 12px; padding: 2rem; max-width: 480px; width: 90%; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); text-align: center; }
        .modal-content h3 { font-size: 1.15rem; margin-bottom: 0.75rem; color: white; }
        .modal-content p { font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1.5rem; line-height: 1.5; }
        .step { display: none; }
        .step.active { display: block; }
        .receipt-badge { background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.4); padding: 1.25rem; border-radius: 8px; text-align: center; margin-top: 1rem; }
        .receipt-id { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 1.2rem; font-weight: 700; color: #34d399; margin: 0.5rem 0; }
    </style>
</head>
<body>
    <!-- Modal Obstacle (Notice & Terms) -->
    <div id="notice-modal" class="modal">
        <div class="modal-content">
            <h3>Official Notice & Cookie Consent</h3>
            <p>Welcome to the State Department of Higher Education Statutory Portal. In compliance with the Information Technology Act and OGD standards, session cookies are recorded for security audits.</p>
            <button id="accept-modal" class="btn-primary" onclick="document.getElementById('notice-modal').style.display='none'">Accept All & Continue</button>
        </div>
    </div>

    <!-- Portal Header -->
    <header>
        <div class="brand">
            <div class="emblem">🏛️</div>
            <div>
                <div class="portal-title">State Public Assistance & Scholarship Portal</div>
                <div class="portal-sub">Official Statutory Grant & Entitlement Submission Gateway</div>
            </div>
        </div>
        <div style="font-size: 0.75rem; color: var(--accent); font-family: monospace; font-weight: bold;">
            • SYSTEM ACTIVE
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
            <!-- Step 1: Personal Info -->
            <div id="step1" class="step active">
                <h2>Step 1: Applicant Demographics</h2>
                <div class="form-group">
                    <label for="txtApplicantName">Applicant Full Legal Name</label>
                    <input type="text" id="txtApplicantName" name="applicant_name" placeholder="e.g. Eleanor Vance">
                </div>
                <div class="form-group">
                    <label for="dob_picker">Date of Birth (YYYY-MM-DD)</label>
                    <input type="text" id="dob_picker" name="date_of_birth" placeholder="e.g. 2002-11-20">
                </div>
                <div class="form-group">
                    <label for="national_identifier">National ID / Aadhaar Number</label>
                    <input type="text" id="national_identifier" name="national_id" placeholder="e.g. AADHAAR-1944-9821-4433">
                </div>
                <div class="form-group">
                    <label for="applicant_email">Registered Email Address</label>
                    <input type="text" id="applicant_email" name="email_address" placeholder="e.g. applicant@university.edu">
                </div>
                <div class="form-group">
                    <label for="primary_phone">Primary Contact Phone Number</label>
                    <input type="text" id="primary_phone" name="contact_phone" placeholder="e.g. 9876543210">
                </div>
                <button type="button" id="btnNext" class="btn-primary" onclick="switchStep('step1', 'step2')">Next Step →</button>
            </div>

            <!-- Step 2: Address, Financials & Attachments -->
            <div id="step2" class="step">
                <h2>Step 2: Household & Supporting Evidence</h2>
                <div class="form-group">
                    <label for="street_addr">Residential Street Address</label>
                    <input type="text" id="street_addr" name="street_address" placeholder="e.g. 72 Hill View Avenue">
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
                    <div class="form-group">
                        <label for="city_name">City / Municipality</label>
                        <input type="text" id="city_name" name="address_city" placeholder="e.g. Kalpetta">
                    </div>
                    <div class="form-group">
                        <label for="state_prov">State / Domicile</label>
                        <input type="text" id="state_prov" name="state_code" placeholder="e.g. Kerala">
                    </div>
                </div>
                <div class="form-group">
                    <label for="zip_code">Postal / PIN Code</label>
                    <input type="text" id="zip_code" name="postal_code" placeholder="e.g. 673121">
                </div>
                <div class="form-group">
                    <label for="gross_income">Total Annual Family Income (INR)</label>
                    <input type="text" id="gross_income" name="annual_income" placeholder="e.g. 120000">
                </div>
                <div class="form-group">
                    <label for="income_proof">Upload Statutory Income Certificate (PDF / Image)</label>
                    <input type="file" id="income_proof" name="income_document">
                </div>
                <div class="checkbox-group">
                    <input type="checkbox" id="chkCertify" name="certification">
                    <label for="chkCertify">I declare under penalty of perjury that all submitted demographic and financial statements are true, accurate, and verified by Competent Authority.</label>
                </div>
                <button type="button" id="btnReview" class="btn-primary" onclick="switchStep('step2', 'step3')">Save & Continue →</button>
            </div>

            <!-- Step 3: Review and Final Submission -->
            <div id="step3" class="step">
                <h2>Step 3: Review and Pre-Submission Audit</h2>
                <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1rem;">
                    Please audit your application details before cryptographic submission. Once committed, your record is sealed with the State Education Registry.
                </p>
                <div id="review-summary" style="background: #0f172a; padding: 1rem; border-radius: 8px; border: 1px solid var(--border); font-size: 0.85rem; margin-bottom: 1.25rem;">
                    Applicant Name: <strong id="summary-name" style="color: white;"></strong>
                </div>
                <button type="button" id="submit-application" class="btn-primary" onclick="submitApplication()">Submit Application & Seal</button>
            </div>

            <!-- Step 4: Confirmation Receipt -->
            <div id="step4" class="step">
                <h2>Application Submitted Successfully</h2>
                <p style="font-size: 0.85rem; color: var(--text-muted);">
                    Your statutory scholarship application has been logged and confirmed by the State Higher Education Department.
                </p>
                <div class="receipt-badge">
                    <span style="font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted); font-weight: bold; letter-spacing: 0.05em;">Official Tracking Reference</span>
                    <div id="tracking-number" class="receipt-id">PUB-REC-2026-98421</div>
                    <span style="font-size: 0.75rem; color: #10b981;">✓ Digitally Signed & Sealed</span>
                </div>
            </div>
        </div>
    </main>

    <script>
        function switchStep(fromId, toId) {
            document.getElementById(fromId).classList.remove('active');
            document.getElementById(toId).classList.add('active');
            if (toId === 'step2') {
                document.getElementById('pill1').classList.remove('active');
                document.getElementById('pill2').classList.add('active');
            } else if (toId === 'step3') {
                document.getElementById('pill2').classList.remove('active');
                document.getElementById('pill3').classList.add('active');
                var nameVal = document.getElementById('txtApplicantName').value || 'Eleanor Vance';
                document.getElementById('summary-name').innerText = nameVal;
            }
        }
        function submitApplication() {
            document.getElementById('step3').classList.remove('active');
            document.getElementById('step4').classList.add('active');
            document.getElementById('pill3').classList.remove('active');
            document.getElementById('pill4').classList.add('active');
        }
    </script>
</body>
</html>
"""
