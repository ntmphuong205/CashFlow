from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from services.alchemy_service import get_asset_transfers, get_wallet_stats
from services.graph_service import build_graph

app = FastAPI(title="Blockchain Account Tracker")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SUPPORTED_NETWORKS = {
    "eth-sepolia",
    "eth-mainnet",
    "polygon-mainnet",
    "base-mainnet",
    "arb-mainnet",
}


def validate_network(network: str) -> str:
    if network not in SUPPORTED_NETWORKS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported network '{network}'. Choose from: {', '.join(sorted(SUPPORTED_NETWORKS))}",
        )
    return network


@app.get("/api/wallet/{address}/transfers")
def get_wallet_transfers(
    address: str,
    network: str = Query(default="eth-sepolia"),
):
    validate_network(network)
    try:
        transfers = get_asset_transfers(address, network)
        return {
            "address": address,
            "network": network,
            "totalTransactions": len(transfers),
            "transfers": transfers,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/wallet/{address}/stats")
def get_wallet_statistics(
    address: str,
    network: str = Query(default="eth-sepolia"),
):
    validate_network(network)
    try:
        transfers = get_asset_transfers(address, network)
        stats = get_wallet_stats(address, transfers)
        return {"address": address, "network": network, **stats}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/wallet/{address}/graph")
def get_wallet_graph(
    address: str,
    network: str = Query(default="eth-sepolia"),
):
    validate_network(network)
    try:
        transfers = get_asset_transfers(address, network)
        graph = build_graph(transfers, address)
        stats = get_wallet_stats(address, transfers)
        return {
            "address": address,
            "network": network,
            "stats": stats,
            "graph": graph,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
