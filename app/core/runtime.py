import base64
import logging
from dataclasses import dataclass
from redis.asyncio import Redis
from sqlalchemy import Column, MetaData, String, Table
from sqlalchemy.ext.asyncio import create_async_engine
from temporalio.client import Client, TLSConfig
from config.settings import Settings
from .audit import AuditStore, LockedAuditStore
from .security import Cipher, SafeLogFilter
from .vault import Vault

metadata = MetaData()
submissions = Table("submission_intents", metadata, Column("case_id", String, primary_key=True),
                    Column("packet", String, nullable=False), Column("receipt", String))


@dataclass
class Runtime:
    settings: Settings
    vault: Vault
    audit: AuditStore
    redis: Redis
    db: object
    temporal: Client

    @classmethod
    async def connect(cls):
        for handler in logging.getLogger().handlers:
            handler.addFilter(SafeLogFilter())
        settings = Settings()
        vault = Vault(settings)
        keys = await vault.read("platform/keys")
        cipher = Cipher(base64.b64decode(keys["artifact_key"], validate=True))
        db = create_async_engine(settings.database_url.get_secret_value(), hide_parameters=True)
        async with db.begin() as conn:
            await conn.run_sync(metadata.create_all)
        if settings.audit_bucket:
            import boto3
            audit = LockedAuditStore(boto3.client("s3"), settings.audit_bucket, cipher, settings.retention_days)
        else:
            audit = AuditStore(settings.audit_dir, cipher)
        tls = False
        if settings.temporal_mtls_secret:
            certs = await vault.read(settings.temporal_mtls_secret)
            tls = TLSConfig(server_root_ca_cert=certs["ca"].encode(), client_cert=certs["cert"].encode(),
                            client_private_key=certs["key"].encode())
        return cls(settings, vault, audit,
                   Redis.from_url(settings.redis_url.get_secret_value()), db,
                   await Client.connect(settings.temporal_address, namespace=settings.namespace, tls=tls))

    async def close(self):
        await self.redis.aclose()
        await self.db.dispose()
