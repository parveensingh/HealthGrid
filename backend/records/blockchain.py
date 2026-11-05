import json
from pathlib import Path

from django.conf import settings
from requests import RequestException
from web3.exceptions import Web3Exception
from web3 import Web3


class BlockchainError(RuntimeError):
    pass


def log_on_chain(record_id, action, actor):
    if not settings.BLOCKCHAIN_RPC_URL:
        return None

    deployment_path = Path(settings.BLOCKCHAIN_DEPLOYMENT_FILE)
    if not deployment_path.is_file():
        raise BlockchainError(
            "Blockchain logging is enabled, but the contract deployment file is missing."
        )
    if not settings.BLOCKCHAIN_ACCOUNT:
        raise BlockchainError("BLOCKCHAIN_ACCOUNT is required when blockchain logging is enabled.")

    try:
        deployment = json.loads(deployment_path.read_text(encoding="utf-8"))
        web3 = Web3(Web3.HTTPProvider(settings.BLOCKCHAIN_RPC_URL, request_kwargs={"timeout": 5}))
        if not web3.is_connected():
            raise BlockchainError("Could not connect to the configured blockchain RPC.")
        contract = web3.eth.contract(
            address=Web3.to_checksum_address(deployment["address"]),
            abi=deployment["abi"],
        )
        tx_hash = contract.functions.logEvent(
            str(record_id),
            action[:32],
            actor[:120],
        ).transact({"from": Web3.to_checksum_address(settings.BLOCKCHAIN_ACCOUNT)})
        receipt = web3.eth.wait_for_transaction_receipt(tx_hash, timeout=15)
        if receipt["status"] != 1:
            raise BlockchainError("The blockchain audit transaction failed.")
        return tx_hash.hex()
    except (OSError, ValueError, KeyError, RequestException, Web3Exception) as exc:
        raise BlockchainError(f"Blockchain audit failed: {exc}") from exc
