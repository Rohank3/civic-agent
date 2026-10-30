import base64
import logging
import os
from cryptography.hazmat.primitives.ciphers.aead import AESGCM


class Cipher:
    def __init__(self, key: bytes):
        if len(key) != 32:
            raise ValueError("Expected a 256-bit key")
        self.aead = AESGCM(key)

    def seal(self, data: bytes, purpose: str) -> bytes:
        nonce = os.urandom(12)
        return nonce + self.aead.encrypt(nonce, data, purpose.encode())

    def open(self, data: bytes, purpose: str) -> bytes:
        return self.aead.decrypt(data[:12], data[12:], purpose.encode())


class SafeLogFilter(logging.Filter):
    """Allow only operational event names. Discard exception bodies and arguments."""
    def filter(self, record):
        if record.msg not in ("worker_ready", "activity_completed", "activity_failed"):
            record.msg = "redacted_event"
        record.args = ()
        record.exc_info = record.exc_text = record.stack_info = None
        return True
