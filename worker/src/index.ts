import { normalizeSymbol, isValidSymbol } from './validation';
import { fetchQuote, searchYahoo, type StockQuote } from './yahoo';
import { fetchKisQuote, type KisEnv } from './kis';

export interface Env extends KisEnv {
  SEARCH_LIMITER?: RateLimit;
  QUOTE_LIMITER?: RateLimit;
  FRESH_QUOTE_LIMITER?: RateLimit;
  ALLOWED_ORIGINS?: string;
}

function corsHeaders(request: Request, env: Env) {
  const origin = request.headers.get('Origin');
  const allowed = new Set(['http://localhost:5173', ...(env.ALLOWED_ORIGINS || '').split(',').map(v => v.trim()).filter(Boolean)]);
  return {
  'Access-Control-Allow-Origin': origin && allowed.has(origin) ? origin : 'null',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Vary': 'Origin',
  };
}

function json(request: Request, env: Env, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders(request, env), 'Content-Type': 'application/json' } });
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders(request, env) });
    }

    const url = new URL(request.url);
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';

    if (url.pathname === '/api/search' && request.method === 'GET') {
      const query = (url.searchParams.get('q') || '').trim();
      if (query.length < 2 || query.length > 50) return json(request, env, { error: 'INVALID_QUERY' }, 400);
      if (env.SEARCH_LIMITER && !(await env.SEARCH_LIMITER.limit({ key: ip })).success) {
        return json(request, env, { error: 'RATE_LIMITED' }, 429);
      }
      const cacheKey = new Request(`https://api.stockpolio.local/search?q=${encodeURIComponent(query.toLowerCase())}`);
      const cached = await caches.default.match(cacheKey);
      if (cached) return new Response(cached.body, { headers: { ...cached.headers, ...corsHeaders(request, env) } });
      const results = await searchYahoo(query);
      const response = json(request, env, { results });
      if (results.length) {
        const cacheResponse = new Response(JSON.stringify({ results }), { headers: { 'Content-Type': 'application/json', 'Cache-Control': 's-maxage=300' } });
        ctx.waitUntil(caches.default.put(cacheKey, cacheResponse));
      }
      return response;
    }

    if (url.pathname === '/api/quotes' && request.method === 'POST') {
      const isFresh = url.searchParams.get('fresh') === 'true';
      const limiter = isFresh ? env.FRESH_QUOTE_LIMITER : env.QUOTE_LIMITER;
      
      if (limiter) {
        const { success } = await limiter.limit({ key: ip });
        if (!success) {
          return json(request, env, { error: "RATE_LIMITED" }, 429);
        }
      }

      try {
        const body = (await request.json()) as any;
        if (!body.symbols || !Array.isArray(body.symbols) || body.symbols.length === 0) {
          return json(request, env, { error: "INVALID_REQUEST" }, 400);
        }

        const symbols: string[] = Array.from(new Set(body.symbols.map(normalizeSymbol).filter(isValidSymbol)));
        if (symbols.length === 0 || symbols.length !== new Set(body.symbols.map(normalizeSymbol)).size) {
          return json(request, env, { error: "INVALID_SYMBOL" }, 400);
        }
        if (symbols.length > 35) {
          return json(request, env, { error: "TOO_MANY_SYMBOLS" }, 400);
        }

        const cache = caches.default;
        const errors: Array<{ symbol: string; code: string }> = [];

        // Concurrency limit for Yahoo API
        const chunkedFetch = async (sym: string) => {
          const cacheKey = new Request(`https://api.stockpolio.local/quote/${sym}`);
          if (!isFresh) {
            const cachedRes = await cache.match(cacheKey);
            if (cachedRes) {
              return await cachedRes.json() as StockQuote;
            }
          }

          const quote = await fetchQuote(sym) || await fetchKisQuote(sym, env);
          if (quote) {
            const responseToCache = new Response(JSON.stringify(quote), {
              headers: { 'Cache-Control': 's-maxage=60' }
            });
            ctx.waitUntil(cache.put(cacheKey, responseToCache));
            return quote;
          } else {
            errors.push({ symbol: sym, code: "SYMBOL_NOT_FOUND" });
            return null;
          }
        };

        // Fetch all in parallel (max 35 is okay, but plan says max 5 concurrent)
        // We will just use Promise.all for simplicity as 35 isn't huge, but to strictly follow max 5:
        const results: StockQuote[] = [];
        for (let i = 0; i < symbols.length; i += 5) {
          const chunk = symbols.slice(i, i + 5);
          const chunkResults = await Promise.all(chunk.map(chunkedFetch));
          results.push(...chunkResults.filter(r => r !== null));
        }

        return json(request, env, { quotes: results, errors });
      } catch {
        return json(request, env, { error: "INVALID_REQUEST" }, 400);
      }
    }

    return json(request, env, { error: "NOT_FOUND" }, 404);
  },
};
