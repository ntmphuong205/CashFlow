# ChainFlow

A self-indexed Ethereum blockchain explorer that visualizes wallet-to-wallet transaction flows as an interactive network graph.

No third-party APIs (Etherscan, Alchemy, Infura) — data is crawled directly from an Ethereum Sepolia JSON-RPC node.

## Features

- Crawl ETH native transactions and ERC-20 token transfers from Ethereum Sepolia
- Store and aggregate wallet-to-wallet edges in PostgreSQL
- REST API for wallet summary, transaction history, and graph data
- Interactive network graph with cluster detection (connected components)
- Classify wallets as Hub (≥5 connections) or Satellite (<5 connections)

## Architecture

```
[Sepolia JSON-RPC] → [Crawler] → [PostgreSQL] → [FastAPI] → [React + Cytoscape.js]
```

## Project Structure

```
CashFlow/
├── crawler/        # Blockchain data crawler
├── backend/        # FastAPI REST API
└── frontend/       # React dashboard
```

## Prerequisites

- Python 3.10+
- Node.js 18+
- PostgreSQL (running on port 5433)

## Setup

### 1. Database

Create a PostgreSQL database:
```bash
createdb -p 5433 sepolia_tracker
```

### 2. Crawler

```bash
cd crawler
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # edit DATABASE_URL and RPC_URL if needed
python crawler.py
```

`.env` options:
```
DATABASE_URL=postgresql://localhost:5433/sepolia_tracker
RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
CRAWL_BLOCK_RANGE=20000
BATCH_SIZE=100
```

The crawler is resumable — if interrupted, it continues from the last indexed block.

### 3. Backend

```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
# create .env with DATABASE_URL
uvicorn main:app --reload --port 8000
```

API docs available at `http://localhost:8000/docs`

### 4. Frontend

```bash
cd frontend
npm install
npm start
```

Opens at `http://localhost:3000`

Set `REACT_APP_API_BASE` in `.env` to point to a remote backend if needed.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/wallet/{address}/summary` | Wallet stats: tx count, ETH in/out, degree, node type |
| GET | `/api/wallet/{address}/transactions` | Transaction list (max 200) |
| GET | `/api/wallet/{address}/graph?depth=1` | Graph data: nodes, edges, clusters |
| GET | `/api/crawl/status` | Indexer status: last block, total txs, edges |

## Tech Stack

| Layer | Technology |
|-------|------------|
| Blockchain | Ethereum Sepolia, JSON-RPC, Web3.py |
| Crawler | Python, Web3.py |
| Database | PostgreSQL, psycopg2 |
| Backend | FastAPI, NetworkX |
| Frontend | React, Cytoscape.js, Axios |
