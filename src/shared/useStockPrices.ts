import { useState, useEffect, useRef } from 'react';
import { fetchBatchQuotes } from './marketApi';
import type { StockQuote } from '../stock/model';

export function useStockPrices(symbols: string[]) {
  const [quotes, setQuotes] = useState<Record<string, StockQuote>>({});
  const [error, setError] = useState<Error | null>(null);
  const loading = false;
  
  // Deduplicate and filter out empty
  const uniqueSymbols = Array.from(new Set(symbols)).filter(Boolean);
  const symbolsKey = uniqueSymbols.sort().join(',');
  const isFetchingRef = useRef(false);

  useEffect(() => {
    if (uniqueSymbols.length === 0) return;
    
    let isMounted = true;
    
    const fetchPrices = async () => {
      if (document.hidden) return; // 탭 숨겨지면 중지
      if (isFetchingRef.current) return; // 이전 요청 중이면 중지
      
      try {
        isFetchingRef.current = true;
        const newQuotes = await fetchBatchQuotes(uniqueSymbols, false);
        if (!isMounted) return;
        
        setQuotes(prev => {
          const next = { ...prev };
          newQuotes.forEach(q => {
            next[q.symbol] = q;
          });
          return next;
        });
        setError(null);
      } catch (err) {
        if (isMounted) setError(err as Error);
      } finally {
        isFetchingRef.current = false;
      }
    };

    // 진입 즉시 한 번 호출
    fetchPrices();
    
    // 60초 주기 (탭 다시 보일 때 즉시 갱신을 위해 visibilitychange 이벤트 추가)
    const interval = setInterval(fetchPrices, 60000);
    
    const onVisibilityChange = () => {
      if (!document.hidden) {
        fetchPrices();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      isMounted = false;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [symbolsKey]);

  return { quotes, loading, error };
}
