import hashlib
import hmac
import logging
import os

from cryptography.exceptions import InvalidTag
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from django.conf import settings

logger = logging.getLogger(__name__)


def _get_master_key() -> bytes:
    """
    Returns the designated HealthGrid master encryption secret,
    falling back to Django's SECRET_KEY if not explicitly defined.
    """
    custom = getattr(settings, "HEALTHGRID_ENCRYPTION_MASTER_KEY", "")
    if custom and len(custom.strip()) >= 16:
        return custom.strip().encode("utf-8")
    return settings.SECRET_KEY.encode("utf-8")


def _derive_record_key(record_id) -> bytes:
    """
    Derives a cryptographically strong 256-bit AES key for the given record ID
    using HKDF-SHA256 with explicit domain separation and salt.
    """
    master_key = _get_master_key()
    hkdf = HKDF(
        algorithm=hashes.SHA256(),
        length=32,
        salt=b"healthgrid-aes-gcm-v2-salt",
        info=b"healthgrid:record-encryption:" + str(record_id).encode("utf-8"),
    )
    return hkdf.derive(master_key)


def encrypt_file(record_id, plaintext: bytes) -> bytes:
    """
    Encrypts medical payload using AES-256-GCM.
    Prefixes output with 4-byte version tag 'HG02' + 12-byte random nonce + ciphertext with auth tag.
    AAD binds the ciphertext to the record ID.
    """
    if not isinstance(plaintext, (bytes, bytearray)):
        raise TypeError("Plaintext must be bytes or bytearray.")

    key = _derive_record_key(record_id)
    nonce = os.urandom(12)
    aad = b"HG02:" + str(record_id).encode("ascii")

    aesgcm = AESGCM(key)
    ciphertext = aesgcm.encrypt(nonce, bytes(plaintext), aad)
    return b"HG02" + nonce + ciphertext


def decrypt_file(record_id, payload: bytes) -> bytes:
    """
    Decrypts an encrypted payload using AES-256-GCM, verifying authenticity.
    Supports current 'HG02' format and legacy 'SC01' format.
    Raises InvalidTag if tampered, or ValueError on corrupted headers.
    """
    if not isinstance(payload, (bytes, bytearray)) or len(payload) < 28:
        raise ValueError("Stored payload is too short to be a valid encrypted medical report.")

    prefix = payload[:4]
    nonce = payload[4:16]
    ciphertext = payload[16:]

    if prefix == b"HG02":
        key = _derive_record_key(record_id)
        aad = b"HG02:" + str(record_id).encode("ascii")
        aesgcm = AESGCM(key)
        return aesgcm.decrypt(nonce, ciphertext, aad)
    elif prefix == b"SC01":
        # Legacy format backward compatibility
        root = settings.SECRET_KEY.encode("utf-8")
        legacy_key = hmac.new(root, b"securechain-demo:" + str(record_id).encode("ascii"), hashlib.sha256).digest()
        legacy_aad = str(record_id).encode("ascii")
        aesgcm = AESGCM(legacy_key)
        return aesgcm.decrypt(nonce, ciphertext, legacy_aad)
    else:
        raise ValueError(f"Unknown or unsupported encryption header prefix: {prefix!r}")
