import React, { useState } from "react";
import "./SearchBar.css";

export default function SearchBar({ onAnalyze, loading }) {
  const [address, setAddress] = useState("");
  const [depth, setDepth] = useState(1);

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = address.trim();
    if (!trimmed) return;
    onAnalyze(trimmed, depth);
  };

  return (
    <div className="search-wrapper">
      <form className="search-bar" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Enter Ethereum Sepolia wallet address (0x...)"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          disabled={loading}
          spellCheck={false}
        />
        <div className="depth-selector">
          <label>Depth</label>
          <button
            type="button"
            className={depth === 1 ? "active" : ""}
            onClick={() => setDepth(1)}
            disabled={loading}
          >
            1
          </button>
          <button
            type="button"
            className={depth === 2 ? "active" : ""}
            onClick={() => setDepth(2)}
            disabled={loading}
          >
            2
          </button>
        </div>
        <button type="submit" disabled={loading || !address.trim()}>
          {loading ? "Analyzing..." : "Analyze"}
        </button>
      </form>
      <p className="search-hint">
        Depth 1 = direct connections &nbsp;|&nbsp; Depth 2 = connections of connections
      </p>
    </div>
  );
}
