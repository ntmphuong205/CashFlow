import React, { useState } from "react";
import axios from "axios";
import SearchBar from "./components/SearchBar";
import WalletSummary from "./components/WalletSummary";
import CashFlowGraph from "./components/CashFlowGraph";
import TransactionTable from "./components/TransactionTable";
import CrawlStatus from "./components/CrawlStatus";
import "./App.css";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:8000/api";

export default function App() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [transactions, setTransactions] = useState([]);

  const handleAnalyze = async (address, depth) => {
    setLoading(true);
    setError(null);
    setResult(null);
    setTransactions([]);
    try {
      const [graphRes, txRes] = await Promise.all([
        axios.get(`${API_BASE}/wallet/${address}/graph`, { params: { depth } }),
        axios.get(`${API_BASE}/wallet/${address}/transactions`, { params: { limit: 50 } }),
      ]);
      setResult(graphRes.data);
      setTransactions(txRes.data.transactions || []);
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || "Failed to fetch data";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>CashFlow Map</h1>
        <p className="subtitle">Self-Indexed Ethereum Sepolia Wallet Tracker</p>
      </header>

      <main className="app-main">
        <CrawlStatus apiBase={API_BASE} />
        <SearchBar onAnalyze={handleAnalyze} loading={loading} />

        {error && (
          <div className="error-box">
            {error.includes("could not connect") || error.includes("Connection refused")
              ? "Cannot connect to database. Make sure PostgreSQL is running and the crawler has indexed some blocks."
              : error}
          </div>
        )}
        {loading && <div className="loading-box">Querying self-indexed Sepolia data...</div>}

        {result && (
          <>
            <WalletSummary address={result.address} summary={result.summary} />
            <CashFlowGraph graphData={result.graph} />
            <TransactionTable transactions={transactions} address={result.address} />
          </>
        )}
      </main>

      <footer className="app-footer">
        Data is self-indexed from Ethereum Sepolia via JSON-RPC. No third-party APIs used.
      </footer>
    </div>
  );
}
