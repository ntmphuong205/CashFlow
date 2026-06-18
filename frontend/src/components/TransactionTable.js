import React, { useState } from "react";
import "./TransactionTable.css";

export default function TransactionTable({ transactions, address }) {
  const [filter, setFilter] = useState("all");

  if (!transactions || transactions.length === 0) return null;

  const addr = address.toLowerCase();
  const filtered = transactions.filter((tx) => {
    if (filter === "sent") return tx.from_address === addr;
    if (filter === "received") return tx.to_address === addr;
    return true;
  });

  const shortAddr = (a) => (a ? a.slice(0, 8) + "..." + a.slice(-6) : "—");

  return (
    <div className="tx-table-wrapper">
      <div className="tx-table-header">
        <h3>Transactions ({transactions.length})</h3>
        <div className="tx-filter">
          {["all", "sent", "received"].map((f) => (
            <button
              key={f}
              className={filter === f ? "active" : ""}
              onClick={() => setFilter(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="tx-table-scroll">
        <table className="tx-table">
          <thead>
            <tr>
              <th>Hash</th>
              <th>Block</th>
              <th>From</th>
              <th>To</th>
              <th>ETH Value</th>
              <th>Status</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((tx) => {
              const isSent = tx.from_address === addr;
              return (
                <tr key={tx.hash}>
                  <td>
                    <a
                      href={`https://sepolia.etherscan.io/tx/${tx.hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hash-link"
                    >
                      {tx.hash.slice(0, 10)}...
                    </a>
                  </td>
                  <td className="mono">{tx.block_number?.toLocaleString()}</td>
                  <td className="mono">
                    <span className={tx.from_address === addr ? "self-addr" : ""}>
                      {shortAddr(tx.from_address)}
                    </span>
                  </td>
                  <td className="mono">
                    <span className={tx.to_address === addr ? "self-addr" : ""}>
                      {shortAddr(tx.to_address)}
                    </span>
                  </td>
                  <td className={`value-cell ${isSent ? "sent" : "received"}`}>
                    {isSent ? "−" : "+"}{tx.value_eth} ETH
                  </td>
                  <td>
                    <span className={`status-badge ${tx.status === 1 ? "success" : "fail"}`}>
                      {tx.status === 1 ? "✓" : "✗"}
                    </span>
                  </td>
                  <td className="time-cell">
                    {tx.created_at ? new Date(tx.created_at).toLocaleString() : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
