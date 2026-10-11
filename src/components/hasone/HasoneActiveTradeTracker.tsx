// src/components/hasone/HasoneActiveTradeTracker.tsx
// Active Trade Monitor with Live Expiry Countdown & Instant Settle Controls

import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle2, XCircle, MinusCircle, Zap, Shield, AlertCircle } from 'lucide-react';
import { RecordedTrade } from '../../utils/hasoneTracker';

interface HasoneActiveTradeTrackerProps {
  activeTrade: RecordedTrade | null;
  livePrice?: number | null;
  onSettleTrade: (tradeId: string, currentPrice: number, manualResult?: 'WIN' | 'LOSS' | 'DRAW') => void;
}

export const HasoneActiveTradeTracker: React.FC<HasoneActiveTradeTrackerProps> = ({
  activeTrade,
  livePrice,
  onSettleTrade,
}) => {
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);

  useEffect(() => {
    if (!activeTrade || activeTrade.result !== 'PENDING') {
      setRemainingSeconds(0);
      return;
    }

    const updateCountdown = () => {
      const now = Date.now();
      const diff = Math.max(0, Math.floor((activeTrade.expiryTimestamp - now) / 1000));
      setRemainingSeconds(diff);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [activeTrade]);

  if (!activeTrade || activeTrade.result !== 'PENDING') {
    return (
      <div className="card-surface p-8 rounded-3xl border border-[var(--border-subtle)] text-center space-y-2 text-xs" dir="rtl">
        <div className="w-12 h-12 rounded-2xl bg-[var(--bg-input)] border border-[var(--border-subtle)] flex items-center justify-center mx-auto text-[var(--gold-primary)]">
          <Clock className="w-6 h-6" />
        </div>
        <h4 className="font-black text-sm text-[var(--text-primary)]">لا توجد صفقات جارية حالياً</h4>
        <p className="text-[var(--text-secondary)] max-w-sm mx-auto">
          عند تنفيذ تحليل يدوي على أي زوج، يمكنك متابعة توقيت الشمعة وسعر الخروج لحظياً من هذا القسم.
        </p>
      </div>
    );
  }

  const currentMarketPrice = livePrice || activeTrade.entryPrice;
  const priceDiff = currentMarketPrice - activeTrade.entryPrice;
  const isWinning =
    activeTrade.signalType === 'CALL' ? priceDiff > 0.000001 : priceDiff < -0.000001;

  const mm = String(Math.floor(remainingSeconds / 60)).padStart(2, '0');
  const ss = String(remainingSeconds % 60).padStart(2, '0');

  return (
    <div
      dir="rtl"
      className="card-surface p-4 sm:p-6 rounded-3xl border border-[var(--gold-border)] space-y-4 shadow-xl"
    >
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--border-subtle)] pb-3">
        <div className="flex items-center gap-2.5">
          <span className="w-3 h-3 rounded-full bg-cyan-400 animate-ping" />
          <h4 className="font-black text-sm text-[var(--text-primary)]">
            صفقة نشطة قيد التتبع ({activeTrade.pairSymbol})
          </h4>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
            {activeTrade.isPaper ? 'وضع تجريبي' : 'وضع حقيقي'}
          </span>
        </div>

        {/* Live Timer Countdown */}
        <div className="flex items-center gap-2 font-mono">
          <span className="text-xs text-[var(--text-muted)]">الوقت المتبقي حتى الانتهاء:</span>
          <span className="px-3 py-1 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-base font-black">
            {mm}:{ss}
          </span>
        </div>
      </div>

      {/* Trade Details Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-mono">
        <div className="p-3 rounded-2xl bg-[var(--bg-input)]">
          <span className="text-[10px] text-[var(--text-muted)] block">الاتجاه المطلوب</span>
          <span
            className={`font-black text-sm block mt-1 ${
              activeTrade.signalType === 'CALL' ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {activeTrade.signalType === 'CALL' ? 'CALL صعود' : 'PUT هبوط'}
          </span>
        </div>

        <div className="p-3 rounded-2xl bg-[var(--bg-input)]">
          <span className="text-[10px] text-[var(--text-muted)] block">سعر الدخول</span>
          <span className="font-black text-sm text-white block mt-1">
            {activeTrade.entryPrice}
          </span>
        </div>

        <div className="p-3 rounded-2xl bg-[var(--bg-input)]">
          <span className="text-[10px] text-[var(--text-muted)] block">السعر اللحظي الحالي</span>
          <span className={`font-black text-sm block mt-1 ${isWinning ? 'text-emerald-400' : 'text-rose-400'}`}>
            {currentMarketPrice.toFixed(5)}
          </span>
        </div>

        <div className="p-3 rounded-2xl bg-[var(--bg-input)]">
          <span className="text-[10px] text-[var(--text-muted)] block">حالة الصفقة اللحظية</span>
          <span className={`font-black text-sm block mt-1 ${isWinning ? 'text-emerald-400' : 'text-rose-400'}`}>
            {isWinning ? 'رابحة حالياً (ITM)' : 'خاسرة حالياً (OTM)'}
          </span>
        </div>
      </div>

      {/* Settle Action Buttons */}
      <div className="pt-2 border-t border-[var(--border-subtle)] space-y-2">
        <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
          <span>تسجيل نتيجة الصفقة عند انتهاء الشمعة:</span>
          <button
            onClick={() => onSettleTrade(activeTrade.id, currentMarketPrice)}
            className="text-[var(--gold-primary)] font-bold hover:underline cursor-pointer"
          >
            تسوية تلقائية بناءً على السعر الحالي
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => onSettleTrade(activeTrade.id, currentMarketPrice, 'WIN')}
            className="h-11 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>تسجيل كصفقة رابحة (WIN)</span>
          </button>

          <button
            onClick={() => onSettleTrade(activeTrade.id, currentMarketPrice, 'LOSS')}
            className="h-11 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <XCircle className="w-4 h-4 text-rose-400" />
            <span>تسجيل كصفقة خاسرة (LOSS)</span>
          </button>

          <button
            onClick={() => onSettleTrade(activeTrade.id, currentMarketPrice, 'DRAW')}
            className="h-11 rounded-xl bg-slate-500/20 hover:bg-slate-500/30 border border-slate-500/40 text-slate-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <MinusCircle className="w-4 h-4 text-slate-400" />
            <span>تسجيل تعادل (DRAW)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
