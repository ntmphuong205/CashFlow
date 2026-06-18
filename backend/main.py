from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from services.db_service import (
    get_wallet_summary,
    get_wallet_transactions,
    get_wallet_edges,
    get_crawl_status,
)
from services.graph_service import build_graph

app = FastAPI(title="CashFlow Map — Sepolia Wallet Tracker")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/wallet/{address}/summary")
def wallet_summary(address: str):
    try:
        return {"address": address, "summary": get_wallet_summary(address)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/wallet/{address}/transactions")
def wallet_transactions(
    address: str,
    limit: int = Query(default=50, ge=1, le=200),
):
    try:
        txs = get_wallet_transactions(address, limit)
        return {"address": address, "count": len(txs), "transactions": txs}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/wallet/{address}/graph")
def wallet_graph(
    address: str,
    depth: int = Query(default=1, ge=1, le=2),
):
    try:
        summary = get_wallet_summary(address)
        edges = get_wallet_edges(address, depth=depth)
        graph = build_graph(edges, address)
        return {
            "address": address,
            "summary": summary,
            "graph": graph,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/crawl/status")
def crawl_status():
    try:
        return get_crawl_status()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
