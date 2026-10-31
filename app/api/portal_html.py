"""Statutory Portal HTML Generation Module.

Delegates portal rendering to DynamicPortalSubagent to eliminate static templates and hardcoded names.
"""
from typing import Any
from app.domain.scholarships.subagents.portal_generator import DynamicPortalSubagent


def get_portal_html_for_scheme(scheme_id: str | None = None) -> str:
    """Look up scheme metadata from active registry and generate a customized portal DOM."""
    if not scheme_id:
        return DynamicPortalSubagent.render_portal_html(None)

    try:
        from app.domain.scholarships.client import get_db_schemes
        schemes = get_db_schemes()
        matched = next((s for s in schemes if s.id == scheme_id), None)
        if matched:
            return DynamicPortalSubagent.render_portal_html(matched)
    except Exception:
        pass

    return DynamicPortalSubagent.render_portal_html(None)


# Backward compatibility default rendered portal
STATUTORY_PORTAL_HTML = DynamicPortalSubagent.render_portal_html(None)
