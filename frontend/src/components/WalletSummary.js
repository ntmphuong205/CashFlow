import React from "react";
import "./WalletSummary.css";

function StatCard({ label, value, highlight }) {
  return (
    <div className={`stat-card${highlight ? " highlight" : ""}`}>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

export default function WalletSummary({ address, summary }) {
  if (!summary) return null;

  const nodeColors = { hub: "#f59e0b", satellite: "#6366f1" };
  const nodeColor = nodeColors[summary.node_type] || "#94a3b8";
  const nodeLabel = summary.node_type === "hub" ? "Hub Node" : "Satellite Node";

  return (
    <div className="wallet-summary">
      <div className="wallet-header">
        <div className="wallet-address-block">
          <span className="wallet-address">{address}</span>
          <span className="network-label">Ethereum Sepolia (self-indexed)</span>
        </div>
        <span className="holder-badge" style={{ background: nodeColor }}>
          {nodeLabel}
        </span>
      </div>

      <div className="stat-grid">
        <StatCard label="Total Transactions" value={summary.total_transactions} highlight />
        <StatCard label="Sent (ETH)" value={summary.sent_count} />
        <StatCard label="Received (ETH)" value={summary.received_count} />
        <StatCard label="Related Addresses" value={summary.related_addresses} />
        <StatCard label="ETH Sent" value={`${summary.total_eth_sent} ETH`} />
        <StatCard label="ETH Received" value={`${summary.total_eth_received} ETH`} />
        <StatCard label="Token Transfers Out" value={summary.total_token_transfers_sent} />
        <StatCard label="Token Transfers In" value={summary.total_token_transfers_received} />
      </div>

      <div className="detail-row">
        <div>
          <span className="detail-label">Out-degree:</span>
          <span className="detail-value">{summary.out_degree} unique destinations</span>
        </div>
        <div>
          <span className="detail-label">In-degree:</span>
          <span className="detail-value">{summary.in_degree} unique senders</span>
        </div>
        <div>
          <span className="detail-label">Node role:</span>
          <span className="detail-value" style={{ color: nodeColor, fontWeight: 600 }}>
            {summary.node_type === "hub"
              ? "Central node (5+ connections)"
              : "Satellite node (<5 connections)"}
          </span>
        </div>
      </div>
    </div>
  );
}
