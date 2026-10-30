from pydantic import Field, SecretStr
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
