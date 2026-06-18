import os
import psycopg2
import psycopg2.extras
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")


def get_conn():
    return psycopg2.connect(DATABASE_URL)


def get_wallet_summary(address: str) -> dict:
    address = address.lower()
    conn = get_conn()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    cur.execute("""
        SELECT COUNT(*) AS sent_count, COALESCE(SUM(value), 0) AS total_sent
        FROM transactions
        WHERE from_address = %s AND value > 0 AND status = 1
    """, (address,))
    sent = dict(cur.fetchone())

    cur.execute("""
        SELECT COUNT(*) AS recv_count, COALESCE(SUM(value), 0) AS total_received
        FROM transactions
        WHERE to_address = %s AND value > 0 AND status = 1
    """, (address,))
    recv = dict(cur.fetchone())

    cur.execute("SELECT COUNT(*) AS n FROM token_transfers WHERE from_address = %s", (address,))
    token_sent = cur.fetchone()["n"]

    cur.execute("SELECT COUNT(*) AS n FROM token_transfers WHERE to_address = %s", (address,))
    token_recv = cur.fetchone()["n"]

    cur.execute("""
        SELECT COUNT(DISTINCT
            CASE WHEN from_address = %s THEN to_address ELSE from_address END
        ) AS n
        FROM wallet_edges
        WHERE from_address = %s OR to_address = %s
    """, (address, address, address))
    related = cur.fetchone()["n"]

    cur.execute("SELECT COUNT(DISTINCT to_address) AS n FROM wallet_edges WHERE from_address = %s", (address,))
    out_degree = cur.fetchone()["n"]

    cur.execute("SELECT COUNT(DISTINCT from_address) AS n FROM wallet_edges WHERE to_address = %s", (address,))
    in_degree = cur.fetchone()["n"]

    cur.close()
    conn.close()

    total_tx = int(sent["sent_count"]) + int(recv["recv_count"])
    eth_sent = round(float(sent["total_sent"]) / 1e18, 8)
    eth_recv = round(float(recv["total_received"]) / 1e18, 8)

    return {
        "total_transactions": total_tx,
        "sent_count": int(sent["sent_count"]),
        "received_count": int(recv["recv_count"]),
        "total_eth_sent": eth_sent,
        "total_eth_received": eth_recv,
        "total_token_transfers_sent": int(token_sent),
        "total_token_transfers_received": int(token_recv),
        "related_addresses": int(related),
        "out_degree": int(out_degree),
        "in_degree": int(in_degree),
        "node_type": "hub" if int(out_degree) + int(in_degree) >= 5 else "satellite",
    }


def get_wallet_transactions(address: str, limit: int = 50) -> list:
    address = address.lower()
    conn = get_conn()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    cur.execute("""
        SELECT hash, block_number, from_address, to_address,
               value, status, created_at
        FROM transactions
        WHERE from_address = %s OR to_address = %s
        ORDER BY block_number DESC
        LIMIT %s
    """, (address, address, limit))

    rows = [dict(r) for r in cur.fetchall()]
    cur.close()
    conn.close()

    for r in rows:
        r["value_wei"] = str(r["value"])
        r["value_eth"] = round(float(r["value"]) / 1e18, 8) if r["value"] else 0
        r.pop("value")
        if r["created_at"]:
            r["created_at"] = r["created_at"].isoformat()
    return rows


def get_wallet_edges(address: str, depth: int = 1, max_nodes: int = 100, max_edges: int = 200) -> list:
    address = address.lower()
    conn = get_conn()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    visited = {address}
    frontier = {address}
    all_edges = []

    for _ in range(depth):
        if not frontier:
            break
        placeholders = ",".join(["%s"] * len(frontier))
        args = list(frontier) + list(frontier) + [max_edges]
        cur.execute(f"""
            SELECT from_address, to_address, asset, total_value, tx_count,
                   first_seen_block, last_seen_block
            FROM wallet_edges
            WHERE from_address IN ({placeholders}) OR to_address IN ({placeholders})
            LIMIT %s
        """, args)

        rows = cur.fetchall()
        new_frontier = set()
        for r in rows:
            all_edges.append(dict(r))
            for addr in (r["from_address"], r["to_address"]):
                if addr not in visited:
                    visited.add(addr)
                    new_frontier.add(addr)
                if len(visited) >= max_nodes:
                    break
            if len(visited) >= max_nodes:
                break
        frontier = new_frontier

    cur.close()
    conn.close()

    for e in all_edges:
        e["total_value"] = str(e["total_value"])
    return all_edges


def get_crawl_status() -> dict:
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("SELECT last_crawled_block FROM crawl_state WHERE id = 1")
    row = cur.fetchone()
    cur.execute("SELECT COUNT(*) FROM transactions")
    tx_count = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM token_transfers")
    tt_count = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM wallet_edges")
    edge_count = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM blocks")
    block_count = cur.fetchone()[0]
    cur.close()
    conn.close()
    return {
        "last_crawled_block": row[0] if row else None,
        "total_blocks_indexed": block_count,
        "total_transactions": tx_count,
        "total_token_transfers": tt_count,
        "total_wallet_edges": edge_count,
    }
