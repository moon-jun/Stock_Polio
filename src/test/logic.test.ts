import { describe, it, expect } from 'vitest';
import { calculateReturnRate } from '../stock/logic';
import { normalizeSymbol, isValidSymbol } from '../../worker/src/validation';

describe('calculateReturnRate', () => {
  it('양수 수익률 계산', () => {
    expect(calculateReturnRate(100, 110)).toBe(10);
  });

  it('음수 수익률 계산', () => {
    expect(calculateReturnRate(100, 90)).toBe(-10);
  });

  it('0% 수익률 계산', () => {
    expect(calculateReturnRate(100, 100)).toBe(0);
  });

  it('0 이하 가격 거부', () => {
    expect(() => calculateReturnRate(0, 100)).toThrow('INVALID_PRICE');
    expect(() => calculateReturnRate(100, -10)).toThrow('INVALID_PRICE');
  });
});

describe('validation rules', () => {
  it('symbol 정규화', () => {
    expect(normalizeSymbol(' aapl ')).toBe('AAPL');
    expect(normalizeSymbol('005930.ks')).toBe('005930.KS');
  });

  it('symbol 유효성', () => {
    expect(isValidSymbol('AAPL')).toBe(true);
    expect(isValidSymbol('005930.KS')).toBe(true);
    expect(isValidSymbol('035720.KQ')).toBe(true);
    expect(isValidSymbol('INV/ALID')).toBe(false);
    expect(isValidSymbol('TOOLONGTOOLONGTOOLONGTOOLONG')).toBe(false);
  });
});
