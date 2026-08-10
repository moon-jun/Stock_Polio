import React, { useState } from 'react';
import { closeStock } from '../api';
import { useAuth } from '../../auth/AuthProvider';
import type { ActiveStock } from '../model';

export const CloseStockConfirm: React.FC<{ 
  stock: ActiveStock; 
  currentPrice?: number;
  onClose: () => void;
}> = ({ stock, currentPrice, onClose }) => {
  const { userId } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleClose = async () => {
    if (!userId) return;
    
    setLoading(true);
    setError('');
    try {
      await closeStock(userId, stock.symbol);
      onClose();
    } catch (err: any) {
      setError(err.message || '종료에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <h2>종목 추천 종료</h2>
        <p>
          <strong>{stock.name}</strong> ({stock.symbol}) 추천을 종료하시겠습니까?
        </p>
        <div style={{ padding: '16px', background: 'var(--color-bg-primary)', borderRadius: '8px', margin: '16px 0' }}>
          <p style={{ margin: '0 0 8px 0' }}>등록가: {stock.buyPrice} {stock.currency}</p>
          <p style={{ margin: 0 }}>현재 예상가: {currentPrice || '조회 중...'} {stock.currency}</p>
        </div>
        <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '24px' }}>
          종료 시 현재가를 기준으로 최종 수익률이 확정되며 히스토리에 기록됩니다.
        </p>
        
        {error && <p className="error-text">{error}</p>}
        
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn-primary" style={{ background: 'var(--color-text-secondary)' }} onClick={onClose} disabled={loading}>
            취소
          </button>
          <button className="btn-primary" style={{ marginTop: 0, background: 'var(--color-success)' }} onClick={handleClose} disabled={loading}>
            {loading ? '처리 중...' : '종료 확정'}
          </button>
        </div>
      </div>
    </div>
  );
};
