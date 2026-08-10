import React from 'react';
import type { ActiveStock, StockHistory, StockQuote } from '../model';
import { calculateReturnRate } from '../logic';

interface Props {
  stock: ActiveStock | StockHistory;
  quote?: StockQuote;
  isHistory?: boolean;
  onClick?: () => void;
}

export const StockCard: React.FC<Props> = ({ stock, quote, isHistory, onClick }) => {
  const currentPrice = isHistory ? (stock as StockHistory).sellPrice : quote?.price;
  
  let returnRate = 0;
  if (currentPrice && currentPrice > 0) {
    try {
      returnRate = calculateReturnRate(stock.buyPrice, currentPrice);
    } catch {
      returnRate = 0;
    }
  }

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(price);
  };

  const rateClass = returnRate > 0 ? 'price-up' : returnRate < 0 ? 'price-down' : 'price-neutral';
  const rateText = returnRate > 0 ? `+\${returnRate.toFixed(2)}%` : `\${returnRate.toFixed(2)}%`;

  return (
    <div className="stock-card" onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
      <div className="stock-info">
        <h3>{stock.name}</h3>
        <p>{stock.symbol} • {isHistory ? '종료됨' : (quote ? '진행 중' : '가격 불러오는 중...')}</p>
        <p style={{ fontSize: '11px', marginTop: '2px' }}>
          {stock.userId}의 추천 • 등록가 {formatPrice(stock.buyPrice, stock.currency)}
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
