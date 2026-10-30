from urllib.parse import urlsplit
from pydantic import Field, SecretStr, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="CIVICAGENT_", env_file=".env", extra="ignore")
    vault_url: str = "http://127.0.0.1:8200"
    vault_token: SecretStr = SecretStr("root")
    vault_mount: str = "secret"
    database_url: SecretStr = SecretStr("sqlite+aiosqlite:///civicagent.db")
    redis_url: SecretStr = SecretStr("redis://localhost:6379/0")
    temporal_address: str = "localhost:7233"
    temporal_mtls_secret: str | None = None
    namespace: str = "default"
    task_queue: str = "civicagent"
    audit_dir: str = "audit"
    audit_bucket: str | None = None
    retention_days: int = Field(default=2192, ge=1)
    citizen_webhook: str = "https://example.gov/webhook"
    session_ttl: int = Field(default=900, ge=30, le=86400)
    model: str = "gemini-2.0-flash"
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
