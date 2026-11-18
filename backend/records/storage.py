import logging
import re
import requests
from django.conf import settings

logger = logging.getLogger(__name__)

# Basic regex for IPFS CIDv0 (Qm... 46 chars) and CIDv1 (bafy... 59+ chars)
CID_REGEX = re.compile(r"^(Qm[1-9A-HJ-NP-Za-km-z]{44}|bafy[a-z0-9]{50,})$")


class StorageError(RuntimeError):
    pass


def is_valid_cid(cid: str) -> bool:
    if not isinstance(cid, str):
        return False
    return bool(CID_REGEX.match(cid.strip()))


def pin_encrypted_payload(payload: bytes) -> str:
    """
    Pins an encrypted file payload to a local or remote IPFS Kubo node.
    Returns the content identifier (CID), or empty string if KUBO_API_URL is unconfigured.
    """
    if not settings.KUBO_API_URL:
        return ""

    try:
        response = requests.post(
            f"{settings.KUBO_API_URL}/api/v0/add",
            params={"pin": "true", "wrap-with-directory": "false"},
            files={"file": ("encrypted-report.bin", payload, "application/octet-stream")},
            timeout=15,
        )
        response.raise_for_status()
        result = response.json()
        cid = result.get("Hash")
        if not isinstance(cid, str) or not cid:
            raise StorageError("IPFS Kubo node returned no valid content identifier.")
        return cid.strip()
    except requests.RequestException as exc:
        raise StorageError(f"IPFS upload failed (node unreachable or rejected): {exc}") from exc
    except ValueError as exc:
        raise StorageError(f"IPFS node returned invalid JSON response: {exc}") from exc


def fetch_encrypted_payload(cid: str) -> bytes:
    """
    Fetches the encrypted report payload from the configured IPFS Kubo node using its CID.
    """
    if not is_valid_cid(cid):
        raise StorageError(f"Invalid IPFS CID format: {cid}")

    if not settings.KUBO_API_URL:
        raise StorageError("The record references an IPFS CID, but KUBO_API_URL is not configured.")

    try:
        response = requests.post(
            f"{settings.KUBO_API_URL}/api/v0/cat",
            params={"arg": cid.strip()},
            timeout=25,
        )
        response.raise_for_status()
        return response.content
    except requests.RequestException as exc:
        raise StorageError(f"IPFS retrieval failed for CID {cid}: {exc}") from exc
