import type { StockQuote } from '../stock/model';

const WORKER_URL = import.meta.env.VITE_WORKER_API_URL?.trim()
  || (import.meta.env.DEV ? 'http://localhost:8787' : '');

function workerUrl(): string {
  if (!WORKER_URL) throw new Error('WORKER_NOT_CONFIGURED');
  return WORKER_URL;
}

export type StockSearchResult = Pick<StockQuote, 'symbol' | 'name' | 'currency'>;

export async function searchStocks(query: string): Promise<StockSearchResult[]> {
  const res = await fetch(`${workerUrl()}/api/search?q=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error("SEARCH_FAILED");
  const data = await res.json();
  return data.results || [];
}

export async function fetchBatchQuotes(symbols: string[], fresh: boolean = false): Promise<StockQuote[]> {
  if (symbols.length === 0) return [];
  const quotes: StockQuote[] = [];
  for (let index = 0; index < symbols.length; index += 35) {
    const res = await fetch(`${workerUrl()}/api/quotes${fresh ? '?fresh=true' : ''}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbols: symbols.slice(index, index + 35) })
    });

    if (!res.ok) {
      if (res.status === 429) throw new Error("RATE_LIMITED");
      throw new Error("QUOTE_FAILED");
    }

    const data = await res.json();
    quotes.push(...(data.quotes || []));
  }
  return quotes;
}
