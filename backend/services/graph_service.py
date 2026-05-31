import networkx as nx
from collections import defaultdict


def shorten_address(address: str) -> str:
    return address[:6] + "..." + address[-4:]


def build_graph(transfers: list, input_address: str) -> dict:
    input_address = input_address.lower()
    edge_map: dict = defaultdict(lambda: {"txCount": 0, "totalValue": 0.0, "assets": set()})
    nodes: dict = {}

    nodes[input_address] = {
        "id": input_address,
        "label": shorten_address(input_address),
        "type": "input_wallet",
    }

    for tx in transfers:
        from_addr = (tx.get("from") or "").lower()
        to_addr = (tx.get("to") or "").lower()
        value = float(tx.get("value") or 0)
        asset = tx.get("asset") or "UNKNOWN"

        if not from_addr or not to_addr:
            continue

        for addr in (from_addr, to_addr):
            if addr not in nodes:
                nodes[addr] = {
                    "id": addr,
                    "label": shorten_address(addr),
                    "type": "wallet",
                }

        key = (from_addr, to_addr)
        edge_map[key]["txCount"] += 1
        edge_map[key]["totalValue"] += value
        edge_map[key]["assets"].add(asset)

    edges = [
        {
            "source": src,
            "target": tgt,
            "txCount": data["txCount"],
            "totalValue": round(data["totalValue"], 6),
            "assets": list(data["assets"]),
        }
        for (src, tgt), data in edge_map.items()
    ]

    clusters = detect_clusters(nodes, edges)

    for cluster in clusters:
        for addr in cluster["addresses"]:
            if addr in nodes and addr != input_address:
                nodes[addr]["clusterId"] = cluster["clusterId"]

    return {
        "nodes": list(nodes.values()),
        "edges": edges,
        "clusters": clusters,
    }


def detect_clusters(nodes: dict, edges: list) -> list:
    graph = nx.Graph()

    for node_id in nodes:
        graph.add_node(node_id)

    for edge in edges:
        graph.add_edge(edge["source"], edge["target"], weight=edge["totalValue"])

    components = list(nx.connected_components(graph))
    components.sort(key=lambda c: len(c), reverse=True)

    clusters = []
    for index, component in enumerate(components):
        degree_map = {n: graph.degree(n) for n in component}
        central = max(degree_map, key=lambda k: degree_map[k])
        clusters.append({
            "clusterId": index + 1,
            "size": len(component),
            "addresses": list(component),
            "centralAddress": central,
        })

    return clusters
