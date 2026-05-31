import React, { useState } from "react";
import "./SearchBar.css";

const NETWORKS = [
  { value: "eth-sepolia",    label: "Ethereum Sepolia (Testnet)", explorer: "https://sepolia.etherscan.io" },
  { value: "eth-mainnet",    label: "Ethereum Mainnet",           explorer: "https://etherscan.io" },
  { value: "polygon-mainnet",label: "Polygon Mainnet",            explorer: "https://polygonscan.com" },
  { value: "base-mainnet",   label: "Base Mainnet",               explorer: "https://basescan.org" },
  { value: "arb-mainnet",    label: "Arbitrum Mainnet",           explorer: "https://arbiscan.io" },
];

export { NETWORKS };

export default function SearchBar({ onAnalyze, loading }) {
  const [address, setAddress] = useState("");
  const [network, setNetwork] = useState("eth-sepolia");

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = address.trim();
    if (!trimmed) return;
    onAnalyze(trimmed, network);
  };

  const selectedNet = NETWORKS.find((n) => n.value === network);

  return (
    <div className="search-wrapper">
      <div className="network-selector">
        {NETWORKS.map((n) => (
          <button
            key={n.value}
            type="button"
            className={`network-btn${network === n.value ? " active" : ""}`}
            onClick={() => setNetwork(n.value)}
            disabled={loading}
          >
            {n.label}
          </button>
        ))}
      </div>
      <form className="search-bar" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder={`Enter wallet address on ${selectedNet?.label}...`}
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          disabled={loading}
          spellCheck={false}
        />
        <button type="submit" disabled={loading || !address.trim()}>
          {loading ? "Analyzing..." : "Analyze"}
        </button>
      </form>
    </div>
  );
}
