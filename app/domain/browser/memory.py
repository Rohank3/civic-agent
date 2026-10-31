import hashlib
import json
import logging
from typing import Any
from urllib.parse import urlsplit

logger = logging.getLogger(__name__)


class PortalMemory:
    """Redis-backed persistent memory cache for learned portal selectors with L1 local caching."""

    def __init__(self, redis: Any = None):
        self.redis = redis
        self._local_cache: dict[str, dict[str, str]] = {}

    def _cache_key(self, portal_url: str, service_id: str) -> str:
        parsed = urlsplit(portal_url)
        origin = f"{parsed.scheme}://{parsed.netloc}"
        origin_hash = hashlib.sha256(origin.encode("utf-8")).hexdigest()[:16]
        return f"portal_memory:{origin_hash}:{service_id}"

    async def get_learned_selectors(self, portal_url: str, service_id: str) -> dict[str, str]:
        """Fetch previously learned selector map for this portal and service (L1 local -> L2 Redis)."""
        key = self._cache_key(portal_url, service_id)
        if key in self._local_cache:
            return dict(self._local_cache[key])

        if self.redis:
            try:
                cached = await self.redis.get(key)
                if cached:
                    if isinstance(cached, bytes):
                        cached = cached.decode("utf-8")
                    data = json.loads(cached)
                    if isinstance(data, dict):
                        self._local_cache[key] = data
                        return dict(data)
            except Exception as e:
                logger.debug(f"Redis memory read error: {e}")

        return {}

    async def record_learned_selectors(self, portal_url: str, service_id: str, selectors: dict[str, str]) -> None:
        """Record or update verified selectors for future fast-path execution."""
        if not selectors:
            return
        key = self._cache_key(portal_url, service_id)
        current = self._local_cache.get(key, {})
        merged = {**current, **selectors}
        self._local_cache[key] = merged

        if self.redis:
            try:
                await self.redis.set(key, json.dumps(merged), ex=86400 * 30)  # 30-day cache
            except Exception as e:
                logger.debug(f"Redis memory write error: {e}")
