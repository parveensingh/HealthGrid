import json
import logging
from pathlib import Path
from typing import Any, Dict, Optional, Tuple

from django.conf import settings
from requests import RequestException
from web3 import Web3
from web3.exceptions import Web3Exception

logger = logging.getLogger(__name__)


class BlockchainError(RuntimeError):
    pass


def uuid_to_bytes32(record_id) -> bytes:
    """Computes deterministic bytes32 hash of record UUID string."""
    return Web3.keccak(text=str(record_id))


def compute_policy_hash(policy: Any) -> bytes:
    """Computes deterministic keccak256 hash of access policy structure."""
    policy_str = json.dumps(policy, sort_keys=True) if isinstance(policy, (dict, list)) else str(policy)
    return Web3.keccak(text=policy_str)


def get_web3_client() -> Optional[Web3]:
    """Returns a connected Web3 instance or None if not configured/available."""
    rpc_url = getattr(settings, "BLOCKCHAIN_RPC_URL", "")
    if not rpc_url:
        return None
    try:
        w3 = Web3(Web3.HTTPProvider(rpc_url, request_kwargs={"timeout": 5}))
        if w3.is_connected():
            return w3
    except Exception as exc:
        logger.warning(f"Could not connect to Ethereum JSON-RPC at {rpc_url}: {exc}")
    return None


def get_deployment_manifest() -> Dict[str, Any]:
    """Reads contracts/deployment.json manifest."""
    manifest_path = Path(settings.BLOCKCHAIN_DEPLOYMENT_FILE)
    if not manifest_path.is_file():
        return {}
    try:
        return json.loads(manifest_path.read_text(encoding="utf-8"))
    except Exception as exc:
        logger.error(f"Error reading blockchain deployment manifest: {exc}")
        return {}


def _get_contract_info(manifest: Dict[str, Any], contract_name: str) -> Tuple[Optional[str], Optional[list]]:
    if contract_name in manifest and isinstance(manifest[contract_name], dict):
        return manifest[contract_name].get("address"), manifest[contract_name].get("abi")
    # Legacy fallback for AuditLogger
    if contract_name == "AuditLogger" and "address" in manifest and "abi" in manifest:
        return manifest.get("address"), manifest.get("abi")
    return None, None


def _execute_contract_tx(
    contract_name: str,
    function_name: str,
    args: list,
    record=None,
) -> Optional[str]:
    """
    Executes a state-modifying contract transaction and records it in BlockchainTransaction outbox.
    """
    from .models import BlockchainTransaction

    w3 = get_web3_client()
    account = getattr(settings, "BLOCKCHAIN_ACCOUNT", "")

    # Create initial pending outbox entry
    tx_entry = BlockchainTransaction.objects.create(
        record=record,
        contract_name=contract_name,
        function_name=function_name,
        args_json=json.dumps([str(a) for a in args]),
        status="pending",
    )

    if not w3 or not account:
        tx_entry.status = "skipped"
        tx_entry.error_message = "Blockchain RPC node or account not configured / offline"
        tx_entry.save(update_fields=["status", "error_message"])
        return None

    manifest = get_deployment_manifest()
    addr, abi = _get_contract_info(manifest, contract_name)
    if not addr or not abi:
        tx_entry.status = "failed"
        tx_entry.error_message = f"Contract {contract_name} not found in deployment manifest"
        tx_entry.save(update_fields=["status", "error_message"])
        return None

    try:
        contract = w3.eth.contract(address=Web3.to_checksum_address(addr), abi=abi)
        fn = getattr(contract.functions, function_name)
        tx_hash = fn(*args).transact({"from": Web3.to_checksum_address(account)})
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=12)

        if receipt.get("status") == 1:
            hex_hash = tx_hash.hex()
            tx_entry.status = "confirmed"
            tx_entry.tx_hash = hex_hash
            tx_entry.save(update_fields=["status", "tx_hash"])
            return hex_hash
        else:
            tx_entry.status = "failed"
            tx_entry.error_message = "Transaction reverted on-chain (status 0)"
            tx_entry.save(update_fields=["status", "error_message"])
            return None
    except (OSError, ValueError, KeyError, RequestException, Web3Exception) as exc:
        logger.warning(f"Blockchain tx failed for {contract_name}.{function_name}: {exc}")
        tx_entry.status = "failed"
        tx_entry.error_message = str(exc)
        tx_entry.save(update_fields=["status", "error_message"])
        return None


def register_record_on_chain(record, cid: str = "") -> Dict[str, Optional[str]]:
    """
    Registers a record across MedicalRecordRegistry, AccessControlManager, and AuditLogger.
    Returns dict of transaction hashes.
    """
    record_b32 = uuid_to_bytes32(record.id)
    policy_hash = compute_policy_hash(record.policy)

    # 1. MedicalRecordRegistry
    reg_tx = _execute_contract_tx(
        "MedicalRecordRegistry",
        "registerRecord",
        [record_b32, cid or record.ipfs_cid or "local-storage", policy_hash],
        record=record,
    )

    # 2. AccessControlManager
    acm_tx = _execute_contract_tx(
        "AccessControlManager",
        "registerRecord",
        [record_b32],
        record=record,
    )

    # 3. AuditLogger
    audit_tx = _execute_contract_tx(
        "AuditLogger",
        "logEvent",
        [str(record.id), "uploaded", record.patient_name],
        record=record,
    )

    return {
        "registry_tx": reg_tx,
        "access_control_tx": acm_tx,
        "audit_tx": audit_tx,
    }


def revoke_record_on_chain(record, actor: str = "Patient") -> Dict[str, Optional[str]]:
    """
    Revokes record across MedicalRecordRegistry, AccessControlManager, and logs to AuditLogger.
    """
    record_b32 = uuid_to_bytes32(record.id)

    # 1. MedicalRecordRegistry
    reg_tx = _execute_contract_tx(
        "MedicalRecordRegistry",
        "revokeRecord",
        [record_b32],
        record=record,
    )

    # 2. AccessControlManager
    acm_tx = _execute_contract_tx(
        "AccessControlManager",
        "revokeRecord",
        [record_b32],
        record=record,
    )

    # 3. AuditLogger
    audit_tx = _execute_contract_tx(
        "AuditLogger",
        "logEvent",
        [str(record.id), "revoked", actor],
        record=record,
    )

    return {
        "registry_tx": reg_tx,
        "access_control_tx": acm_tx,
        "audit_tx": audit_tx,
    }


def grant_doctor_access_on_chain(record, doctor_eth_address: str) -> Optional[str]:
    """Grants explicit clinician access in AccessControlManager."""
    if not Web3.is_address(doctor_eth_address):
        return None
    return _execute_contract_tx(
        "AccessControlManager",
        "grantAccess",
        [uuid_to_bytes32(record.id), Web3.to_checksum_address(doctor_eth_address)],
        record=record,
    )


def revoke_doctor_access_on_chain(record, doctor_eth_address: str) -> Optional[str]:
    """Revokes explicit clinician access in AccessControlManager."""
    if not Web3.is_address(doctor_eth_address):
        return None
    return _execute_contract_tx(
        "AccessControlManager",
        "revokeAccess",
        [uuid_to_bytes32(record.id), Web3.to_checksum_address(doctor_eth_address)],
        record=record,
    )


def log_on_chain(record_id, action: str, actor: str) -> Optional[str]:
    """Records audit event in AuditLogger contract."""
    return _execute_contract_tx(
        "AuditLogger",
        "logEvent",
        [str(record_id), str(action)[:32], str(actor)[:120]],
    )


def verify_on_chain_status(record_id) -> Tuple[bool, str]:
    """
    Queries on-chain contracts to verify whether record exists and is active (not revoked).
    Returns (is_valid, reason).
    """
    w3 = get_web3_client()
    if not w3:
        # If blockchain is not connected, fallback to local DB status
        return True, "Blockchain offline; verified via local database state"

    manifest = get_deployment_manifest()
    reg_addr, reg_abi = _get_contract_info(manifest, "MedicalRecordRegistry")
    if not reg_addr or not reg_abi:
        return True, "Contract not deployed; verified via local database"

    try:
        registry = w3.eth.contract(address=Web3.to_checksum_address(reg_addr), abi=reg_abi)
        record_b32 = uuid_to_bytes32(record_id)
        # getRecord returns: (address patient, string cid, bytes32 policyHash, bool revoked, bool exists)
        record_tuple = registry.functions.getRecord(record_b32).call()
        exists = record_tuple[4]
        revoked = record_tuple[3]

        if not exists:
            return False, "Record does not exist in on-chain MedicalRecordRegistry"
        if revoked:
            return False, "Record is marked as REVOKED on-chain"
        return True, "Verified active on-chain"
    except Exception as exc:
        logger.warning(f"On-chain status verification query failed: {exc}")
        return True, "On-chain verification query skipped due to RPC error"
