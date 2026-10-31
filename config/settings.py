import os
from pathlib import Path
from urllib.parse import urlsplit
from dotenv import load_dotenv
from pydantic import AliasChoices, Field, SecretStr, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Automatically locate and load .env from the project's civic-agent directory
ENV_FILE = Path(__file__).resolve().parent.parent / ".env"
if ENV_FILE.exists():
    load_dotenv(ENV_FILE, override=False)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="CIVICAGENT_",
        env_file=(str(ENV_FILE), ".env"),
        extra="ignore"
    )
    vault_url: str = "http://127.0.0.1:8200"
    vault_token: SecretStr = SecretStr("root")
    vault_mount: str = "secret"
    vault_enabled: bool = Field(
        default=False,
        validation_alias=AliasChoices("CIVICAGENT_VAULT_ENABLED", "VAULT_ENABLED", "vault_enabled")
    )
    database_url: SecretStr = SecretStr("sqlite+aiosqlite:///civicagent.db")
    redis_url: SecretStr = SecretStr("redis://localhost:6379/0")
    temporal_address: str = "localhost:7233"
    temporal_mtls_secret: str | None = None
    namespace: str = "default"
    task_queue: str = "civicagent"
    audit_dir: str = "audit"
    audit_bucket: str | None = None
    retention_days: int = Field(default=2192, ge=1)
    citizen_webhook: str = Field(
        default="https://example.gov/webhook",
        validation_alias=AliasChoices("CIVICAGENT_CITIZEN_WEBHOOK", "citizen_webhook", "clinic_webhook")
    )
    session_ttl: int = Field(default=900, ge=30, le=86400)
    model: str = Field(
        default_factory=lambda: os.getenv("CIVICAGENT_MODEL") or os.getenv("MODEL", "gemini-3.5-flash"),
        validation_alias=AliasChoices("CIVICAGENT_MODEL", "MODEL", "model")
    )
    approved_model_endpoint: str | None = None
    gemini_api_key: SecretStr | None = None
    data_gov_api_key: str | None = None

    @model_validator(mode="after")
    def protect_temporal_connection(self):
        address = urlsplit("//" + self.temporal_address)
        if (not address.hostname or address.username is not None or address.path or address.query
                or address.fragment or not address.port or any(c.isspace() for c in self.temporal_address)):
            raise ValueError("Temporal address must be host:port")
        if not self.temporal_mtls_secret and address.hostname not in {"localhost", "127.0.0.1", "::1"}:
            raise ValueError("Remote Temporal requires an mTLS credential")
        return self
