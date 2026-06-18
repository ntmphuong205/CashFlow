import React, { useRef, useEffect, useState } from "react";
import CytoscapeComponent from "react-cytoscapejs";
import "./CashFlowGraph.css";

const CLUSTER_COLORS = [
  "#6366f1", "#10b981", "#f59e0b", "#ef4444",
  "#06b6d4", "#8b5cf6", "#f97316", "#ec4899",
];

function buildElements(graphData) {
  if (!graphData) return [];

  const maxTxCount = Math.max(...graphData.edges.map((e) => e.tx_count), 1);
  const maxValue = Math.max(...graphData.edges.map((e) => e.total_value), 1);

  const nodes = graphData.nodes.map((node) => {
    const isCenter = node.type === "center";
    const clusterColor = node.cluster_id !== undefined
      ? CLUSTER_COLORS[node.cluster_id % CLUSTER_COLORS.length]
      : "#6366f1";
    return {
      data: {
        id: node.id,
        label: node.label,
        type: node.type,
        cluster_id: node.cluster_id ?? -1,
        color: isCenter ? "#f59e0b" : clusterColor,
        size: isCenter ? 50 : 30,
      },
    };
  });

  const edges = graphData.edges.map((edge, i) => {
    const weight = Math.max(1, Math.round((edge.tx_count / maxTxCount) * 8));
    const opacity = 0.3 + (edge.total_value / maxValue) * 0.7;
    return {
      data: {
        id: `e${i}`,
        source: edge.source,
        target: edge.target,
        label: `${edge.tx_count}tx`,
        weight,
        opacity,
        total_value: edge.total_value,
        asset: edge.asset,
      },
    };
  });

  return [...nodes, ...edges];
}

const stylesheet = [
  {
    selector: "node",
    style: {
      "background-color": "data(color)",
      label: "data(label)",
      color: "#f1f5f9",
      "font-size": "10px",
      "font-family": "Courier New, monospace",
      "text-valign": "bottom",
      "text-halign": "center",
      "text-margin-y": "4px",
      width: "data(size)",
      height: "data(size)",
      "border-width": 2,
      "border-color": "#1e293b",
    },
  },
  {
    selector: 'node[type = "center"]',
    style: {
      "border-width": 3,
      "border-color": "#fbbf24",
      "z-index": 10,
    },
  },
  {
    selector: "edge",
    style: {
      width: "data(weight)",
      "line-color": "#334155",
      "target-arrow-color": "#6366f1",
      "target-arrow-shape": "triangle",
      "curve-style": "bezier",
      opacity: "data(opacity)",
      label: "data(label)",
      color: "#64748b",
      "font-size": "9px",
      "text-rotation": "autorotate",
      "text-margin-y": "-8px",
    },
  },
  {
    selector: ":selected",
    style: {
      "border-width": 3,
      "border-color": "#f1f5f9",
      "line-color": "#f1f5f9",
      "target-arrow-color": "#f1f5f9",
    },
  },
];

export default function CashFlowGraph({ graphData }) {
  const cyRef = useRef(null);
  const [tooltip, setTooltip] = useState(null);

  const handleCyInit = (cy) => {
    cyRef.current = cy;

    cy.on("tap", "node", (evt) => {
      const node = evt.target;
      const clusterId = node.data("cluster_id");
      setTooltip({
        x: evt.renderedPosition.x + 20,
        y: evt.renderedPosition.y - 20,
        html: `<strong>${node.data("id")}</strong><br/>
               Cluster: ${clusterId >= 0 ? clusterId : "N/A"}<br/>
               Type: ${node.data("type")}`,
      });
    });

    cy.on("tap", "edge", (evt) => {
      const edge = evt.target;
      setTooltip({
        x: evt.renderedPosition.x + 20,
        y: evt.renderedPosition.y - 20,
        html: `<strong>${edge.data("label")}</strong><br/>
               Value: ${edge.data("total_value")}<br/>
               Asset: ${edge.data("asset")}`,
      });
    });

    cy.on("tap", (evt) => {
      if (evt.target === cy) setTooltip(null);
    });
  };

  useEffect(() => {
    return () => {
      if (cyRef.current) {
        try { cyRef.current.destroy(); } catch (_) {}
        cyRef.current = null;
      }
    };
  }, []);

  if (!graphData) return null;

  const elements = buildElements(graphData);

  return (
    <div className="graph-container">
      <div className="graph-header">
        <h2>CashFlow Map</h2>
        <div className="graph-stats">
          <span>{graphData.nodes.length} nodes</span>
          <span>{graphData.edges.length} edges</span>
          <span>{graphData.clusters.length} clusters</span>
        </div>
        <div className="graph-legend">
          <span className="legend-item">
            <span className="dot" style={{ background: "#f59e0b" }} /> Center Wallet
          </span>
          <span className="legend-item">
            <span className="dot" style={{ background: "#6366f1" }} /> Related Address
          </span>
          <span className="legend-note">
            Edge thickness = tx count &nbsp;|&nbsp; Edge opacity = value
          </span>
        </div>
      </div>

      <div className="cy-wrapper">
        <CytoscapeComponent
          key={graphData.nodes.length + "-" + graphData.edges.length}
          elements={elements}
          stylesheet={stylesheet}
          layout={{
            name: "cose",
            animate: false,
            randomize: true,
            idealEdgeLength: 120,
            nodeRepulsion: 8000,
            fit: true,
            padding: 30,
          }}
          style={{ width: "100%", height: "100%" }}
          cy={handleCyInit}
          minZoom={0.2}
          maxZoom={3}
        />
        {tooltip && (
          <div
            className="cy-tooltip"
            style={{ left: tooltip.x, top: tooltip.y }}
            dangerouslySetInnerHTML={{ __html: tooltip.html }}
          />
        )}
      </div>

      <ClusterTable clusters={graphData.clusters} />
    </div>
  );
}

function ClusterTable({ clusters }) {
  const [expanded, setExpanded] = useState({});

  if (!clusters || clusters.length === 0) return null;

  const toggle = (id) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="cluster-table">
      <h3>Clusters ({clusters.length})</h3>
      <div className="cluster-list">
        {clusters.map((c) => {
          const color = CLUSTER_COLORS[c.cluster_id % CLUSTER_COLORS.length];
          const isOpen = expanded[c.cluster_id];
          return (
            <div key={c.cluster_id} className="cluster-block">
              <div className="cluster-row" onClick={() => toggle(c.cluster_id)}>
                <span className="cluster-dot" style={{ background: color }} />
                <span className="cluster-id">Cluster {c.cluster_id}</span>
                <span className="cluster-size">{c.size} addresses</span>
                <span className="cluster-central mono">
                  Central: {c.central_address?.slice(0, 10)}...
                </span>
                <span className="cluster-toggle">{isOpen ? "▲" : "▼"}</span>
              </div>
              {isOpen && (
                <div className="cluster-addresses">
                  {c.addresses.map((addr) => (
                    <div key={addr} className="cluster-addr-row">
                      {addr === c.central_address && (
                        <span className="central-badge">central</span>
                      )}
                      <span className="addr-mono">{addr}</span>
                      <a
                        href={`https://sepolia.etherscan.io/address/${addr}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="etherscan-link"
                      >
                        ↗
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
