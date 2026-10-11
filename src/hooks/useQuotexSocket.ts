// src/hooks/useQuotexSocket.ts
// React Hook for Streaming Live Market Rates into Zustand

import { useEffect } from 'react';
import { useMarketStore } from '../stores/marketStore';

export function useQuotexSocket() {
  const { setLiveRates, updateSingleRate, setIsSocketConnected } = useMarketStore();

  useEffect(() => {
    let isMounted = true;
    let timer: NodeJS.Timeout;

    const fetchLiveRates = async () => {
      try {
        const res = await fetch('/api/quotex/live-rates');
        if (!res.ok) throw new Error('Live rates fetch failed');
        const data = await res.json();
        if (isMounted && data.rates) {
          setLiveRates(data.rates);
          setIsSocketConnected(true);
        }
      } catch (err) {
        if (isMounted) {
          setIsSocketConnected(false);
        }
      }
    };

    // Initial fetch
    fetchLiveRates();

    // Poll every 1.5 seconds for fresh ticks
    timer = setInterval(fetchLiveRates, 1500);

    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, [setLiveRates, setIsSocketConnected]);
}

export default useQuotexSocket;
