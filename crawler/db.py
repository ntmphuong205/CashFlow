import os
import psycopg2
import psycopg2.extras
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")


def get_conn():
    return psycopg2.connect(DATABASE_URL)


def init_db():
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS blocks (
            number BIGINT PRIMARY KEY,
            hash TEXT NOT NULL,
            parent_hash TEXT,
            timestamp TIMESTAMPTZ,
            tx_count INT
        );

        CREATE TABLE IF NOT EXISTS transactions (
            hash TEXT PRIMARY KEY,
            block_number BIGINT,
            from_address TEXT,
            to_address TEXT,
            value NUMERIC,
            gas BIGINT,
            gas_price NUMERIC,
            input TEXT,
            status INT,
            created_at TIMESTAMPTZ
        );

        CREATE TABLE IF NOT EXISTS token_transfers (
            id SERIAL PRIMARY KEY,
            tx_hash TEXT,
            block_number BIGINT,
            token_address TEXT,
            from_address TEXT,
            to_address TEXT,
            value NUMERIC,
            log_index INT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(tx_hash, log_index)
        );

        CREATE TABLE IF NOT EXISTS wallet_edges (
            id SERIAL PRIMARY KEY,
            from_address TEXT,
            to_address TEXT,
            asset TEXT,
            total_value NUMERIC DEFAULT 0,
            tx_count INT DEFAULT 0,
            first_seen_block BIGINT,
            last_seen_block BIGINT,
            UNIQUE(from_address, to_address, asset)
        );

        CREATE TABLE IF NOT EXISTS crawl_state (
            id INT PRIMARY KEY,
            last_crawled_block BIGINT
        );

        CREATE INDEX IF NOT EXISTS idx_tx_from ON transactions(from_address);
        CREATE INDEX IF NOT EXISTS idx_tx_to ON transactions(to_address);
        CREATE INDEX IF NOT EXISTS idx_tt_from ON token_transfers(from_address);
        CREATE INDEX IF NOT EXISTS idx_tt_to ON token_transfers(to_address);
        CREATE INDEX IF NOT EXISTS idx_edges_from ON wallet_edges(from_address);
        CREATE INDEX IF NOT EXISTS idx_edges_to ON wallet_edges(to_address);
    """)
    conn.commit()
    cur.close()
    conn.close()
    print("Database initialized.")


def init_crawl_state(start_block: int):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO crawl_state (id, last_crawled_block)
        VALUES (1, %s)
        ON CONFLICT (id) DO NOTHING
    """, (start_block - 1,))
    conn.commit()
    cur.close()
    conn.close()


def get_last_crawled_block() -> int:
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("SELECT last_crawled_block FROM crawl_state WHERE id = 1")
    row = cur.fetchone()
    cur.close()
    conn.close()
    return row[0] if row else 0


def update_last_crawled_block(conn, block_number: int):
    cur = conn.cursor()
    cur.execute("UPDATE crawl_state SET last_crawled_block = %s WHERE id = 1", (block_number,))
    cur.close()


def save_block(conn, block: dict):
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO blocks (number, hash, parent_hash, timestamp, tx_count)
        VALUES (%(number)s, %(hash)s, %(parent_hash)s, %(timestamp)s, %(tx_count)s)
        ON CONFLICT (number) DO NOTHING
    """, block)
    cur.close()


def save_transaction(conn, tx: dict):
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO transactions
            (hash, block_number, from_address, to_address, value,
             gas, gas_price, input, status, created_at)
        VALUES
            (%(hash)s, %(block_number)s, %(from_address)s, %(to_address)s,
             %(value)s, %(gas)s, %(gas_price)s, %(input)s, %(status)s, %(created_at)s)
        ON CONFLICT (hash) DO NOTHING
    """, tx)
    cur.close()


def save_token_transfer(conn, transfer: dict):
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO token_transfers
            (tx_hash, block_number, token_address, from_address, to_address, value, log_index)
        VALUES
            (%(tx_hash)s, %(block_number)s, %(token_address)s,
             %(from_address)s, %(to_address)s, %(value)s, %(log_index)s)
        ON CONFLICT (tx_hash, log_index) DO NOTHING
    """, transfer)
    cur.close()


def update_wallet_edge(conn, from_address: str, to_address: str, asset: str, value: str, block_number: int):
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO wallet_edges
            (from_address, to_address, asset, total_value, tx_count, first_seen_block, last_seen_block)
        VALUES (%s, %s, %s, %s, 1, %s, %s)
        ON CONFLICT (from_address, to_address, asset) DO UPDATE SET
            total_value = wallet_edges.total_value + EXCLUDED.total_value,
            tx_count    = wallet_edges.tx_count + 1,
            last_seen_block = EXCLUDED.last_seen_block
    """, (from_address, to_address, asset, value, block_number, block_number))
    cur.close()
