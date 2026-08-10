export function normalizeSymbol(symbol: string): string {
  return symbol.toUpperCase().trim();
}

export function isValidSymbol(symbol: string): boolean {
  // 대문자 영문, 숫자, 마침표, 하이픈 최대 20자 (슬래시 금지)
  const regex = /^[A-Z0-9.-]{1,20}$/;
  return regex.test(symbol);
}
