"""Subagents package for autonomous civic scholarship processing.

Contains specialized, single-responsibility subagents:
- ScholarshipScraperSubagent: Discovers & scrapes live scholarships from official websites.
- DynamicPortalSubagent: Generates scheme-tailored statutory portals without static templates.
- EligibilityVerificationSubagent: Dynamically matches citizen profiles against statutory rules.
- SelfReflectionAuditSubagent: Semantically audits populated forms without mock scores.
- ReceiptVerificationSubagent: Extracts and cryptographically seals tracking receipts.
- BatchApplicationSubagent: Orchestrates applying to all eligible scholarships across portals.
"""
from .web_scraper import ScholarshipScraperSubagent
from .portal_generator import DynamicPortalSubagent
from .eligibility_subagent import EligibilityVerificationSubagent
from .audit_subagent import SelfReflectionAuditSubagent
from .receipt_subagent import ReceiptVerificationSubagent
from .batch_orchestrator import BatchApplicationSubagent

__all__ = [
    "ScholarshipScraperSubagent",
    "DynamicPortalSubagent",
    "EligibilityVerificationSubagent",
    "SelfReflectionAuditSubagent",
    "ReceiptVerificationSubagent",
    "BatchApplicationSubagent",
]
