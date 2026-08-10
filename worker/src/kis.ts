import type { StockQuote } from "./yahoo";

export type KisEnv = { KIS_APP_KEY?: string; KIS_APP_SECRET?: string };

let tokenCache: { value: string; expiresAt: number } | undefined;

async function accessToken(env: KisEnv) {
  if (tokenCache && tokenCache.expiresAt > Date.now() + 60_000) return tokenCache.value;
  if (!env.KIS_APP_KEY || !env.KIS_APP_SECRET) return null;
  const response = await fetch("https://openapi.koreainvestment.com:9443/oauth2/tokenP", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ grant_type: "client_credentials", appkey: env.KIS_APP_KEY, appsecret: env.KIS_APP_SECRET }),
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) return null;
  const data = await response.json() as { access_token?: string; expires_in?: number };
  if (!data.access_token) return null;
  tokenCache = { value: data.access_token, expiresAt: Date.now() + Number(data.expires_in || 3600) * 1000 };
  return tokenCache.value;
}

export async function fetchKisQuote(symbol: string, env: KisEnv): Promise<StockQuote | null> {
  if (!/^\d{6}\.(KS|KQ)$/.test(symbol) || !env.KIS_APP_KEY || !env.KIS_APP_SECRET) return null;
  try {
    const token = await accessToken(env);
    if (!token) return null;
    const code = symbol.slice(0, 6);
    const headers = {
      authorization: `Bearer ${token}`,
      appkey: env.KIS_APP_KEY!,
      appsecret: env.KIS_APP_SECRET!,
    };
    const infoUrl = new URL("https://openapi.koreainvestment.com:9443/uapi/domestic-stock/v1/quotations/search-info");
    infoUrl.searchParams.set("pdno", code);
    infoUrl.searchParams.set("prdt_type_cd", "300");
    const infoResponse = await fetch(infoUrl, {
      headers: { ...headers, tr_id: "CTPF1604R" },
      signal: AbortSignal.timeout(5000),
    });
    if (!infoResponse.ok) return null;
    const info = await infoResponse.json() as { output?: { scty_grp_id_cd?: string; prdt_name?: string } };
    if (info.output?.scty_grp_id_cd !== "ST") return null;

    const url = new URL("https://openapi.koreainvestment.com:9443/uapi/domestic-stock/v1/quotations/inquire-price");
    url.searchParams.set("fid_cond_mrkt_div_code", "J");
    url.searchParams.set("fid_input_iscd", code);
    const response = await fetch(url, {
      headers: { ...headers, tr_id: "FHKST01010100" },
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return null;
    const data = await response.json() as { output?: { stck_prpr?: string } };
    const price = Number(data.output?.stck_prpr);
    if (!Number.isFinite(price) || price <= 0) return null;
    return { symbol, name: info.output.prdt_name || symbol, price, currency: "KRW", asOf: new Date().toISOString(), marketState: "UNKNOWN" };
  } catch {
    return null;
  }
}
