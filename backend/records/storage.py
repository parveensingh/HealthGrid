import requests
from django.conf import settings


class StorageError(RuntimeError):
    pass


def pin_encrypted_payload(payload):
    if not settings.KUBO_API_URL:
        return ""
    try:
        response = requests.post(
            f"{settings.KUBO_API_URL}/api/v0/add",
            params={"pin": "true", "wrap-with-directory": "false"},
            files={"file": ("encrypted-report.bin", payload, "application/octet-stream")},
            timeout=30,
        )
        response.raise_for_status()
        result = response.json()
        cid = result.get("Hash")
        if not isinstance(cid, str) or not cid:
            raise StorageError("IPFS node returned no content identifier.")
        return cid
    except requests.RequestException as exc:
        raise StorageError(f"IPFS upload failed: {exc}") from exc
    except ValueError as exc:
        raise StorageError(f"IPFS node returned invalid JSON: {exc}") from exc


def fetch_encrypted_payload(cid):
    if not settings.KUBO_API_URL:
        raise StorageError("The record is pinned to IPFS, but KUBO_API_URL is not configured.")
    try:
        response = requests.post(
            f"{settings.KUBO_API_URL}/api/v0/cat",
            params={"arg": cid},
            timeout=30,
        )
        response.raise_for_status()
        return response.content
    except requests.RequestException as exc:
        raise StorageError(f"IPFS retrieval failed: {exc}") from exc
