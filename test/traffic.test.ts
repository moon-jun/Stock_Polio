import { describe, expect, it } from 'vitest';
import { summarizeTraffic } from '../src/shared/traffic';

describe('summarizeTraffic', () => {
  it('counts today and the last seven days', () => {
    expect(summarizeTraffic([
      { date: '2026-08-19', views: 2 },
      { date: '2026-08-18', views: 3 },
    ], '2026-08-19')).toEqual({
      todayViews: 2,
      weeklyViews: 5,
    });
  });
});
