import os
import requests
from dotenv import load_dotenv

load_dotenv()

ALCHEMY_API_KEY = os.getenv("ALCHEMY_API_KEY")
DEFAULT_NETWORK = os.getenv("NETWORK", "eth-sepolia")


def _alchemy_url(network: str) -> str:
    return f"https://{network}.g.alchemy.com/v2/{ALCHEMY_API_KEY}"


def get_asset_transfers(address: str, network: str = DEFAULT_NETWORK):
    address = address.lower()

    sent_payload = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "alchemy_getAssetTransfers",
        "params": [
            {
                "fromBlock": "0x0",
                "toBlock": "latest",
                "fromAddress": address,
                "category": ["external", "erc20"],
                "maxCount": "0x64",
                "withMetadata": True,
                "excludeZeroValue": True,
            }
        ],
    }

    received_payload = {
        "jsonrpc": "2.0",
        "id": 2,
        "method": "alchemy_getAssetTransfers",
        "params": [
            {
                "fromBlock": "0x0",
                "toBlock": "latest",
                "toAddress": address,
                "category": ["external", "erc20"],
                "maxCount": "0x64",
                "withMetadata": True,
                "excludeZeroValue": True,
            }
        ],
    }

    url = _alchemy_url(network)
    sent_response = requests.post(url, json=sent_payload, timeout=15)
    received_response = requests.post(url, json=received_payload, timeout=15)

    sent = sent_response.json().get("result", {}).get("transfers", [])
    received = received_response.json().get("result", {}).get("transfers", [])

    return sent + received


def get_wallet_stats(address: str, transfers: list) -> dict:
    address = address.lower()

    sent_txs = [t for t in transfers if t.get("from", "").lower() == address]
    received_txs = [t for t in transfers if t.get("to", "").lower() == address]

    total_sent = sum(float(t.get("value") or 0) for t in sent_txs)
    total_received = sum(float(t.get("value") or 0) for t in received_txs)

    counterparties = set()
    for t in sent_txs:
        if t.get("to"):
            counterparties.add(t["to"].lower())
    for t in received_txs:
        if t.get("from"):
            counterparties.add(t["from"].lower())

    all_values = [float(t.get("value") or 0) for t in transfers if t.get("value")]
    largest_tx = max(all_values) if all_values else 0
    avg_tx = sum(all_values) / len(all_values) if all_values else 0

    asset_counts: dict = {}
    for t in transfers:
        asset = t.get("asset") or "UNKNOWN"
        asset_counts[asset] = asset_counts.get(asset, 0) + 1
    most_used_asset = max(asset_counts, key=lambda k: asset_counts[k]) if asset_counts else "N/A"

    counterparty_volume: dict = {}
    counterparty_freq: dict = {}
    for t in transfers:
        other = (t.get("to") or "").lower() if t.get("from", "").lower() == address else (t.get("from") or "").lower()
        if not other:
            continue
        val = float(t.get("value") or 0)
        counterparty_volume[other] = counterparty_volume.get(other, 0) + val
        counterparty_freq[other] = counterparty_freq.get(other, 0) + 1

    top_by_volume = max(counterparty_volume, key=lambda k: counterparty_volume[k]) if counterparty_volume else "N/A"
    top_by_freq = max(counterparty_freq, key=lambda k: counterparty_freq[k]) if counterparty_freq else "N/A"

    timestamps = [t.get("metadata", {}).get("blockTimestamp") for t in transfers if t.get("metadata", {}).get("blockTimestamp")]
    first_seen = min(timestamps) if timestamps else "N/A"
    last_seen = max(timestamps) if timestamps else "N/A"

    total_volume = total_sent + total_received
    if total_volume > 100:
        holder_type = "Whale"
    elif total_volume > 10:
        holder_type = "Medium"
    else:
        holder_type = "Small"

    abnormal_flags = []
    if len(transfers) > 50:
        abnormal_flags.append("High transaction count")
    if len(counterparties) > 100:
        abnormal_flags.append("Unusually large number of counterparties")
    if largest_tx > avg_tx * 10 and avg_tx > 0:
        abnormal_flags.append("Large outlier transaction detected")

    return {
        "totalTransactions": len(transfers),
        "sentCount": len(sent_txs),
        "receivedCount": len(received_txs),
        "uniqueCounterparties": len(counterparties),
        "totalSentValue": round(total_sent, 6),
        "totalReceivedValue": round(total_received, 6),
        "largestTransaction": round(largest_tx, 6),
        "mostUsedAsset": most_used_asset,
        "topCounterpartyByVolume": top_by_volume,
        "topCounterpartyByFrequency": top_by_freq,
        "firstSeen": first_seen,
        "lastSeen": last_seen,
        "holderType": holder_type,
        "abnormalFlags": abnormal_flags,
    }
