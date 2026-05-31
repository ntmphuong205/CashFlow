import React, { useRef, useEffect, useState } from "react";
import CytoscapeComponent from "react-cytoscapejs";
import "./CashFlowGraph.css";

const CLUSTER_COLORS = [
  "#6366f1", "#10b981", "#f59e0b", "#ef4444",
  "#06b6d4", "#8b5cf6", "#f97316", "#ec4899",
];

function buildElements(graphData) {
  if (!graphData) return [];

  const maxTxCount = Math.max(...graphData.edges.map((e) => e.txCount), 1);
  const maxValue = Math.max(...graphData.edges.map((e) => e.totalValue), 1);

  const nodes = graphData.nodes.map((node) => {
    const clusterColor = node.clusterId
      ? CLUSTER_COLORS[(node.clusterId - 1) % CLUSTER_COLORS.length]
      : "#6366f1";
    const isInput = node.type === "input_wallet";
    return {
      data: {
        id: node.id,
        label: node.label,
        type: node.type,
        clusterId: node.clusterId || 0,
        color: isInput ? "#f59e0b" : clusterColor,
        size: isInput ? 50 : 30,
      },
    };
  });

  const edges = graphData.edges.map((edge, i) => {
    const weight = Math.max(1, Math.round((edge.txCount / maxTxCount) * 8));
    const opacity = 0.3 + (edge.totalValue / maxValue) * 0.7;
    return {
      data: {
        id: `e${i}`,
        source: edge.source,
        target: edge.target,
        label: `${edge.txCount}tx`,
        weight,
        opacity,
        totalValue: edge.totalValue,
        assets: edge.assets.join(", "),
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
    selector: 'node[type = "input_wallet"]',
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

export default function CashFlowGraph({ graphData, explorerBase = "https://sepolia.etherscan.io" }) {
  const cyRef = useRef(null);
  const [tooltip, setTooltip] = useState(null);

  const handleCyInit = (cy) => {
    cyRef.current = cy;

    cy.on("tap", "node", (evt) => {
      const node = evt.target;
      setTooltip({
        x: evt.renderedPosition.x + 20,
        y: evt.renderedPosition.y - 20,
        html: `<strong>${node.data("id")}</strong><br/>Cluster: ${node.data("clusterId") || "N/A"}<br/>Type: ${node.data("type")}`,
      });
    });

    cy.on("tap", "edge", (evt) => {
      const edge = evt.target;
      setTooltip({
        x: evt.renderedPosition.x + 20,
        y: evt.renderedPosition.y - 20,
        html: `<strong>${edge.data("label")}</strong><br/>Value: ${edge.data("totalValue")} ETH<br/>Assets: ${edge.data("assets")}`,
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
        <div className="graph-legend">
          <span className="legend-item">
            <span className="dot" style={{ background: "#f59e0b" }} /> Input Wallet
          </span>
          <span className="legend-item">
            <span className="dot" style={{ background: "#6366f1" }} /> Related Address
          </span>
          <span className="legend-item legend-note">
            Edge thickness = tx count &nbsp; Edge opacity = value
          </span>
        </div>
      </div>

      <div className="cy-wrapper">
        <CytoscapeComponent
          key={graphData.nodes.length}
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

      <ClusterTable clusters={graphData.clusters} explorerBase={explorerBase} />
    </div>
  );
}

function ClusterTable({ clusters, explorerBase }) {
  const [expanded, setExpanded] = useState({});

  if (!clusters || clusters.length === 0) return null;

  const toggle = (id) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="cluster-table">
      <h3>Clusters</h3>
      <div className="cluster-list">
        {clusters.map((c) => {
          const color = CLUSTER_COLORS[(c.clusterId - 1) % CLUSTER_COLORS.length];
          const isOpen = expanded[c.clusterId];
          return (
            <div key={c.clusterId} className="cluster-block">
              <div className="cluster-row" onClick={() => toggle(c.clusterId)}>
                <span className="cluster-dot" style={{ background: color }} />
                <span className="cluster-id">Cluster {c.clusterId}</span>
                <span className="cluster-size">{c.size} addresses</span>
                <span className="cluster-central mono">Central: {c.centralAddress?.slice(0, 10)}...</span>
                <span className="cluster-toggle">{isOpen ? "▲" : "▼"}</span>
              </div>
              {isOpen && (
                <div className="cluster-addresses">
                  {c.addresses.map((addr) => (
                    <div key={addr} className="cluster-addr-row">
                      {addr === c.centralAddress && (
                        <span className="central-badge">central</span>
                      )}
                      <span className="addr-mono">{addr}</span>
                      <a
                        href={`${explorerBase}/address/${addr}`}
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
