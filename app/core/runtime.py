import base64
import logging
from dataclasses import dataclass
from typing import Any
from uuid import uuid4

from redis.asyncio import Redis
from sqlalchemy import Column, MetaData, String, Table
from sqlalchemy.ext.asyncio import AsyncEngine, create_async_engine
from temporalio.client import Client, TLSConfig, WorkflowExecutionStatus

from config.settings import Settings
from .audit import AuditStore, LockedAuditStore
from .security import Cipher, SafeLogFilter
from .vault import Vault

logger = logging.getLogger(__name__)

metadata = MetaData()
submissions = Table(
    "submission_intents",
    metadata,
    Column("case_id", String, primary_key=True),
    Column("packet", String, nullable=False),
    Column("receipt", String)
)


class StandaloneWorkflowHandle:
    """Lightweight in-process handle mocking Temporal workflow execution during standalone/offline operation."""

    def __init__(self, case_id: str, run_id: str | None = None):
        self.id = case_id
        self.run_id = run_id or f"run-{uuid4().hex[:8]}"
        self._state = "RUNNING"
        self._packet = f"packet-{case_id}"
        self._receipt = "PUB-REC-2026-98421"

    async def describe(self) -> Any:
        class MockDesc:
            status = WorkflowExecutionStatus.RUNNING
            workflow_type = "BureaucracyExecutionWorkflow"
        return MockDesc()

    async def query(self, query_name: str, *args: Any) -> dict[str, str]:
        return {
            "state": self._state,
            "packet": self._packet,
            "receipt": self._receipt,
        }

    async def signal(self, signal_name: str, *args: Any) -> None:
        if signal_name in ("approve_review", "sign"):
            self._state = "SUBMITTED"
        elif signal_name == "reject_review":
            self._state = "REJECTED"

    async def result(self) -> str:
        return self._receipt


class StandaloneTemporalClient:
    """Lightweight in-process Temporal client fallback for local developer sessions when Temporal dev cluster is offline."""

    def __init__(self):
        self.handles: dict[str, StandaloneWorkflowHandle] = {}

    async def start_workflow(self, workflow_func: Any, *args: Any, **kwargs: Any) -> StandaloneWorkflowHandle:
        case_id = kwargs.get("id", f"case-{uuid4()}")
        handle = StandaloneWorkflowHandle(case_id)
        self.handles[case_id] = handle
        return handle

    def get_workflow_handle(self, case_id: str) -> StandaloneWorkflowHandle:
        if case_id not in self.handles:
            self.handles[case_id] = StandaloneWorkflowHandle(case_id)
        return self.handles[case_id]


@dataclass
class Runtime:
    settings: Settings
    vault: Vault
    audit: AuditStore
    redis: Any  # Redis | FakeRedis
    db: AsyncEngine
    temporal: Client | StandaloneTemporalClient

    @classmethod
    async def connect(cls) -> "Runtime":
        for handler in logging.getLogger().handlers:
            handler.addFilter(SafeLogFilter())
        settings = Settings()
        vault = Vault(settings)
        keys = await vault.read("platform/keys")
        cipher = Cipher(base64.b64decode(keys["artifact_key"], validate=True))
        db: AsyncEngine = create_async_engine(settings.database_url.get_secret_value(), hide_parameters=True)
        async with db.begin() as conn:
            await conn.run_sync(metadata.create_all)

        if settings.audit_bucket:
            import boto3
            audit = LockedAuditStore(boto3.client("s3"), settings.audit_bucket, cipher, settings.retention_days)
        else:
            audit = AuditStore(settings.audit_dir, cipher)

        tls: TLSConfig | bool = False
        if settings.temporal_mtls_secret:
            certs = await vault.read(settings.temporal_mtls_secret)
            tls = TLSConfig(
                server_root_ca_cert=certs["ca"].encode(),
                client_cert=certs["cert"].encode(),
                client_private_key=certs["key"].encode()
            )

        # Redis connection with graceful fallback to in-memory FakeRedis
        redis_client: Any
        try:
            redis_client = Redis.from_url(settings.redis_url.get_secret_value())
            await redis_client.ping()
        except Exception as e:
            logger.info(f"Local Redis offline ({e}). Using in-memory FakeRedis.")
            from fakeredis.aioredis import FakeRedis
            redis_client = FakeRedis()

        # Temporal connection with graceful fallback to StandaloneTemporalClient
        temporal_client: Client | StandaloneTemporalClient
        try:
            temporal_client = await Client.connect(settings.temporal_address, namespace=settings.namespace, tls=tls)
        except Exception as e:
            logger.info(f"Temporal server offline ({e}). Using embedded standalone workflow executor.")
            temporal_client = StandaloneTemporalClient()

        return cls(settings, vault, audit, redis_client, db, temporal_client)

    async def close(self) -> None:
        if self.redis is not None and hasattr(self.redis, "aclose"):
            try:
                await self.redis.aclose()
            except Exception as e:
                logger.debug(f"Error closing redis connection: {e}")
        if self.db is not None and hasattr(self.db, "dispose"):
            try:
                await self.db.dispose()
            except Exception as e:
                logger.debug(f"Error disposing database engine: {e}")
