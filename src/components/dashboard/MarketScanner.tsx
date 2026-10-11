// src/components/dashboard/MarketScanner.tsx
// Real-time Market Scanner widget for Hasone Trading

import React, { useEffect, useState } from 'react';
import { useMarketStore } from '../../stores/marketStore';
import { MarketScannerItem } from '../../../shared/types';
import { Activity, Flame, ArrowUpRight, ArrowDownRight, RefreshCw, Zap } from 'lucide-react';

export const MarketScanner: React.FC = () => {
  const { activePair, setActivePair } = useMarketStore();
  const [items, setItems] = useState<MarketScannerItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchScanner = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/v2/pairs/scanner');
      const data = await res.json();
      if (data.success && data.scanner) {
        setItems(data.scanner);
      }
    } catch (err) {
      console.error('Failed to load scanner', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchScanner();
    const interval = setInterval(fetchScanner, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-[#0e121b]/90 border border-slate-800/80 rounded-2xl p-4 shadow-xl backdrop-blur-md">
      <div className="flex items-center justify-between mb-3 border-b border-slate-800/60 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Activity className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-100 flex items-center gap-1.5">
              الماسح اللحظي للفرص
              <span className="text-[10px] bg-amber-500/15 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/30">
                LIVE SCAN
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">ترتيب الأزواج حسب العائد وقوة الإشارة الحية</p>
          </div>
        </div>

        <button
          onClick={fetchScanner}
          disabled={isLoading}
          className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
          title="تحديث الماسح"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
        {items.map((item) => {
          const isSelected = activePair === item.pair.name;
          const isCall = item.signal === 'CALL';
          const isPut = item.signal === 'PUT';

          return (
            <div
              key={item.pair.id}
              onClick={() => setActivePair(item.pair.name)}
              className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                isSelected
                  ? 'bg-amber-500/10 border-amber-500/40 shadow-lg shadow-amber-500/5'
                  : 'bg-slate-900/40 border-slate-800/60 hover:bg-slate-800/40 hover:border-slate-700/60'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                    isCall
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : isPut
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}
                >
                  {isCall ? (
                    <ArrowUpRight className="w-4 h-4" />
                  ) : isPut ? (
                    <ArrowDownRight className="w-4 h-4" />
                  ) : (
                    <Zap className="w-3.5 h-3.5" />
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs text-slate-100">{item.pair.name}</span>
                    {item.payout >= 90 && (
                      <Flame className="w-3 h-3 text-amber-400 animate-bounce" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                    <span>{item.currentPrice.toFixed(item.pair.decimalPlaces)}</span>
                    <span className={item.change24h >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                      {item.change24h >= 0 ? '+' : ''}{item.change24h}%
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 text-right">
                <div>
                  <div className="text-[11px] font-bold font-mono text-emerald-400">
                    +{item.payout}%
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    RSI {item.rsi}
                  </div>
                </div>

                <div
                  className={`px-2 py-1 rounded text-[11px] font-bold border ${
                    isCall
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : isPut
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  {isCall ? 'شراء' : isPut ? 'بيع' : 'ترقب'} {item.confidence}%
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MarketScanner;
