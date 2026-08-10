export type StockQuote = {
  symbol: string;
  name: string;
  price: number;
  currency: "USD" | "KRW";
  asOf: string;
  marketState: "REGULAR" | "PRE" | "POST" | "CLOSED" | "UNKNOWN";
};

export async function fetchQuote(symbol: string): Promise<StockQuote | null> {
  const url = \`https://query2.finance.yahoo.com/v8/finance/chart/\${symbol}\`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0'
      }
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as any;
    const meta = data.chart?.result?.[0]?.meta;
    
    if (!meta || !meta.regularMarketPrice) return null;

    return {
      symbol: meta.symbol,
      name: meta.shortName || meta.longName || symbol,
      price: meta.regularMarketPrice,
      currency: meta.currency === 'KRW' ? 'KRW' : 'USD',
      asOf: new Date(meta.regularMarketTime * 1000).toISOString(),
      marketState: "UNKNOWN" // Chart API doesn't cleanly expose market state
    };
  } catch (e) {
    return null;
  }
}
