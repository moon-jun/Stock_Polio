export function calculateReturnRate(buyPrice: number, comparisonPrice: number) {
  if (buyPrice <= 0 || comparisonPrice <= 0) {
    throw new Error("INVALID_PRICE");
  }
  return ((comparisonPrice - buyPrice) / buyPrice) * 100;
}
