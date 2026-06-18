import React, { useEffect, useState } from "react";
import axios from "axios";
import "./CrawlStatus.css";

export default function CrawlStatus({ apiBase }) {
  const [status, setStatus] = useState(null);

  useEffect(() => {
    axios.get(`${apiBase}/crawl/status`)
      .then((res) => setStatus(res.data))
      .catch(() => setStatus(null));
  }, [apiBase]);

  if (!status) return null;

  return (
    <div className="crawl-status">
      <span className="crawl-dot" />
      <span className="crawl-label">Index status:</span>
      <span className="crawl-item">
        Block <strong>{status.last_crawled_block?.toLocaleString() ?? "—"}</strong>
      </span>
      <span className="crawl-sep">·</span>
      <span className="crawl-item">
        <strong>{status.total_transactions?.toLocaleString()}</strong> txs
      </span>
      <span className="crawl-sep">·</span>
      <span className="crawl-item">
        <strong>{status.total_token_transfers?.toLocaleString()}</strong> token transfers
      </span>
      <span className="crawl-sep">·</span>
      <span className="crawl-item">
        <strong>{status.total_wallet_edges?.toLocaleString()}</strong> wallet edges
      </span>
    </div>
  );
}
