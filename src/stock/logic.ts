export function calculateReturnRate(buyPrice: number, comparisonPrice: number) {
  if (buyPrice <= 0 || comparisonPrice <= 0) {
    throw new Error("INVALID_PRICE");
  }
  return ((comparisonPrice - buyPrice) / buyPrice) * 100;
}

export function paginate<T>(items: T[], page: number, pageSize: number) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const currentPage = Math.min(Math.max(0, page), totalPages - 1);
  const start = currentPage * pageSize;
  return { items: items.slice(start, start + pageSize), currentPage, totalPages };
}

export function isKoreanStock(symbol: string) {
  return /\.(KS|KQ)$/.test(symbol);
}
