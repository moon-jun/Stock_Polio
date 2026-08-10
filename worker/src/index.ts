import { normalizeSymbol, isValidSymbol } from './validation';
import { fetchQuote } from './yahoo';

export interface Env {
  SEARCH_LIMITER: any;
  QUOTE_LIMITER: any;
  FRESH_QUOTE_LIMITER: any;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Adjust in production
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function handleOptions() {
  return new Response(null, { headers: corsHeaders });
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return handleOptions();
    }

    const url = new URL(request.url);
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';

    if (url.pathname === '/api/quotes' && request.method === 'POST') {
      const isFresh = url.searchParams.get('fresh') === 'true';
      const limiter = isFresh ? env.FRESH_QUOTE_LIMITER : env.QUOTE_LIMITER;
      
      if (limiter) {
        const { success } = await limiter.limit({ key: ip });
        if (!success) {
          return new Response(JSON.stringify({ error: "RATE_LIMITED" }), { 
            status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          });
        }
      }

      try {
        const body = (await request.json()) as any;
        if (!body.symbols || !Array.isArray(body.symbols) || body.symbols.length === 0) {
          return new Response(JSON.stringify({ error: "INVALID_REQUEST" }), { 
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          });
        }

        const symbols: string[] = Array.from(new Set(body.symbols.map(normalizeSymbol).filter(isValidSymbol)));
        if (symbols.length > 35) {
          return new Response(JSON.stringify({ error: "TOO_MANY_SYMBOLS" }), { 
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          });
        }

        const cache = caches.default;
        const quotes = [];
        const errors = [];

        // Concurrency limit for Yahoo API
        const chunkedFetch = async (sym: string) => {
          const cacheKey = new Request(`https://api.stockpolio.local/quote/${sym}`);
          if (!isFresh) {
            const cachedRes = await cache.match(cacheKey);
            if (cachedRes) {
              return await cachedRes.json();
            }
          }

          const quote = await fetchQuote(sym);
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
        const results = [];
        for (let i = 0; i < symbols.length; i += 5) {
          const chunk = symbols.slice(i, i + 5);
          const chunkResults = await Promise.all(chunk.map(chunkedFetch));
          results.push(...chunkResults.filter(r => r !== null));
        }

        return new Response(JSON.stringify({ quotes: results, errors }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (e) {
        return new Response(JSON.stringify({ error: "INVALID_REQUEST" }), { 
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }
    }

    return new Response(JSON.stringify({ error: "NOT_FOUND" }), { 
      status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  },
};
