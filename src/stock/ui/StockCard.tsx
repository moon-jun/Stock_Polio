import React from 'react';
import type { ActiveStock, StockHistory, StockQuote } from '../model';
import { calculateReturnRate, isKoreanStock } from '../logic';

interface Props {
  stock: ActiveStock | StockHistory;
  ownerName: string;
  quote?: StockQuote;
  isHistory?: boolean;
  onClick?: () => void;
}

export const StockCard: React.FC<Props> = ({ stock, ownerName, quote, isHistory, onClick }) => {
  const currentPrice = isHistory ? (stock as StockHistory).sellPrice : quote?.price;
  const displayName = quote?.name || stock.name;
  
  let returnRate = 0;
  if (currentPrice && currentPrice > 0) {
    try {
      returnRate = calculateReturnRate(stock.buyPrice, currentPrice);
    } catch {
      returnRate = 0;
    }
  }

  const formatPrice = (price: number, currency: string) => {
    if (currency === 'KRW') return `${new Intl.NumberFormat('ko-KR').format(price)}원`;
    try {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(price);
    } catch {
      return `${new Intl.NumberFormat('en-US').format(price)} ${currency}`;
    }
  };

  const rateClass = returnRate > 0 ? 'price-up' : returnRate < 0 ? 'price-down' : 'price-neutral';
  const rateText = returnRate > 0 ? `+${returnRate.toFixed(2)}%` : `${returnRate.toFixed(2)}%`;
  const market = isKoreanStock(stock.symbol) ? 'domestic' : 'global';

  return (
    <div className={`stock-card stock-card--${market}`} onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
      <div className="stock-info">
        <h3>{displayName}</h3>
        <p><span className={`market-badge market-badge--${market}`}>{market === 'domestic' ? '국내' : '해외'}</span> {stock.symbol} • {isHistory ? '종료됨' : (quote ? '진행 중' : '가격 불러오는 중...')}</p>
        <p style={{ fontSize: '11px', marginTop: '2px' }}>
          {ownerName} 픽 · 등록가 {formatPrice(stock.buyPrice, stock.currency)}
        </p>
      </div>
      <div className="stock-price">
        {currentPrice ? (
          <>
            <h4>{formatPrice(currentPrice, stock.currency)}</h4>
            <p className={rateClass}>{rateText}</p>
          </>
        ) : (
          <p className="price-neutral">-</p>
        )}
      </div>
    </div>
  );
};
