import React, { useEffect, useState } from 'react';
import { addStock } from '../api';
import { useAuth } from '../../auth/AuthProvider';
import { searchStocks, type StockSearchResult } from '../../shared/marketApi';

export const AddStockModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { userId } = useAuth();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState<StockSearchResult[]>([]);
  const [selectedName, setSelectedName] = useState('');

  useEffect(() => {
    const value = query.trim();
    if (value.length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      searchStocks(value)
        .then(found => { if (!cancelled) setResults(found); })
        .catch(() => { if (!cancelled) setResults([]); });
    }, 300);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query || !userId) return;
    
    setLoading(true);
    setError('');
    try {
      // 심플 MVP: 검색 없이 티커 직접 입력으로 간주하거나, 향후 searchStocks 연동
      await addStock(userId, query.toUpperCase().trim(), selectedName || undefined);
      onClose();
    } catch (err: any) {
      if (err.message === 'ACTIVE_STOCK_LIMIT') setError('최대 5개까지만 등록할 수 있습니다.');
      else if (err.message === 'DUPLICATE_STOCK') setError('이미 등록된 종목입니다.');
      else if (err.message === 'INVALID_QUOTE') setError('유효하지 않은 종목이거나 가격을 불러올 수 없습니다.');
      else setError('등록에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <h2>새 종목 추천하기</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            className="search-input"
            placeholder="주식 이름 또는 티커 검색"
            value={query}
            onChange={e => { setQuery(e.target.value); setSelectedName(''); }}
            disabled={loading}
          />
          <p className="search-hint">예: 삼성전자, 카카오, Apple, AAPL, 005930.KS</p>
          {results.length > 0 && (
            <div className="search-results">
              {results.map(result => (
                <button key={result.symbol} type="button" onClick={() => { setQuery(result.symbol); setSelectedName(result.name); setResults([]); }}>
                  <strong>{result.name}</strong> <span>{result.symbol}</span>
                </button>
              ))}
            </div>
          )}
          {error && <p className="error-text">{error}</p>}
          <button type="submit" className="btn-primary" disabled={loading || !query}>
            {loading ? '등록 중...' : '추천하기'}
          </button>
        </form>
      </div>
    </div>
  );
};
