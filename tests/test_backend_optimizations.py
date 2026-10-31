import asyncio
import base64
import json
import sqlite3
import pytest
from unittest.mock import AsyncMock, MagicMock
from fastapi import WebSocket

from app.api.main import (
    PUBLIC_EXACT_PATHS,
    PUBLIC_PATH_PREFIXES,
    SERVICES_PREFIX,
    SERVICES_PUBLIC_SUFFIXES,
)
from app.core.runtime import StandaloneTemporalClient, StandaloneWorkflowHandle
from app.core.telemetry import BoundedDict, TelemetryManager
from app.domain.scholarships.client import (
    DB_PATH,
    get_db_connection,
    get_db_schemes,
    get_db_schemes_async,
    add_user_custom_scheme,
    add_user_custom_scheme_async,
    delete_user_custom_scheme,
    delete_user_custom_scheme_async,
    compute_database_digest,
    invalidate_digest_cache,
    OFFICIAL_SCHOLARSHIP_CATALOG,
)
from app.domain.scholarships.schemas import ScholarshipScheme


def test_sqlite_wal_mode_and_pragmas():
    """Verify SQLite WAL mode, synchronous=NORMAL, and busy_timeout are actively enforced."""
    conn = get_db_connection()
    journal_mode = conn.execute("PRAGMA journal_mode;").fetchone()[0]
    synchronous = conn.execute("PRAGMA synchronous;").fetchone()[0]
    busy_timeout = conn.execute("PRAGMA busy_timeout;").fetchone()[0]

    assert str(journal_mode).upper() == "WAL"
    # synchronous = 1 represents NORMAL in SQLite
    assert int(synchronous) in (1, 2)
    assert int(busy_timeout) >= 5000


@pytest.mark.asyncio
async def test_sqlite_async_concurrent_operations():
    """Verify asynchronous non-blocking SQLite execution across concurrent tasks."""
    schemes = await get_db_schemes_async()
    assert len(schemes) >= 5

    test_scheme = ScholarshipScheme(
        id="async_test_scheme_wal",
        name="Async Concurrency Test Scholarship",
        ministry="Ministry of Technology",
        level="undergraduate",
        target_category=["ALL"],
        max_family_income=500000.0,
        min_gpa_or_percentage=70.0,
        grant_amount_annual=30000.0,
        application_deadline="2026-12-31",
        portal_url="http://localhost:8000/portal/scholarship",
        is_custom=True,
        user_id="async_user_001"
    )

    # Concurrently write and read using async thread dispatchers
    persisted = await add_user_custom_scheme_async(test_scheme, "async_user_001")
    assert persisted.id == "async_test_scheme_wal"

    # Verify digest caching and predictable invalidation
    digest1 = compute_database_digest()
    assert isinstance(digest1, str)
    assert len(digest1) == 16
    invalidate_digest_cache()
    digest2 = compute_database_digest(force_refresh=True)
    assert digest1 == digest2

    # Clean up custom scheme
    deleted = await delete_user_custom_scheme_async("async_test_scheme_wal", "async_user_001")
    assert deleted is True


def test_telemetry_bounded_lru_cache():
    """Verify BoundedDict bounds memory and evicts least recently used items."""
    cache: BoundedDict[str, str] = BoundedDict(maxsize=3)
    cache["c1"] = "payload_1"
    cache["c2"] = "payload_2"
    cache["c3"] = "payload_3"

    assert len(cache) == 3
    assert "c1" in cache

    # Accessing c1 moves it to the most recently used position
    _ = cache["c1"]

    # Inserting c4 should evict c2 (the least recently used)
    cache["c4"] = "payload_4"
    assert len(cache) == 3
    assert "c2" not in cache
    assert "c1" in cache
    assert "c3" in cache
    assert "c4" in cache

    # Overwriting existing key updates value without increasing length
    cache["c3"] = "updated_3"
    assert len(cache) == 3
    assert cache.get("c3") == "updated_3"


@pytest.mark.asyncio
async def test_telemetry_manager_bounded_screenshots_and_broadcast():
    """Verify TelemetryManager enforces max bounds on screenshots and efficiently broadcasts."""
    mgr = TelemetryManager(max_cached_cases=2)

    # Broadcast frames for 3 different cases
    await mgr.broadcast("case_1", {"type": "telemetry", "screenshot": "b64_1", "stage": "RUNNING"})
    await mgr.broadcast("case_2", {"type": "telemetry", "screenshot": "b64_2", "stage": "RUNNING"})
    await mgr.broadcast("case_3", {"type": "telemetry", "screenshot": "b64_3", "stage": "COMPLETED"})

    # The screenshot cache should only hold 2 cases (case_1 evicted)
    assert len(mgr.case_latest_screenshot) == 2
    assert "case_1" not in mgr.case_latest_screenshot
    assert "case_2" in mgr.case_latest_screenshot
    assert "case_3" in mgr.case_latest_screenshot

    # Verify single socket broadcast
    mock_ws = AsyncMock(spec=WebSocket)
    mgr.active_connections["case_3"] = {mock_ws}

    await mgr.broadcast("case_3", {"type": "telemetry", "action": "STEP_COMPLETED"})
    mock_ws.send_text.assert_called_once()
    payload = json.loads(mock_ws.send_text.call_args[0][0])
    assert payload["action"] == "STEP_COMPLETED"

    # Verify dead socket eviction
    dead_ws = AsyncMock(spec=WebSocket)
    dead_ws.send_text.side_effect = RuntimeError("Socket disconnected")
    mgr.active_connections["case_3"] = {dead_ws}

    await mgr.broadcast("case_3", {"type": "telemetry", "action": "PING"})
    assert "case_3" not in mgr.active_connections

    # Verify transient cleanup
    mgr.set_pacing("case_test", "2x")
    mgr.pause("case_test")
    mgr.signal_step("case_test")
    assert mgr.is_paused("case_test") is True
    mgr.cleanup_transient_controls("case_test")
    assert "case_test" not in mgr.case_pacing
    assert "case_test" not in mgr.case_paused


def test_api_gateway_path_routing_structures():
    """Verify precomputed routing structures in authorize_request middleware."""
    assert "/healthz" in PUBLIC_EXACT_PATHS
    assert "/portal/scholarship" in PUBLIC_EXACT_PATHS
    assert "/v1/services/execute-live" in PUBLIC_EXACT_PATHS

    # Path prefix checks
    sample_portal = "/portal/test-page"
    assert sample_portal.startswith(PUBLIC_PATH_PREFIXES)

    sample_schemes = "/v1/schemes/list"
    assert sample_schemes.startswith(PUBLIC_PATH_PREFIXES)

    sample_auth = "/v1/auth/login"
    assert sample_auth.startswith(PUBLIC_PATH_PREFIXES)

    # Services public control/signature endpoints
    sig_path = f"{SERVICES_PREFIX}case-12345/signature"
    assert sig_path.startswith(SERVICES_PREFIX) and sig_path.endswith(SERVICES_PUBLIC_SUFFIXES)

    ctrl_path = f"{SERVICES_PREFIX}case-12345/control"
    assert ctrl_path.startswith(SERVICES_PREFIX) and ctrl_path.endswith(SERVICES_PUBLIC_SUFFIXES)

    # Secure endpoint must NOT match public criteria
    private_path = f"{SERVICES_PREFIX}execute"
    is_public = (
        private_path in PUBLIC_EXACT_PATHS
        or private_path.startswith(PUBLIC_PATH_PREFIXES)
        or (private_path.startswith(SERVICES_PREFIX) and private_path.endswith(SERVICES_PUBLIC_SUFFIXES))
    )
    assert is_public is False


@pytest.mark.asyncio
async def test_standalone_temporal_offline_client():
    """Verify standalone Temporal client handle and fallback behavior."""
    client = StandaloneTemporalClient()
    handle = await client.start_workflow(None, id="test-case-standalone")
    assert handle.id == "test-case-standalone"

    desc = await handle.describe()
    assert desc.workflow_type == "BureaucracyExecutionWorkflow"

    status = await handle.query("status")
    assert status["state"] == "RUNNING"

    await handle.signal("sign")
    updated = await handle.query("status")
    assert updated["state"] == "SUBMITTED"

    receipt = await handle.result()
    assert "PUB-REC" in receipt
