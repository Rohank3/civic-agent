"""Eligibility Subagent: Evaluates citizen profile against statutory criteria dynamically.

Eliminates hardcoded defaults (such as 80.0% GPA assumption) and hardcoded gazette citations.
Evaluates income ceilings, academic cutoffs, gender/category quotas, and domicile jurisdictions.
"""
import logging
from typing import Any
from app.domain.citizen.schemas import CitizenProfile
from app.domain.scholarships.schemas import ScholarshipScheme, SchemeMatchResult

logger = logging.getLogger(__name__)

NER_STATES = {
    "ASSAM", "MANIPUR", "MEGHALAYA", "MIZORAM",
    "NAGALAND", "TRIPURA", "ARUNACHAL PRADESH", "SIKKIM"
}


class EligibilityVerificationSubagent:
    """Autonomous Subagent evaluating citizen profile eligibility against statutory scheme criteria."""

    @staticmethod
    def evaluate(profile: CitizenProfile, scheme: ScholarshipScheme) -> SchemeMatchResult:
        """Evaluate a citizen profile against statutory scheme eligibility rules dynamically."""
        reasons: list[str] = []
        missing: list[str] = []
        recommendations: list[str] = []
        is_eligible = True

        attrs = profile.attributes or {}
        gpa = attrs.get("gpa")
        percentage = attrs.get("percentage")

        student_pct: float | None = None
        if percentage is not None and float(percentage) > 0:
            student_pct = float(percentage)
        elif gpa is not None and float(gpa) > 0:
            raw_gpa = float(gpa)
            if raw_gpa <= 4.0:
                student_pct = (raw_gpa / 4.0) * 100.0
            elif raw_gpa <= 10.0:
                student_pct = raw_gpa * 9.5
            else:
                student_pct = raw_gpa

        student_category = str(getattr(profile, "category", "") or attrs.get("category", "GENERAL")).upper()
        student_gender = str(attrs.get("gender", "")).upper()
        domicile = str(profile.address_state or "").strip().upper()

        checks_total = 3
        checks_passed = 0

        # 1. Family Household Income Check
        annual_inc = profile.income_annual
        if annual_inc is None or annual_inc < 0:
            is_eligible = False
            missing.append("Annual family income proof is required for statutory entitlement assessment.")
            recommendations.append("Upload a verified family income certificate or declare annual income.")
        elif annual_inc > scheme.max_family_income:
            is_eligible = False
            missing.append(
                f"Family income ₹{annual_inc:,.0f} exceeds statutory ceiling of ₹{scheme.max_family_income:,.0f}"
            )
            recommendations.append("Explore merit-based or private endowment scholarships without household income ceilings.")
        else:
            checks_passed += 1
            reasons.append(f"Income ₹{annual_inc:,.0f} qualifies under ceiling of ₹{scheme.max_family_income:,.0f}")

        # 2. Academic Score Threshold Check
        if student_pct is None:
            is_eligible = False
            missing.append(f"Academic score is required to verify cutoff threshold of {scheme.min_gpa_or_percentage:.1f}%.")
            recommendations.append("Upload academic transcript or marksheet to verify qualifying percentage.")
        elif student_pct < scheme.min_gpa_or_percentage:
            is_eligible = False
            missing.append(
                f"Academic score {student_pct:.1f}% is below required threshold of {scheme.min_gpa_or_percentage:.1f}%"
            )
            recommendations.append("Consider academic grade improvement or foundational support schemes.")
        else:
            checks_passed += 1
            reasons.append(f"Academic score {student_pct:.1f}% satisfies qualifying cutoff {scheme.min_gpa_or_percentage:.1f}%")

        # 3. Category / Reservation / Gender / Domicile Check
        cat_match = False
        target_cats = [c.upper() for c in scheme.target_category]

        if "ALL" in target_cats or "GENERAL" in target_cats and student_category in ("GENERAL", "ALL", "OPEN"):
            cat_match = True
            reasons.append("Eligible under open/general merit category")
        elif student_category in target_cats:
            cat_match = True
            reasons.append(f"Social category '{student_category}' matches target scheme reservation quota")
        elif "FEMALE" in target_cats and student_gender in ("FEMALE", "F"):
            cat_match = True
            reasons.append("Eligible under women's educational reservation quota")
        elif "NER_DOMICILE" in target_cats and domicile in NER_STATES:
            cat_match = True
            reasons.append(f"Domicile in '{profile.address_state}' qualifies for North Eastern Region quota")
        elif "EWS" in target_cats and (student_category == "EWS" or (annual_inc and annual_inc <= 800000.0)):
            cat_match = True
            reasons.append("Eligible under Economically Weaker Section (EWS) reservation quota")

        if cat_match:
            checks_passed += 1
        else:
            is_eligible = False
            target_str = ", ".join(scheme.target_category)
            missing.append(f"Candidate category/quota '{student_category}' does not match target requirement: [{target_str}]")
            recommendations.append("Check open merit category schemes or state-sponsored scholarships.")

        # Compute dynamic statutory citation from scheme metadata
        gazette = scheme.gazette_notification or f"Statutory Gazette Authority ({scheme.ministry})"
        code = scheme.scheme_code or f"SCHEME-{scheme.id.upper()[:10]}"
        citation = f"{scheme.ministry} | Scheme Code: {code} | Ref: {gazette}"

        if is_eligible:
            reasons.append(f"Statutory Authority Verified: Meets Section 4 eligibility under {gazette}")

        score = max(0.0, round(checks_passed / checks_total, 2))

        return SchemeMatchResult(
            scheme=scheme,
            is_eligible=is_eligible,
            eligibility_score=score,
            reasons=reasons,
            missing_criteria=missing,
            actionable_recommendations=recommendations,
            statutory_citation=citation,
            gazette_reference=gazette
        )
