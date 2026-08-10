import { describe, it, expect } from 'vitest';
import { calculateReturnRate } from '../src/stock/logic';
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

describe('symbol validation', () => {
  it('정규화하고 허용 문자만 받는다', () => {
    expect(normalizeSymbol(' 005930.ks ')).toBe('005930.KS');
    expect(isValidSymbol('AAPL')).toBe(true);
    expect(isValidSymbol('035720.KQ')).toBe(true);
    expect(isValidSymbol('INV/ALID')).toBe(false);
  });
});
