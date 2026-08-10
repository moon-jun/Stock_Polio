import { describe, expect, it } from 'vitest';
import { mapYahooQuote } from '../worker/src/yahoo';

const response = (overrides: Record<string, unknown> = {}) => ({
  chart: { result: [{ meta: {
    symbol: '005930.KS', shortName: '삼성전자', regularMarketPrice: 70000,
    regularMarketTime: 1_700_000_000, currency: 'KRW', instrumentType: 'EQUITY',
    marketState: 'CLOSED', ...overrides,
  } }] },
});

describe('Yahoo quote mapping', () => {
  it('정상 주식 응답을 매핑한다', () => {
    expect(mapYahooQuote(response(), '005930.KS')).toMatchObject({
      symbol: '005930.KS', price: 70000, currency: 'KRW', marketState: 'CLOSED',
    });
  });

  it('가격 누락과 ETF를 거부한다', () => {
    expect(mapYahooQuote(response({ regularMarketPrice: undefined }), '005930.KS')).toBeNull();
    expect(mapYahooQuote(response({ instrumentType: 'ETF' }), '069500.KS')).toBeNull();
  });

  it('USD 통화를 보존한다', () => {
    expect(mapYahooQuote(response({ symbol: 'AAPL', currency: 'USD' }), 'AAPL')?.currency).toBe('USD');
  });
});
