import React, { useState } from "react";
import axios from "axios";
import SearchBar, { NETWORKS } from "./components/SearchBar";
import WalletSummary from "./components/WalletSummary";
import CashFlowGraph from "./components/CashFlowGraph";
import "./App.css";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:8000/api";

export default function App() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [activeNetwork, setActiveNetwork] = useState(null);

  const handleAnalyze = async (address, network) => {
    setLoading(true);
    setError(null);
    setResult(null);
    setActiveNetwork(network);
    try {
      const res = await axios.get(`${API_BASE}/wallet/${address}/graph`, {
        params: { network },
      });
      setResult(res.data);
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || "Failed to fetch data";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const networkInfo = NETWORKS.find((n) => n.value === activeNetwork);

  return (
    <div className="app">
      <header className="app-header">
        <h1>Blockchain Account Tracker</h1>
        <p className="subtitle">On-chain transaction analysis and cashflow visualization</p>
      </header>

      <main className="app-main">
        <SearchBar onAnalyze={handleAnalyze} loading={loading} />

        {error && <div className="error-box">{error}</div>}
        {loading && <div className="loading-box">Fetching on-chain data from {networkInfo?.label}...</div>}

        {result && (
          <>
            <WalletSummary
              address={result.address}
              stats={result.stats}
              networkLabel={networkInfo?.label}
            />
            <CashFlowGraph
              graphData={result.graph}
              explorerBase={networkInfo?.explorer}
            />
          </>
        )}
      </main>

      <footer className="app-footer">
        This project performs on-chain behavioral analysis only. It does not identify
        real-world identities behind wallet addresses.
      </footer>
    </div>
  );
}
