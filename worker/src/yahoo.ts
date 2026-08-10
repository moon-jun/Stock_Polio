export type StockQuote = {
  symbol: string;
  name: string;
  price: number;
  currency: "USD" | "KRW";
  asOf: string;
  marketState: "REGULAR" | "PRE" | "POST" | "CLOSED" | "UNKNOWN";
};

export type StockSearchResult = Pick<StockQuote, "symbol" | "name" | "currency">;

function supportedSymbol(symbol: string) {
  return /^[A-Z][A-Z0-9.-]*$/.test(symbol) || /^\d{6}\.(KS|KQ)$/.test(symbol);
}

export function mapYahooQuote(data: unknown, fallbackSymbol: string): StockQuote | null {
  const meta = (data as { chart?: { result?: Array<{ meta?: Record<string, unknown> }> } })
    .chart?.result?.[0]?.meta;
  const price = Number(meta?.regularMarketPrice);
  const time = Number(meta?.regularMarketTime);
  const currency = meta?.currency;
  const quoteType = meta?.instrumentType;
  if (!meta || !Number.isFinite(price) || price <= 0 || !Number.isFinite(time)) return null;
  if (quoteType !== "EQUITY") return null;
  if (currency !== "USD" && currency !== "KRW") return null;
  const symbol = String(meta.symbol || fallbackSymbol).toUpperCase();
  if (!supportedSymbol(symbol)) return null;

  const rawState = String(meta.marketState || "UNKNOWN");
  const marketState = (["REGULAR", "PRE", "POST", "CLOSED"] as const).find(v => v === rawState) || "UNKNOWN";
  return {
    symbol,
    name: String(meta.shortName || meta.longName || symbol),
    price,
    currency,
    asOf: new Date(time * 1000).toISOString(),
    marketState,
  };
}

async function yahooFetch(url: string): Promise<Response> {
  return fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
    signal: AbortSignal.timeout(5000),
  });
}

async function fetchKoreanName(symbol: string): Promise<string | null> {
  if (!/^\d{6}\.(KS|KQ)$/.test(symbol)) return null;
  try {
    const response = await fetch(`https://finance.naver.com/item/main.naver?code=${symbol.slice(0, 6)}`, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return null;
    const title = (await response.text()).match(/<title>\s*([^:<]+?)\s*:/i)?.[1]?.trim();
    return title && /[가-힣]/.test(title) ? title : null;
  } catch {
    return null;
  }
}

export async function fetchQuote(symbol: string): Promise<StockQuote | null> {
  try {
    const response = await yahooFetch(`https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?lang=ko-KR&region=KR`);
    if (!response.ok) return null;
    const quote = mapYahooQuote(await response.json(), symbol);
    if (!quote) return null;
    const koreanName = await fetchKoreanName(quote.symbol);
    return koreanName ? { ...quote, name: koreanName } : quote;
  } catch {
    return null;
  }
}

export async function searchYahoo(query: string): Promise<StockSearchResult[]> {
  if (/[가-힣]/.test(query)) return searchKoreanStocks(query);
  try {
    const response = await yahooFetch(`https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=20&newsCount=0&lang=ko-KR&region=KR`);
    if (!response.ok) return [];
    const data = await response.json() as { quotes?: Array<Record<string, unknown>> };
    const results = (data.quotes || [])
      .filter(item => item.quoteType === "EQUITY")
      .map(item => ({
        symbol: String(item.symbol || "").toUpperCase(),
        name: String(item.shortname || item.longname || item.symbol || ""),
        currency: String(item.currency) === "KRW" ? "KRW" as const : "USD" as const,
      }))
      .filter(item => supportedSymbol(item.symbol))
      .slice(0, 10);
    return Promise.all(results.map(async item => ({
      ...item,
      name: await fetchKoreanName(item.symbol) || item.name,
    })));
  } catch {
    return [];
  }
}

async function searchKoreanStocks(query: string): Promise<StockSearchResult[]> {
  try {
    const response = await fetch(`https://ac.stock.naver.com/ac?q=${encodeURIComponent(query)}&target=stock`, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return [];
    const data = await response.json() as {
      items?: Array<{ code?: string; name?: string; typeCode?: string }>;
    };
    const candidates = (data.items || [])
      .filter(item => /^\d{6}$/.test(item.code || "") && (item.typeCode === "KOSPI" || item.typeCode === "KOSDAQ"))
      .slice(0, 10);
    const verified = await Promise.all(candidates.map(async (item): Promise<StockSearchResult | null> => {
      const symbol = `${item.code}.${item.typeCode === "KOSPI" ? "KS" : "KQ"}`;
      const quote = await fetchQuote(symbol);
      return quote ? { symbol, name: item.name || quote.name, currency: "KRW" as const } : null;
    }));
    return verified.filter((item): item is StockSearchResult => item !== null);
  } catch {
    return [];
  }
}
