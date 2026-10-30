from urllib.parse import urlsplit
from pydantic import Field, SecretStr, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="MEDAUTO_", env_file=".env", extra="ignore")
    vault_url: str
    vault_token: SecretStr
    vault_mount: str = "secret"
    database_url: SecretStr
    redis_url: SecretStr
    temporal_address: str = "localhost:7233"
    temporal_mtls_secret: str | None = None
    namespace: str = "default"
    task_queue: str = "medauto"
    audit_dir: str = "audit"
    audit_bucket: str | None = None
    retention_days: int = Field(default=2192, ge=1)
    clinic_webhook: str
    session_ttl: int = Field(default=900, ge=30, le=86400)
    model: str | None = None
    approved_model_endpoint: str | None = None

    @model_validator(mode="after")
    def protect_temporal_connection(self):
        address = urlsplit("//" + self.temporal_address)
        if (not address.hostname or address.username is not None or address.path or address.query
                or address.fragment or not address.port or any(c.isspace() for c in self.temporal_address)):
            raise ValueError("Temporal address must be host:port")
        if not self.temporal_mtls_secret and address.hostname not in {"localhost", "127.0.0.1", "::1"}:
            raise ValueError("Remote Temporal requires an mTLS credential")
        return self
