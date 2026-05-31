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

export default function WalletSummary({ address, stats, networkLabel }) {
  if (!stats) return null;

  const holderColors = { Whale: "#f59e0b", Medium: "#6366f1", Small: "#10b981" };
  const holderColor = holderColors[stats.holderType] || "#94a3b8";

  return (
    <div className="wallet-summary">
      <div className="wallet-header">
        <div className="wallet-address-block">
          <span className="wallet-address">{address}</span>
          {networkLabel && <span className="network-label">{networkLabel}</span>}
        </div>
        <span className="holder-badge" style={{ background: holderColor }}>
          {stats.holderType} Holder
        </span>
      </div>

      <div className="stat-grid">
        <StatCard label="Total Transactions" value={stats.totalTransactions} />
        <StatCard label="Sent" value={stats.sentCount} />
        <StatCard label="Received" value={stats.receivedCount} />
        <StatCard label="Unique Counterparties" value={stats.uniqueCounterparties} />
        <StatCard label="Total Sent" value={`${stats.totalSentValue} ETH`} />
        <StatCard label="Total Received" value={`${stats.totalReceivedValue} ETH`} />
        <StatCard label="Largest Tx" value={`${stats.largestTransaction} ETH`} />
        <StatCard label="Most Used Asset" value={stats.mostUsedAsset} />
      </div>

      <div className="detail-row">
        <div>
          <span className="detail-label">Top counterparty (volume):</span>
          <span className="detail-value mono">{stats.topCounterpartyByVolume}</span>
        </div>
        <div>
          <span className="detail-label">Top counterparty (frequency):</span>
          <span className="detail-value mono">{stats.topCounterpartyByFrequency}</span>
        </div>
        <div>
          <span className="detail-label">First seen:</span>
          <span className="detail-value">{stats.firstSeen !== "N/A" ? new Date(stats.firstSeen).toLocaleDateString() : "N/A"}</span>
        </div>
        <div>
          <span className="detail-label">Last seen:</span>
          <span className="detail-value">{stats.lastSeen !== "N/A" ? new Date(stats.lastSeen).toLocaleDateString() : "N/A"}</span>
        </div>
      </div>

      {stats.abnormalFlags && stats.abnormalFlags.length > 0 && (
        <div className="abnormal-flags">
          <div className="flags-title">Abnormal Signals</div>
          {stats.abnormalFlags.map((flag, i) => (
            <span key={i} className="flag-badge">{flag}</span>
          ))}
        </div>
      )}

      <p className="disclaimer">
        This tool performs on-chain behavioral analysis only. It does not identify
        real-world identities behind wallet addresses.
      </p>
    </div>
  );
}
