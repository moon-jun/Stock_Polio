import { describe, it, expect } from 'vitest';
import { calculateReturnRate, isKoreanStock, paginate } from '../src/stock/logic';
import { normalizeSymbol, isValidSymbol } from '../worker/src/validation';

describe('calculateReturnRate', () => {
  it('수익률을 계산한다', () => {
    expect(calculateReturnRate(100, 110)).toBe(10);
    expect(calculateReturnRate(100, 90)).toBe(-10);
    expect(calculateReturnRate(100, 100)).toBe(0);
  });

  it('0 이하 가격을 거부한다', () => {
    expect(() => calculateReturnRate(0, 100)).toThrow('INVALID_PRICE');
    expect(() => calculateReturnRate(100, -10)).toThrow('INVALID_PRICE');
  });
});

describe('paginate', () => {
  it('전체 순서를 유지하며 페이지 범위를 보정한다', () => {
    const values = Array.from({ length: 25 }, (_, index) => index + 1);
    expect(paginate(values, 1, 10)).toEqual({
      items: [11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
      currentPage: 1,
      totalPages: 3,
    });
    expect(paginate(values, 99, 10).currentPage).toBe(2);
  });
});

describe('market classification', () => {
  it('국내와 해외 심볼을 구분한다', () => {
    expect(isKoreanStock('005930.KS')).toBe(true);
    expect(isKoreanStock('035720.KQ')).toBe(true);
    expect(isKoreanStock('AAPL')).toBe(false);
    expect(isKoreanStock('AIR.PA')).toBe(false);
  });
});

describe('symbol validation', () => {
  it('정규화하고 허용 문자만 받는다', () => {
    expect(normalizeSymbol(' 005930.ks ')).toBe('005930.KS');
    expect(isValidSymbol('AAPL')).toBe(true);
    expect(isValidSymbol('035720.KQ')).toBe(true);
    expect(isValidSymbol('INV/ALID')).toBe(false);
  });
});
