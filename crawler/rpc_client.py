import os
from web3 import Web3
from dotenv import load_dotenv

load_dotenv()

RPC_URL = os.getenv("RPC_URL", "https://ethereum-sepolia-rpc.publicnode.com")
w3 = Web3(Web3.HTTPProvider(RPC_URL))


def get_latest_block_number() -> int:
    return w3.eth.block_number


def get_block_by_number(block_number: int):
    return w3.eth.get_block(block_number, full_transactions=True)


def get_block_receipts(block_number: int) -> list:
    """Fetch all transaction receipts for a block in a single RPC call."""
    response = w3.provider.make_request("eth_getBlockReceipts", [hex(block_number)])
    return response.get("result") or []
