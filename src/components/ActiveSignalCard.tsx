import React from 'react';
import { ArrowUpRight, ArrowDownRight, Clock, SlidersHorizontal } from 'lucide-react';
import { SignalItem, SignalResult } from '../types';
import { standardizePairName } from '../utils/formatter';
import emblemImage from '../assets/images/hassone_trading_logo_1791569318604.jpg';

interface ActiveSignalCardProps {
  currentSignal: SignalItem | null;
  countdownText: string;
  isTradeActive: boolean;
  onMarkResult: (id: string, result: SignalResult) => void;
  totalSignals: number;
  remainingSignals: number;
  onNavigateToGenerator: () => void;
  lastSessionStats: { total: number; wins: number; winRate: number } | null;
}

export const ActiveSignalCard: React.FC<ActiveSignalCardProps> = ({
  currentSignal,
  countdownText,
  isTradeActive,
  onMarkResult,
  totalSignals,
  remainingSignals,
  onNavigateToGenerator,
  lastSessionStats,
}) => {
  // Empty State
  if (!currentSignal) {
    return (
      <div className="card-surface p-5 sm:p-7 text-center space-y-4 relative overflow-hidden" dir="rtl">
        {/* Emblem Presentation */}
        <div className="relative mx-auto w-fit">
          <div className="absolute inset-0 rounded-2xl bg-[var(--gold-primary)]/15 blur-lg -z-10 scale-110" />
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border border-[var(--gold-border)] bg-[var(--bg-canvas)] shadow-xl ring-1 ring-[var(--gold-primary)]/40 transition-transform duration-300 hover:scale-105">
            <img
              src={emblemImage}
              alt="حسون - Trading"
              className="w-full h-full object-cover rounded-2xl"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>

        {/* Text underneath the logo */}
        <div className="space-y-1 text-center">
          <h2 className="text-base sm:text-lg font-black text-[var(--text-primary)] tracking-wide">
            حسون - Trading
          </h2>
          <p className="text-[10px] sm:text-[11px] font-bold text-[var(--gold-primary)] tracking-widest font-mono uppercase" dir="ltr">
            VIP ALGORITHMIC PLATFORM
          </p>
        </div>

        {lastSessionStats && lastSessionStats.total > 0 && (
          <div className="p-3.5 rounded-[var(--radius-md)] bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-xs flex items-center justify-around">
            <div>
              <span className="text-[10px] text-[var(--text-muted)] block mb-0.5">صفقات الجلسة</span>
              <span className="font-mono font-bold text-[var(--text-primary)] text-sm">{lastSessionStats.total}</span>
            </div>
            <div className="w-[1px] h-6 bg-[var(--border-subtle)]" />
            <div>
              <span className="text-[10px] text-[var(--success)] block mb-0.5">رابحة</span>
              <span className="font-mono font-bold text-[var(--success)] text-sm">{lastSessionStats.wins}</span>
            </div>
            <div className="w-[1px] h-6 bg-[var(--border-subtle)]" />
            <div>
              <span className="text-[10px] text-[var(--gold-primary)] block mb-0.5">نسبة النجاح</span>
              <span className="font-mono font-bold text-[var(--text-primary)] text-sm">{lastSessionStats.winRate}%</span>
            </div>
          </div>
        )}

        <div className="pt-1">
          <button
            onClick={onNavigateToGenerator}
            className="btn-primary w-full py-3 px-4 text-xs sm:text-sm"
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>إنشاء جدول صفقات حسون - Trading</span>
          </button>
        </div>
      </div>
    );
  }

  const isCall = currentSignal.direction === 'CALL';
  const displayPair = standardizePairName(currentSignal.pair);

  return (
    <div
      dir="rtl"
      className={`card-surface p-4 sm:p-5 transition-all duration-300 relative overflow-hidden ${
        isTradeActive
          ? isCall
            ? 'border-[var(--success)] shadow-[0_0_24px_rgba(66,214,164,0.18)]'
            : 'border-[var(--danger)] shadow-[0_0_24px_rgba(251,113,133,0.18)]'
          : ''
      }`}
    >
      {/* Top Status Header */}
      <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2.5 mb-3">
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2.5 w-2.5">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                isTradeActive ? (isCall ? 'bg-[var(--success)]' : 'bg-[var(--danger)]') : 'bg-[var(--gold-primary)]'
              }`}
            />
            <span
              className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                isTradeActive ? (isCall ? 'bg-[var(--success)]' : 'bg-[var(--danger)]') : 'bg-[var(--gold-primary)]'
              }`}
            />
          </span>
          <span className="text-[11px] sm:text-xs font-bold text-[var(--gold-primary)]">
            {isTradeActive ? 'الصفقة جارية الآن على الشمعة' : 'انتظار توقيت الدخول'}
          </span>
        </div>

        <div className="flex items-center gap-1 text-[10.5px] sm:text-[11px] text-[var(--text-secondary)] font-mono">
          <span>متبقي:</span>
          <span className="font-bold text-[var(--text-primary)]">{remainingSignals}</span>
          <span>من {totalSignals}</span>
        </div>
      </div>

      {/* Hero Direction Area */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 items-center">
        {/* Right: Direction indicator */}
        <div
          className={`p-2.5 sm:p-3 rounded-[var(--radius-md)] border flex items-center justify-center gap-2 sm:gap-2.5 ${
            isCall
              ? 'bg-[var(--success-soft)] border-[rgba(66,214,164,0.3)] text-[var(--success)]'
              : 'bg-[var(--danger-soft)] border-[rgba(251,113,133,0.3)] text-[var(--danger)]'
          }`}
        >
          {isCall ? (
            <ArrowUpRight className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.5]" />
          ) : (
            <ArrowDownRight className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.5]" />
          )}
          <div className="text-right">
            <div className="text-xs sm:text-sm font-bold tracking-wide">
              {isCall ? 'شراء CALL' : 'بيع PUT'}
            </div>
            <div className="text-[9.5px] sm:text-[10px] opacity-85 font-mono">
              {currentSignal.timeframe} • {currentSignal.martingale}
            </div>
          </div>
        </div>

        {/* Left: Pair and Time */}
        <div className="text-right bg-[var(--bg-input)] border border-[var(--border-subtle)] p-2.5 rounded-[var(--radius-md)]">
          <div className="text-[9.5px] sm:text-[10px] text-[var(--text-muted)] font-medium">الزوج المستهدف:</div>
          <div className="font-mono font-bold text-xs sm:text-sm text-[var(--text-primary)] tracking-wider" dir="ltr">
            {displayPair}
          </div>
          <div className="text-[10.5px] sm:text-[11px] text-[var(--gold-primary)] font-mono mt-0.5 flex items-center gap-1 justify-end">
            <Clock className="w-3 h-3 text-[var(--gold-primary)]" />
            <span>وقت الدخول: {currentSignal.timeStr}</span>
          </div>
        </div>
      </div>

      {/* Big Countdown Timer */}
      <div className="mt-3 p-3 rounded-[var(--radius-md)] bg-[var(--bg-input)] border border-[var(--border-subtle)] text-center">
        <div className="text-[10px] text-[var(--text-muted)] mb-0.5">
          {isTradeActive ? 'الوقت المتبقي لانتهاء شمعة الصفقة:' : 'العد التنازلي للحظة الدخول:'}
        </div>
        <div
          className={`font-mono text-2xl sm:text-3xl font-bold tracking-widest tabular-nums ${
            isTradeActive
              ? isCall
                ? 'text-[var(--success)]'
                : 'text-[var(--danger)]'
              : 'text-[var(--gold-primary)]'
          }`}
        >
          {countdownText}
        </div>
      </div>

      {/* Manual Result Grading Buttons */}
      <div className="mt-3 pt-2.5 border-t border-[var(--border-subtle)] space-y-1.5">
        <div className="text-[10px] text-[var(--text-muted)] text-right font-medium">
          تسجيل نتيجة الصفقة يدوياً:
        </div>
        <div className="grid grid-cols-4 gap-1 sm:gap-1.5">
          <button
            onClick={() => onMarkResult(currentSignal.id, 'win_direct')}
            className={`py-2 px-1 rounded-[var(--radius-sm)] text-[10.5px] sm:text-xs font-bold transition-all cursor-pointer ${
              currentSignal.result === 'win_direct'
                ? 'bg-[var(--success)] text-[var(--text-on-gold)]'
                : 'bg-[var(--success-soft)] text-[var(--success)] border border-[rgba(66,214,164,0.25)] hover:bg-[var(--bg-hover)]'
            }`}
          >
            ربح مباشر
          </button>
          <button
            onClick={() => onMarkResult(currentSignal.id, 'win_mtg1')}
            className={`py-2 px-1 rounded-[var(--radius-sm)] text-[10.5px] sm:text-xs font-bold transition-all cursor-pointer ${
              currentSignal.result === 'win_mtg1'
                ? 'bg-[var(--success)] text-[var(--text-on-gold)]'
                : 'bg-[var(--success-soft)] text-[var(--success)] border border-[rgba(66,214,164,0.25)] hover:bg-[var(--bg-hover)]'
            }`}
          >
            ربح MTG 1
          </button>
          <button
            onClick={() => onMarkResult(currentSignal.id, 'win_mtg2')}
            className={`py-2 px-1 rounded-[var(--radius-sm)] text-[10.5px] sm:text-xs font-bold transition-all cursor-pointer ${
              currentSignal.result === 'win_mtg2'
                ? 'bg-[var(--success)] text-[var(--text-on-gold)]'
                : 'bg-[var(--success-soft)] text-[var(--success)] border border-[rgba(66,214,164,0.25)] hover:bg-[var(--bg-hover)]'
            }`}
          >
            ربح MTG 2
          </button>
          <button
            onClick={() => onMarkResult(currentSignal.id, 'loss')}
            className={`py-2 px-1 rounded-[var(--radius-sm)] text-[10.5px] sm:text-xs font-bold transition-all cursor-pointer ${
              currentSignal.result === 'loss'
                ? 'bg-[var(--danger)] text-white'
                : 'bg-[var(--danger-soft)] text-[var(--danger)] border border-[rgba(251,113,133,0.25)] hover:bg-[var(--bg-hover)]'
            }`}
          >
            خسارة
          </button>
        </div>
      </div>
    </div>
  );
};
