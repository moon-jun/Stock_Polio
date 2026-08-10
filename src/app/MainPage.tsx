import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { AuthScreen } from '../auth/AuthScreen';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../shared/firebase';
import type { ActiveStock, StockHistory, User } from '../stock/model';
import { StockCard } from '../stock/ui/StockCard';
import { AddStockModal } from '../stock/ui/AddStockModal';
import { CloseStockConfirm } from '../stock/ui/CloseStockConfirm';
import { useStockPrices } from '../shared/useStockPrices';
import './styles.css';
import { calculateReturnRate } from '../stock/logic';

export const MainPage: React.FC = () => {
  const { userId, name, logout } = useAuth();
  
  const [activeStocks, setActiveStocks] = useState<ActiveStock[]>([]);
  const [history, setHistory] = useState<StockHistory[]>([]);
  const [users, setUsers] = useState<(User & { id: string })[]>([]);
  
  const [tab, setTab] = useState<'ranking'|'my'|'friends'|'history'>('ranking');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedStockToClose, setSelectedStockToClose] = useState<ActiveStock | null>(null);

  useEffect(() => {
    if (!userId) return;

    const unsubs = [
      onSnapshot(collection(db, 'activeStocks'), (snap) => {
        const data = snap.docs.map(doc => doc.data() as ActiveStock);
        setActiveStocks(data);
      }),
      onSnapshot(query(collection(db, 'stockHistory'), orderBy('closedAt', 'desc')), (snap) => {
        const data = snap.docs.map(doc => doc.data() as StockHistory);
        setHistory(data);
      }),
      onSnapshot(collection(db, 'users'), (snap) => {
        const data = snap.docs.map(doc => ({ ...doc.data(), id: doc.id } as User & { id: string }));
        setUsers(data);
      })
    ];

    return () => unsubs.forEach(unsub => unsub());
  }, [userId]);

  const activeSymbols = Array.from(new Set(activeStocks.map(s => s.symbol)));
  const { quotes } = useStockPrices(activeSymbols);

  if (!userId) return <AuthScreen />;

  // 랭킹 계산 (가격 불러온 종목들의 산술 평균)
  const userRankings = users.map(user => {
    const userStocks = activeStocks.filter(s => s.userId === user.id);
    let totalRate = 0;
    let validCount = 0;
    
    userStocks.forEach(stock => {
      const quote = quotes[stock.symbol];
      if (quote && quote.price > 0) {
        try {
          totalRate += calculateReturnRate(stock.buyPrice, quote.price);
          validCount++;
        } catch {}
      }
    });

    const averageRate = validCount > 0 ? totalRate / validCount : 0;
    
    // 진행중 랭킹을 위해 첫번째 등록 종목의 시간도 필요 (동점자 처리용)
    const firstAdded = userStocks.length > 0 ? Math.min(...userStocks.map(s => s.addedAt.toMillis())) : Infinity;

    return { 
      id: user.id, 
      name: user.name, 
      averageRate, 
      validCount, 
      totalStocks: userStocks.length,
      firstAdded
    };
  }).filter(u => u.totalStocks > 0)
    .sort((a, b) => {
      if (b.averageRate !== a.averageRate) return b.averageRate - a.averageRate;
      return a.firstAdded - b.firstAdded;
    });

  const renderRanking = () => (
    <div>
      <h2 style={{ padding: '16px 16px 0' }}>진행 중인 랭킹</h2>
      {userRankings.map((u, i) => (
        <div key={u.id} style={{ padding: '16px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ margin: '0 0 4px' }}>{i + 1}위: {u.name}</h3>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-text-secondary)' }}>
              활성 종목 {u.totalStocks}개 (유효 {u.validCount}개)
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <h4 style={{ margin: '0 0 4px', color: u.averageRate > 0 ? 'var(--color-success)' : u.averageRate < 0 ? 'var(--color-danger)' : 'var(--color-text-secondary)' }}>
              {u.averageRate > 0 ? '+' : ''}{u.averageRate.toFixed(2)}%
            </h4>
          </div>
        </div>
      ))}
      {userRankings.length === 0 && <p style={{ padding: '16px', color: 'var(--color-text-secondary)' }}>아직 진행 중인 추천이 없습니다.</p>}
    </div>
  );

  const renderMyStocks = () => {
    const myStocks = activeStocks.filter(s => s.userId === userId);
    return (
      <div>
        <div style={{ padding: '16px' }}>
          <p style={{ margin: '0 0 16px', color: 'var(--color-text-secondary)' }}>내 추천 종목 ({myStocks.length}/5)</p>
          <button className="btn-primary" style={{ marginTop: 0 }} onClick={() => setIsAddModalOpen(true)} disabled={myStocks.length >= 5}>
            새 종목 추천하기
          </button>
        </div>
        <div>
          {myStocks.map(stock => (
            <StockCard 
              key={stock.symbol} 
              stock={stock} 
              quote={quotes[stock.symbol]} 
              onClick={() => setSelectedStockToClose(stock)}
            />
          ))}
        </div>
      </div>
    );
  };

  const renderFriendsStocks = () => {
    const friendsStocks = activeStocks.filter(s => s.userId !== userId);
    return (
      <div>
        {friendsStocks.map(stock => (
          <StockCard key={stock.userId + stock.symbol} stock={stock} quote={quotes[stock.symbol]} />
        ))}
        {friendsStocks.length === 0 && <p style={{ padding: '16px' }}>친구들의 추천 종목이 없습니다.</p>}
      </div>
    );
  };

  const renderHistory = () => (
    <div>
      {history.map(stock => (
        <StockCard key={stock.sourceActiveStockId + stock.closedAt.seconds.toString()} stock={stock} isHistory />
      ))}
      {history.length === 0 && <p style={{ padding: '16px' }}>종료된 추천 기록이 없습니다.</p>}
    </div>
  );

  return (
    <div>
      <header className="app-header">
        <h1>StockPick</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '14px', fontWeight: 600 }}>{name}</span>
          <button className="logout-btn" onClick={logout}>변경</button>
        </div>
      </header>
      
      <div className="tabs">
        <button className={`tab-btn \${tab === 'ranking' ? 'active' : ''}`} onClick={() => setTab('ranking')}>랭킹</button>
        <button className={`tab-btn \${tab === 'my' ? 'active' : ''}`} onClick={() => setTab('my')}>내 종목</button>
        <button className={`tab-btn \${tab === 'friends' ? 'active' : ''}`} onClick={() => setTab('friends')}>친구들</button>
        <button className={`tab-btn \${tab === 'history' ? 'active' : ''}`} onClick={() => setTab('history')}>기록</button>
      </div>

      <main style={{ paddingBottom: '40px' }}>
        {tab === 'ranking' && renderRanking()}
        {tab === 'my' && renderMyStocks()}
        {tab === 'friends' && renderFriendsStocks()}
        {tab === 'history' && renderHistory()}
        
        <div style={{ padding: '16px', marginTop: '24px', fontSize: '12px', color: 'var(--color-text-secondary)', background: 'var(--color-bg-primary)' }}>
          안내: 수익률은 단순 가격 변동률이며 배당, 환율, 세금, 수수료 및 기업행사를 반영하지 않습니다. 비공식 API를 사용하므로 정보의 정확성을 보장할 수 없습니다.
        </div>
      </main>

      {isAddModalOpen && <AddStockModal onClose={() => setIsAddModalOpen(false)} />}
      {selectedStockToClose && (
        <CloseStockConfirm 
          stock={selectedStockToClose} 
          currentPrice={quotes[selectedStockToClose.symbol]?.price}
          onClose={() => setSelectedStockToClose(null)} 
        />
      )}
    </div>
  );
};
