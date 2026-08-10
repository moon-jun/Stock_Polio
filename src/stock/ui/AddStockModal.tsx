import React, { useState } from 'react';
import { addStock } from '../api';
import { useAuth } from '../../auth/AuthProvider';

export const AddStockModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { userId } = useAuth();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query || !userId) return;
    
    setLoading(true);
    setError('');
    try {
      // 심플 MVP: 검색 없이 티커 직접 입력으로 간주하거나, 향후 searchStocks 연동
      await addStock(userId, query.toUpperCase().trim());
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
            placeholder="종목 티커 입력 (예: AAPL, 005930.KS)"
            value={query}
            onChange={e => setQuery(e.target.value)}
            disabled={loading}
          />
          {error && <p className="error-text">{error}</p>}
          <button type="submit" className="btn-primary" disabled={loading || !query}>
            {loading ? '등록 중...' : '추천하기'}
          </button>
        </form>
      </div>
    </div>
  );
};
