import pytest
from pydantic import ValidationError
from config.settings import Settings


def test_remote_temporal_requires_mutual_authentication():
    cfg = dict(vault_url="http://localhost:8200", vault_token="test", database_url="test",
               redis_url="test", clinic_webhook="https://clinic.example", _env_file=None)
    with pytest.raises(ValidationError, match="mTLS"):
        Settings(**cfg, temporal_address="temporal.internal:7233", temporal_mtls_secret=None)
    assert Settings(**cfg, temporal_address="temporal.internal:7233",
                    temporal_mtls_secret="platform/temporal").temporal_mtls_secret
    assert Settings(**cfg, temporal_address="[::1]:7233", temporal_mtls_secret=None)
