import hashlib
import hmac
import os

from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from django.conf import settings


def _record_key(record_id):
    root = settings.SECRET_KEY.encode("utf-8")
    return hmac.new(root, b"securechain-demo:" + str(record_id).encode("ascii"), hashlib.sha256).digest()


def encrypt_file(record_id, plaintext):
    nonce = os.urandom(12)
    ciphertext = AESGCM(_record_key(record_id)).encrypt(nonce, plaintext, str(record_id).encode("ascii"))
    return b"SC01" + nonce + ciphertext


def decrypt_file(record_id, payload):
    if len(payload) < 32 or payload[:4] != b"SC01":
        raise ValueError("Stored file has an invalid or unsupported encryption format.")
    nonce = payload[4:16]
    return AESGCM(_record_key(record_id)).decrypt(
        nonce,
        payload[16:],
        str(record_id).encode("ascii"),
    )
