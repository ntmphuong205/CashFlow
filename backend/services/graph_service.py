import networkx as nx
from collections import defaultdict


def _shorten(addr: str) -> str:
    return addr[:6] + "..." + addr[-4:]


def build_graph(edges: list, center_address: str) -> dict:
    center_address = center_address.lower()
    node_map: dict = {}
    edge_agg: dict = defaultdict(lambda: {"tx_count": 0, "total_value_raw": 0.0})

    for e in edges:
        src = e["from_address"]
        tgt = e["to_address"]
        asset = e["asset"]
        raw_value = float(e["total_value"] or 0)
        tx_count = int(e["tx_count"] or 0)

        for addr in (src, tgt):
            if addr not in node_map:
                node_map[addr] = {
                    "id": addr,
                    "label": _shorten(addr),
                    "type": "center" if addr == center_address else "wallet",
                }

        key = (src, tgt, asset)
        edge_agg[key]["tx_count"] += tx_count
        edge_agg[key]["total_value_raw"] += raw_value

    if center_address not in node_map:
        node_map[center_address] = {
            "id": center_address,
            "label": _shorten(center_address),
            "type": "center",
        }

    graph_edges = []
    for (src, tgt, asset), data in edge_agg.items():
        raw = data["total_value_raw"]
        display_value = round(raw / 1e18, 8) if asset == "ETH" else raw
        graph_edges.append({
            "source": src,
            "target": tgt,
            "asset": "ETH" if asset == "ETH" else asset[:10] + "...",
            "asset_full": asset,
            "tx_count": data["tx_count"],
            "total_value": display_value,
        })

    clusters = _detect_clusters(node_map, graph_edges)

    for cluster in clusters:
        for addr in cluster["addresses"]:
            if addr in node_map:
                node_map[addr]["cluster_id"] = cluster["cluster_id"]

    return {
        "nodes": list(node_map.values()),
        "edges": graph_edges,
        "clusters": clusters,
    }


def _detect_clusters(node_map: dict, edges: list) -> list:
    G = nx.Graph()
    for node_id in node_map:
        G.add_node(node_id)
    for e in edges:
        G.add_edge(e["source"], e["target"])

    components = sorted(nx.connected_components(G), key=len, reverse=True)
    clusters = []
    for idx, component in enumerate(components):
        degree_map = {n: G.degree(n) for n in component}
        central = max(degree_map, key=lambda k: degree_map[k])
        clusters.append({
            "cluster_id": idx,
            "size": len(component),
            "addresses": list(component),
            "central_address": central,
        })
    return clusters
