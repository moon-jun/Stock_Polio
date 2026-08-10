import type { StockQuote } from '../stock/model';

const WORKER_URL = import.meta.env.VITE_WORKER_API_URL || 'http://localhost:8787';

export async function searchStocks(query: string) {
  const res = await fetch(`${WORKER_URL}/api/search?q=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error("SEARCH_FAILED");
  return res.json();
}

export async function fetchBatchQuotes(symbols: string[], fresh: boolean = false): Promise<StockQuote[]> {
  if (symbols.length === 0) return [];
  const res = await fetch(`${WORKER_URL}/api/quotes${fresh ? '?fresh=true' : ''}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ symbols })
  });
  
  if (!res.ok) {
    if (res.status === 429) throw new Error("RATE_LIMITED");
    throw new Error("QUOTE_FAILED");
  }
  
  const data = await res.json();
  return data.quotes || [];
}
