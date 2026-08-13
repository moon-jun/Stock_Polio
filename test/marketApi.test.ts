import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchBatchQuotes } from '../src/shared/marketApi';

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('fetchBatchQuotes', () => {
  it('일시적인 전체 실패는 한 번 재시도한다', async () => {
    vi.useFakeTimers();
    const quote = {
      symbol: 'AAPL', name: '애플', price: 200, currency: 'USD',
      asOf: '2026-08-14T00:00:00.000Z', marketState: 'CLOSED',
    };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response('{}', { status: 500 }))
      .mockResolvedValueOnce(Response.json({ quotes: [quote] }));
    vi.stubGlobal('fetch', fetchMock);

    const request = fetchBatchQuotes(['AAPL']);
    await vi.advanceTimersByTimeAsync(800);

    await expect(request).resolves.toEqual([quote]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('호출 제한은 재시도하지 않는다', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 429 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchBatchQuotes(['AAPL'])).rejects.toThrow('RATE_LIMITED');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
