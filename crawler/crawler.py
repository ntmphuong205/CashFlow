import os
import time
from datetime import datetime, timezone
from dotenv import load_dotenv

from rpc_client import get_latest_block_number, get_block_by_number, get_block_receipts
from parser import parse_native_transaction, parse_erc20_transfers, to_hex
from db import (
    get_conn, init_db, init_crawl_state, get_last_crawled_block, update_last_crawled_block,
    save_block, save_transaction, save_token_transfer, update_wallet_edge,
)

load_dotenv()

CRAWL_BLOCK_RANGE = int(os.getenv("CRAWL_BLOCK_RANGE", "20000"))
BATCH_SIZE = int(os.getenv("BATCH_SIZE", "100"))


def crawl_block(conn, block_number: int):
    block = get_block_by_number(block_number)
    block_timestamp = datetime.fromtimestamp(block["timestamp"], tz=timezone.utc)

    save_block(conn, {
        "number": block["number"],
        "hash": to_hex(block["hash"]),
        "parent_hash": to_hex(block["parentHash"]),
        "timestamp": block_timestamp,
        "tx_count": len(block["transactions"]),
    })

    receipts = get_block_receipts(block_number)
    receipts_by_hash = {r["transactionHash"].lower(): r for r in receipts}

    for tx in block["transactions"]:
        receipt = receipts_by_hash.get(to_hex(tx["hash"]).lower())
        if receipt is None:
            print(f"    no receipt for {to_hex(tx['hash'])[:10]}..., skipping")
            continue

        native_tx = parse_native_transaction(tx, receipt, block_timestamp)
        save_transaction(conn, native_tx)

        if native_tx["to_address"] and int(native_tx["value"]) > 0:
            update_wallet_edge(
                conn,
                from_address=native_tx["from_address"],
                to_address=native_tx["to_address"],
                asset="ETH",
                value=native_tx["value"],
                block_number=block_number,
            )

        for transfer in parse_erc20_transfers(receipt):
            save_token_transfer(conn, transfer)
            update_wallet_edge(
                conn,
                from_address=transfer["from_address"],
                to_address=transfer["to_address"],
                asset=transfer["token_address"],
                value=transfer["value"],
                block_number=block_number,
            )


def run_crawler():
    print("Initializing database schema...")
    init_db()

    latest_block = get_latest_block_number()
    start_block = max(0, latest_block - CRAWL_BLOCK_RANGE)

    print(f"Latest block on Sepolia : {latest_block}")
    print(f"Start block             : {start_block}")
    print(f"Total blocks to crawl   : {latest_block - start_block}")

    init_crawl_state(start_block)
    last_crawled = get_last_crawled_block()

    if last_crawled >= latest_block:
        print("Already fully crawled. Nothing to do.")
        return

    print(f"Resuming from block {last_crawled + 1}...\n")

    for batch_start in range(last_crawled + 1, latest_block + 1, BATCH_SIZE):
        batch_end = min(batch_start + BATCH_SIZE - 1, latest_block)
        print(f"Batch {batch_start} → {batch_end}")

        for block_number in range(batch_start, batch_end + 1):
            conn = get_conn()
            try:
                crawl_block(conn, block_number)
                update_last_crawled_block(conn, block_number)
                conn.commit()
                pct = (block_number - start_block) / max(1, latest_block - start_block) * 100
                print(f"  [{pct:5.1f}%] block {block_number} done")
            except Exception as e:
                conn.rollback()
                print(f"  Error at block {block_number}: {e}")
                time.sleep(2)
            finally:
                conn.close()

        time.sleep(0.2)

    print("\nCrawl complete.")
    print(f"Indexed blocks {start_block} → {latest_block} ({latest_block - start_block} blocks)")


if __name__ == "__main__":
    run_crawler()
