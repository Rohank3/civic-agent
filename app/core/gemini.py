import asyncio
import hashlib
import json
import logging
import os
import threading
import time
from typing import Any
from dotenv import load_dotenv
import httpx

load_dotenv()

logger = logging.getLogger(__name__)

DEFAULT_FALLBACK_KEYS: list[str] = []

_EXHAUSTED_KEYS: dict[str, float] = {}
_ROTATION_LOCK = threading.Lock()
_CACHE_LOCK = threading.Lock()
_RESPONSE_CACHE: dict[str, tuple[dict[str, Any], float]] = {}
CACHE_TTL_SECONDS = 900.0  # 15 minutes in-memory caching for identical documents/prompts


def _hash_payload(payload: dict[str, Any]) -> str:
    """Generate deterministic SHA-256 hash of API payload to prevent redundant quota burn."""
    serialized = json.dumps(payload, sort_keys=True)
    return hashlib.sha256(serialized.encode("utf-8")).hexdigest()


def _get_cached_response(payload: dict[str, Any]) -> httpx.Response | None:
    cache_key = _hash_payload(payload)
    now = time.monotonic()
    with _CACHE_LOCK:
        if cache_key in _RESPONSE_CACHE:
            cached_data, cached_at = _RESPONSE_CACHE[cache_key]
            if now - cached_at < CACHE_TTL_SECONDS:
                logger.info(f"Serving Gemini AI response from memory cache [{cache_key[:8]}] (0ms latency, 0 quota)")
                return httpx.Response(status_code=200, json=cached_data, headers={"Content-Type": "application/json"})
            else:
                del _RESPONSE_CACHE[cache_key]
    return None


def _set_cached_response(payload: dict[str, Any], data: dict[str, Any]) -> None:
    cache_key = _hash_payload(payload)
    with _CACHE_LOCK:
        if len(_RESPONSE_CACHE) > 500:
            # Simple eviction
            _RESPONSE_CACHE.clear()
        _RESPONSE_CACHE[cache_key] = (data, time.monotonic())


def _get_key_pool() -> list[dict[str, str]]:
    """Build the tiered list of Gemini API credentials and target models."""
    tiers: list[dict[str, str]] = []

    primary_key = os.getenv("CIVICAGENT_GEMINI_API_KEY") or os.getenv("GEMINI_API_KEY")
    primary_model = os.getenv("CIVICAGENT_MODEL") or "gemini-flash-lite-latest"
    if primary_key:
        tiers.append({
            "key": primary_key.strip(),
            "model": primary_model.strip(),
            "tier_name": f"Primary Key ({primary_model})",
            "is_fallback": False,
        })

    raw_fallbacks = os.getenv("CIVICAGENT_GEMINI_FALLBACK_KEYS")
    fallback_keys = (
        [k.strip() for k in raw_fallbacks.split(",") if k.strip()]
        if raw_fallbacks
        else list(DEFAULT_FALLBACK_KEYS)
    )
    fallback_model = os.getenv("CIVICAGENT_FALLBACK_MODEL") or "gemini-flash-lite-latest"

    for idx, fkey in enumerate(fallback_keys):
        if primary_key and fkey == primary_key.strip():
            continue
        tiers.append({
            "key": fkey,
            "model": fallback_model,
            "tier_name": f"Fallback Key {idx + 1} ({fallback_model})",
            "is_fallback": True,
        })

    return tiers


def _is_key_exhausted(key: str) -> bool:
    with _ROTATION_LOCK:
        expiry = _EXHAUSTED_KEYS.get(key)
        if expiry is None:
            return False
        if time.monotonic() > expiry:
            del _EXHAUSTED_KEYS[key]
            return False
        return True


def _mark_key_exhausted(key: str, cooldown_seconds: float = 120.0) -> None:
    with _ROTATION_LOCK:
        _EXHAUSTED_KEYS[key] = time.monotonic() + cooldown_seconds


def _mask_key(key: str) -> str:
    if len(key) <= 12:
        return "***"
    return f"{key[:8]}...{key[-4:]}"


def gemini_post_sync(
    payload: dict[str, Any],
    client: httpx.Client | None = None,
    timeout: float = 20.0,
) -> httpx.Response | None:
    """Execute Gemini generateContent synchronously with LRU cache, key rotation, and model fallback."""
    cached = _get_cached_response(payload)
    if cached is not None:
        return cached

    tiers = _get_key_pool()
    if not tiers:
        logger.warning("No Gemini API keys configured.")
        return None

    owns_client = client is None
    http = client or httpx.Client(timeout=timeout)

    try:
        for tier in tiers:
            key = tier["key"]
            model = tier["model"]
            tier_name = tier["tier_name"]

            if _is_key_exhausted(key):
                logger.debug(f"Skipping temporarily exhausted key: {_mask_key(key)}")
                continue

            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}"
            try:
                logger.info(f"Dispatching Gemini request via {tier_name} [{_mask_key(key)}]...")
                resp = http.post(
                    url,
                    headers={"Content-Type": "application/json"},
                    json=payload,
                    timeout=timeout,
                )

                if resp.status_code == 200:
                    try:
                        _set_cached_response(payload, resp.json())
                    except Exception:
                        pass
                    return resp

                if resp.status_code in (429, 403):
                    logger.warning(
                        f"{tier_name} [{_mask_key(key)}] reached quota limit (HTTP {resp.status_code}). "
                        f"Rotating to next available fallback tier..."
                    )
                    _mark_key_exhausted(key, cooldown_seconds=120.0)
                    continue

                if resp.status_code == 404:
                    logger.info(
                        f"Model {model} returned 404 on {_mask_key(key)}. "
                        f"Auto-negotiating to gemini-flash-lite-latest..."
                    )
                    url_retry = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key={key}"
                    resp_retry = http.post(
                        url_retry,
                        headers={"Content-Type": "application/json"},
                        json=payload,
                        timeout=timeout,
                    )
                    if resp_retry.status_code == 200:
                        try:
                            _set_cached_response(payload, resp_retry.json())
                        except Exception:
                            pass
                        return resp_retry
                    if resp_retry.status_code in (429, 403):
                        _mark_key_exhausted(key, cooldown_seconds=120.0)
                        continue

                logger.warning(f"Gemini call on {tier_name} failed with HTTP {resp.status_code}: {resp.text[:120]}")

            except httpx.TimeoutException:
                logger.warning(f"Timeout on {tier_name} [{_mask_key(key)}], attempting next tier...")
                continue
            except Exception as exc:
                logger.warning(f"Error calling {tier_name} [{_mask_key(key)}]: {exc}")
                continue

    finally:
        if owns_client:
            http.close()

    return None


async def gemini_post_async(
    payload: dict[str, Any],
    client: httpx.AsyncClient | None = None,
    timeout: float = 20.0,
) -> httpx.Response | None:
    """Execute Gemini generateContent asynchronously with LRU cache, key rotation, and model fallback."""
    cached = _get_cached_response(payload)
    if cached is not None:
        return cached

    tiers = _get_key_pool()
    if not tiers:
        logger.warning("No Gemini API keys configured.")
        return None

    owns_client = client is None
    http = client or httpx.AsyncClient(timeout=timeout)

    try:
        for tier in tiers:
            key = tier["key"]
            model = tier["model"]
            tier_name = tier["tier_name"]

            if _is_key_exhausted(key):
                logger.debug(f"Skipping temporarily exhausted key: {_mask_key(key)}")
                continue

            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}"
            try:
                logger.info(f"Dispatching async Gemini request via {tier_name} [{_mask_key(key)}]...")
                resp = await http.post(
                    url,
                    headers={"Content-Type": "application/json"},
                    json=payload,
                    timeout=timeout,
                )

                if resp.status_code == 200:
                    try:
                        _set_cached_response(payload, resp.json())
                    except Exception:
                        pass
                    return resp

                if resp.status_code in (429, 403):
                    logger.warning(
                        f"{tier_name} [{_mask_key(key)}] reached quota limit (HTTP {resp.status_code}). "
                        f"Rotating to next available fallback tier..."
                    )
                    _mark_key_exhausted(key, cooldown_seconds=120.0)
                    continue

                if resp.status_code == 404:
                    logger.info(
                        f"Model {model} returned 404 on {_mask_key(key)}. "
                        f"Auto-negotiating to gemini-flash-lite-latest..."
                    )
                    url_retry = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key={key}"
                    resp_retry = await http.post(
                        url_retry,
                        headers={"Content-Type": "application/json"},
                        json=payload,
                        timeout=timeout,
                    )
                    if resp_retry.status_code == 200:
                        try:
                            _set_cached_response(payload, resp_retry.json())
                        except Exception:
                            pass
                        return resp_retry
                    if resp_retry.status_code in (429, 403):
                        _mark_key_exhausted(key, cooldown_seconds=120.0)
                        continue

                logger.warning(f"Async Gemini call on {tier_name} failed with HTTP {resp.status_code}: {resp.text[:120]}")

            except httpx.TimeoutException:
                logger.warning(f"Timeout on async {tier_name} [{_mask_key(key)}], attempting next tier...")
                continue
            except Exception as exc:
                logger.warning(f"Error calling async {tier_name} [{_mask_key(key)}]: {exc}")
                continue

    finally:
        if owns_client:
            await http.aclose()

    return None
