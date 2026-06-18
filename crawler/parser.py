TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"


def to_hex(value) -> str:
    h = value.hex() if hasattr(value, "hex") else str(value)
    return h if h.startswith("0x") else "0x" + h


def parse_native_transaction(tx, receipt, block_timestamp) -> dict:
    return {
        "hash": to_hex(tx["hash"]),
        "block_number": tx["blockNumber"],
        "from_address": tx["from"].lower(),
        "to_address": tx["to"].lower() if tx["to"] else None,
        "value": str(tx["value"]),
        "gas": tx["gas"],
        "gas_price": str(tx["gasPrice"]),
        "input": to_hex(tx["input"]),
        "status": int(receipt["status"], 16),
        "created_at": block_timestamp,
    }


def _topic_to_address(topic: str) -> str:
    return "0x" + topic[-40:]


def parse_erc20_transfers(receipt) -> list:
    transfers = []
    block_number = int(receipt["blockNumber"], 16)

    for log in receipt["logs"]:
        topics = log["topics"]
        if len(topics) < 3:
            continue
        if topics[0].lower() != TRANSFER_TOPIC:
            continue

        from_address = _topic_to_address(topics[1]).lower()
        to_address = _topic_to_address(topics[2]).lower()

        raw_data = log["data"]
        value = int(raw_data, 16) if raw_data and raw_data not in ("0x", "") else 0

        transfers.append({
            "tx_hash": receipt["transactionHash"],
            "block_number": block_number,
            "token_address": log["address"].lower(),
            "from_address": from_address,
            "to_address": to_address,
            "value": str(value),
            "log_index": int(log["logIndex"], 16),
        })
    return transfers
