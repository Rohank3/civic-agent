"""Batch Application Orchestrator Subagent: Manages multi-scheme applications for a citizen.

Enables applying to ALL eligible scholarships across different departments and portals,
ensuring the model doesn't just check one hardcoded scheme repeatedly.
"""
import asyncio
import logging
import time
from typing import Any, AsyncGenerator
from app.domain.citizen.schemas import CitizenProfile, ServiceRequest
from app.domain.scholarships.schemas import ScholarshipScheme, SchemeMatchResult
from app.domain.scholarships.subagents.eligibility_subagent import EligibilityVerificationSubagent

logger = logging.getLogger(__name__)


class BatchApplicationSubagent:
    """Subagent coordinating multi-scholarship application processing across diverse portals."""

    def __init__(self):
        self.active_runs: dict[str, dict[str, Any]] = {}

    def get_eligible_schemes(
        self,
        profile: CitizenProfile,
        schemes: list[ScholarshipScheme]
    ) -> list[SchemeMatchResult]:
        """Filter schemes to only those where applicant satisfies statutory eligibility."""
        matches = [EligibilityVerificationSubagent.evaluate(profile, s) for s in schemes]
        eligible = [m for m in matches if m.is_eligible]
        # Sort by grant amount descending (highest grant first)
        eligible.sort(key=lambda m: m.scheme.grant_amount_annual, reverse=True)
        return eligible

    async def run_batch_application_plan(
        self,
        profile: CitizenProfile,
        schemes: list[ScholarshipScheme],
        execute_fn: Any
    ) -> list[dict[str, Any]]:
        """Orchestrate sequential application to all eligible schemes, collecting proofs and receipts."""
        eligible_matches = self.get_eligible_schemes(profile, schemes)
        results: list[dict[str, Any]] = []

        logger.info(f"BatchApplicationSubagent: Found {len(eligible_matches)} eligible schemes for {profile.full_name}")

        for match in eligible_matches:
            scheme = match.scheme
            logger.info(f"Executing application for scheme '{scheme.name}' ({scheme.id})...")
            try:
                receipt = await execute_fn(scheme, profile)
                results.append({
                    "scheme_id": scheme.id,
                    "scheme_name": scheme.name,
                    "status": "SUCCESS",
                    "tracking_number": receipt.get("tracking_number"),
                    "sha256_hash": receipt.get("sha256_hash"),
                    "grant_amount": scheme.grant_amount_annual,
                    "receipt": receipt
                })
            except Exception as e:
                logger.error(f"Error applying to {scheme.id}: {e}")
                results.append({
                    "scheme_id": scheme.id,
                    "scheme_name": scheme.name,
                    "status": "ERROR",
                    "error": str(e)
                })

        return results
