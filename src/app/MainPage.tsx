import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { AuthScreen, FRIENDS } from '../auth/AuthScreen';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../shared/firebase';
import type { ActiveStock, StockHistory } from '../stock/model';
import { StockCard } from '../stock/ui/StockCard';
import { AddStockModal } from '../stock/ui/AddStockModal';
import { CloseStockConfirm } from '../stock/ui/CloseStockConfirm';
import { useStockPrices } from '../shared/useStockPrices';
import './styles.css';
import { calculateReturnRate } from '../stock/logic';

const FRIEND_TAB_ORDER = ['jaeyoung', 'hyunsik', 'haeuk', 'byeonghun', 'jaehyung', 'taesu', 'junhyun'];

export const MainPage: React.FC = () => {
  const { userId, name, logout } = useAuth();
  
  const [activeStocks, setActiveStocks] = useState<ActiveStock[]>([]);
  const [history, setHistory] = useState<StockHistory[]>([]);
  const [tab, setTab] = useState<'ranking'|'my'|'friends'|'history'>('ranking');
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [loginPurpose, setLoginPurpose] = useState<'login' | 'add' | null>(null);
  const [selectedStockToClose, setSelectedStockToClose] = useState<ActiveStock | null>(null);

  useEffect(() => {
    const unsubs = [
      onSnapshot(collection(db, 'activeStocks'), (snap) => {
        const data = snap.docs.map(doc => doc.data() as ActiveStock);
        setActiveStocks(data);
      }),
      onSnapshot(query(collection(db, 'stockHistory'), orderBy('closedAt', 'desc')), (snap) => {
        const data = snap.docs.map(doc => doc.data() as StockHistory);
        setHistory(data);
      })
    ];

    return () => unsubs.forEach(unsub => unsub());
  }, []);

  const activeSymbols = Array.from(new Set(activeStocks.map(s => s.symbol)));
  const { quotes, error: priceError } = useStockPrices(activeSymbols);
  const ownerName = (userId: string) => FRIENDS.find(user => user.id === userId)?.name || userId;

  const startAddingStock = () => {
    if (userId) setIsAddModalOpen(true);
    else setLoginPurpose('add');
  };

  const stockRankings = activeStocks.flatMap(stock => {
    const quote = quotes[stock.symbol];
    if (!quote || quote.price <= 0) return [];
    return [{ stock, returnRate: calculateReturnRate(stock.buyPrice, quote.price) }];
  })
    .sort((a, b) => {
      if (b.returnRate !== a.returnRate) return b.returnRate - a.returnRate;
      return a.stock.addedAt.toMillis() - b.stock.addedAt.toMillis();
    });

  const renderRanking = () => (
    <div>
      <h2 style={{ padding: '16px 16px 0' }}>진행 중인 랭킹</h2>
      {stockRankings.map(({ stock, returnRate }, i) => (
        <div key={stock.userId + stock.symbol} style={{ padding: '16px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ margin: '0 0 4px' }}>{i + 1}위 · {quotes[stock.symbol]?.name || stock.name}</h3>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-text-secondary)' }}>
              {stock.symbol} · {ownerName(stock.userId)}의 추천
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <h4 style={{ margin: '0 0 4px', color: returnRate > 0 ? 'var(--color-success)' : returnRate < 0 ? 'var(--color-danger)' : 'var(--color-text-secondary)' }}>
              {returnRate > 0 ? '+' : ''}{returnRate.toFixed(2)}%
            </h4>
          </div>
        </div>
      ))}
      {stockRankings.length === 0 && <p style={{ padding: '16px', color: 'var(--color-text-secondary)' }}>아직 진행 중인 추천이 없습니다.</p>}
    </div>
  );

  const renderMyStocks = () => {
    const myStocks = activeStocks.filter(s => s.userId === userId);
    return (
      <div>
        <div style={{ padding: '16px' }}>
          <p style={{ margin: '0 0 16px', color: 'var(--color-text-secondary)' }}>내 추천 종목 ({myStocks.length}/5)</p>
          <button className="btn-primary" style={{ marginTop: 0 }} onClick={startAddingStock} disabled={myStocks.length >= 5}>
            새 종목 추천하기
          </button>
        </div>
        <div>
          {myStocks.map(stock => (
            <StockCard 
              key={stock.symbol} 
              stock={stock} 
              ownerName={ownerName(stock.userId)}
              quote={quotes[stock.symbol]} 
              onClick={() => setSelectedStockToClose(stock)}
            />
          ))}
        </div>
      </div>
    );
  };

  const renderFriendsStocks = () => {
    const friendIds = FRIEND_TAB_ORDER.filter(friendId => friendId !== userId);
    const activeFriendId = selectedFriendId && friendIds.includes(selectedFriendId) ? selectedFriendId : friendIds[0];
    const friendStocks = activeStocks.filter(stock => stock.userId === activeFriendId);
    return (
      <div className="friend-list">
        <div className="friend-tabs">
          {friendIds.map(friendId => (
            <button
              className={friendId === activeFriendId ? 'active' : ''}
              key={friendId}
              onClick={() => setSelectedFriendId(friendId)}
            >
              {ownerName(friendId)}
            </button>
          ))}
        </div>
        {activeFriendId && friendStocks.map(stock => (
          <StockCard key={stock.userId + stock.symbol} stock={stock} ownerName={ownerName(stock.userId)} quote={quotes[stock.symbol]} />
        ))}
        {activeFriendId && friendStocks.length === 0 && <p className="empty-message">{ownerName(activeFriendId)}님의 추천 종목이 없습니다.</p>}
        {friendIds.length === 0 && <p className="empty-message">등록된 친구가 없습니다.</p>}
      </div>
    );
  };

  const renderHistory = () => (
    <div>
      {history.map(stock => (
        <StockCard key={stock.sourceActiveStockId + stock.closedAt.seconds.toString()} stock={stock} ownerName={ownerName(stock.userId)} isHistory />
      ))}
      {history.length === 0 && <p style={{ padding: '16px' }}>종료된 추천 기록이 없습니다.</p>}
    </div>
  );

  return (
    <div>
      <header className="app-header">
        <h1>워렌 버핏의 어린 시절 투자일기</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '14px', fontWeight: 600 }}>{name || '둘러보는 중'}</span>
          {userId
            ? <button className="logout-btn" onClick={logout}>변경</button>
            : <button className="logout-btn" onClick={() => setLoginPurpose('login')}>로그인</button>}
        </div>
      </header>
      
      <div className="tabs">
        <button className={`tab-btn ${tab === 'ranking' ? 'active' : ''}`} onClick={() => setTab('ranking')}>랭킹</button>
        <button className={`tab-btn ${tab === 'my' ? 'active' : ''}`} onClick={() => setTab('my')}>내 종목</button>
        <button className={`tab-btn ${tab === 'friends' ? 'active' : ''}`} onClick={() => setTab('friends')}>친구들</button>
        <button className={`tab-btn ${tab === 'history' ? 'active' : ''}`} onClick={() => setTab('history')}>기록</button>
      </div>

      <main style={{ paddingBottom: '40px' }}>
        {priceError && (
          <p className="price-warning">시세 갱신에 실패해 마지막으로 받은 가격을 표시하고 있습니다.</p>
        )}
        {tab === 'ranking' && renderRanking()}
        {tab === 'my' && renderMyStocks()}
        {tab === 'friends' && renderFriendsStocks()}
        {tab === 'history' && renderHistory()}
        
        <div style={{ padding: '16px', marginTop: '24px', fontSize: '12px', color: 'var(--color-text-secondary)', background: 'var(--color-bg-primary)' }}>
          안내: 수익률은 단순 가격 변동률이며 배당, 환율, 세금, 수수료 및 기업행사를 반영하지 않습니다. 비공식 API를 사용하므로 정보의 정확성을 보장할 수 없습니다.
        </div>
      </main>

      {isAddModalOpen && <AddStockModal onClose={() => setIsAddModalOpen(false)} />}
      {loginPurpose && (
        <div className="modal-overlay" onClick={() => setLoginPurpose(null)}>
          <div className="modal-content login-modal" onClick={event => event.stopPropagation()}>
            <AuthScreen onSelected={() => {
              if (loginPurpose === 'add') setIsAddModalOpen(true);
              setLoginPurpose(null);
            }} />
          </div>
        </div>
      )}
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
