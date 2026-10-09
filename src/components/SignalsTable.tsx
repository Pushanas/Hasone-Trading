import React, { useState } from 'react';
import { ArrowUpRight, ArrowDownRight, Copy, Check, Trash2 } from 'lucide-react';
import { SignalItem, SignalResult } from '../types';

interface SignalsTableProps {
  signals: SignalItem[];
  onMarkResult: (id: string, result: SignalResult) => void;
  onResetSignals: () => void;
  onCopySingleSignal: (signal: SignalItem) => void;
  copiedId?: string | null;
}

export const SignalsTable: React.FC<SignalsTableProps> = ({
  signals,
  onMarkResult,
  onResetSignals,
  onCopySingleSignal,
  copiedId: externalCopiedId,
}) => {
  const [localCopiedId, setLocalCopiedId] = useState<string | null>(null);
  const copiedId = externalCopiedId !== undefined ? externalCopiedId : localCopiedId;
  const [filter, setFilter] = useState<'all' | 'pending' | 'wins' | 'losses'>('all');

  const handleCopy = (signal: SignalItem) => {
    onCopySingleSignal(signal);
    setLocalCopiedId(signal.id);
    setTimeout(() => setLocalCopiedId(null), 1500);
  };

  const winsCount = signals.filter(
    (s) => s.result === 'win_direct' || s.result === 'win_mtg1' || s.result === 'win_mtg2'
  ).length;
  const lossCount = signals.filter((s) => s.result === 'loss').length;
  const gradedCount = winsCount + lossCount;
  const winRate = gradedCount > 0 ? Math.round((winsCount / gradedCount) * 100) : 0;
  const pendingCount = signals.filter((s) => !s.done).length;

  const filteredSignals = signals.filter((s) => {
    if (filter === 'pending') return !s.done;
    if (filter === 'wins') return s.result.startsWith('win');
    if (filter === 'losses') return s.result === 'loss';
    return true;
  });

  return (
    <div className="card-surface p-4 sm:p-5 space-y-4 text-right">
      {/* 4 Quantitative Metric Cards matching Screenshot 3 */}
      <div className="grid grid-cols-4 gap-2">
        <div className="bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-2xl p-2.5 text-center">
          <div className="text-[10px] text-[var(--text-muted)] font-bold">الإجمالي</div>
          <div className="text-base font-black font-mono text-[var(--gold-primary)] mt-0.5">{signals.length}</div>
        </div>

        <div className="bg-[var(--bg-input)] border border-[rgba(25,201,149,0.3)] rounded-2xl p-2.5 text-center">
          <div className="text-[10px] text-[var(--success)] font-bold">الرابحة</div>
          <div className="text-base font-black font-mono text-[var(--success)] mt-0.5">{winsCount}</div>
        </div>

        <div className="bg-[var(--bg-input)] border border-[rgba(255,92,108,0.3)] rounded-2xl p-2.5 text-center">
          <div className="text-[10px] text-[var(--danger)] font-bold">الخاسرة</div>
          <div className="text-base font-black font-mono text-[var(--danger)] mt-0.5">{lossCount}</div>
        </div>

        <div className="bg-[var(--bg-input)] border border-[var(--gold-border)] rounded-2xl p-2.5 text-center">
          <div className="text-[10px] text-[var(--gold-primary)] font-bold">النسبة</div>
          <div className="text-base font-black font-mono text-[var(--text-primary)] mt-0.5">
            {gradedCount > 0 ? `${winRate}%` : '—'}
          </div>
        </div>
      </div>

      {/* Filter Tabs matching Screenshot 3 */}
      <div className="flex items-center justify-between border-t border-[var(--border-subtle)] pt-3">
        {signals.length > 0 && (
          <button
            onClick={onResetSignals}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--danger)] hover:bg-[var(--danger-soft)] transition-colors cursor-pointer text-xs flex items-center gap-1"
            title="مسح جدول الصفقات"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="text-[10px]">مسح</span>
          </button>
        )}

        <div className="flex items-center gap-1.5 text-xs mr-auto">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filter === 'all'
                ? 'bg-[var(--gold-primary)] text-[var(--text-on-gold)] shadow-xs'
                : 'bg-[var(--bg-input)] text-[var(--text-secondary)] border border-[var(--border-subtle)] hover:text-[var(--text-primary)]'
            }`}
          >
            الكل ({signals.length})
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filter === 'pending'
                ? 'bg-[var(--gold-primary)] text-[var(--text-on-gold)] shadow-xs'
                : 'bg-[var(--bg-input)] text-[var(--text-secondary)] border border-[var(--border-subtle)] hover:text-[var(--text-primary)]'
            }`}
          >
            المتبقية ({pendingCount})
          </button>
          <button
            onClick={() => setFilter('wins')}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filter === 'wins'
                ? 'bg-[var(--gold-primary)] text-[var(--text-on-gold)] shadow-xs'
                : 'bg-[var(--bg-input)] text-[var(--text-secondary)] border border-[var(--border-subtle)] hover:text-[var(--text-primary)]'
            }`}
          >
            الرابحة ({winsCount})
          </button>
        </div>
      </div>

      {/* Signals List / Empty State matching Screenshot 3 */}
      {signals.length === 0 ? (
        <div className="py-12 px-4 text-center space-y-2">
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed max-w-sm mx-auto">
            لم يتم إنشاء جدول بعد. انتقل إلى تبويب &quot;المولّد&quot; واضغط على &quot;إنشاء جدول الصفقات&quot;.
          </p>
        </div>
      ) : filteredSignals.length === 0 ? (
        <div className="py-8 text-center text-xs text-[var(--text-muted)]">
          لا توجد صفقات تطابق الفلتر المحدد حالياً.
        </div>
      ) : (
        <div className="space-y-2 max-h-[460px] overflow-y-auto pt-1">
          {filteredSignals.map((item) => {
            const isCall = item.direction === 'CALL';
            const isCopied = copiedId === item.id;

            return (
              <div
                key={item.id}
                className={`p-2.5 rounded-2xl border transition-all text-xs flex items-center justify-between backdrop-blur-sm ${
                  item.done
                    ? 'bg-[var(--bg-base)] border-[var(--border-subtle)] opacity-75'
                    : 'bg-[var(--bg-surface-subtle)] border-[var(--border-subtle)]'
                }`}
              >
                {/* Actions: Grading buttons & copy */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => onMarkResult(item.id, 'win_direct')}
                    title="ربح مباشر"
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                      item.result.startsWith('win')
                        ? 'bg-[var(--success)] text-[var(--text-on-gold)] shadow-xs'
                        : 'bg-[var(--success-soft)] text-[var(--success)] border border-[rgba(25,201,149,0.3)] hover:bg-[var(--bg-hover)]'
                    }`}
                  >
                    ربح
                  </button>

                  <button
                    onClick={() => onMarkResult(item.id, 'loss')}
                    title="خسارة"
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                      item.result === 'loss'
                        ? 'bg-[var(--danger)] text-white shadow-xs'
                        : 'bg-[var(--danger-soft)] text-[var(--danger)] border border-[rgba(255,92,108,0.3)] hover:bg-[var(--bg-hover)]'
                    }`}
                  >
                    خسارة
                  </button>

                  <button
                    onClick={() => handleCopy(item)}
                    className="p-1.5 text-xs text-[var(--gold-primary)] bg-[var(--bg-input)] border border-[var(--border-subtle)] hover:border-[var(--gold-border)] rounded-xl transition-colors cursor-pointer"
                    title="نسخ صيغة الصفقة"
                  >
                    {isCopied ? (
                      <Check className="w-3.5 h-3.5 text-[var(--success)]" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                {/* Right: Direction icon & Signal details */}
                <div className="flex items-center gap-2.5 min-w-0 text-right">
                  <div className="min-w-0">
                    <div className="font-mono text-xs font-bold text-[var(--text-primary)] tracking-tight flex items-center justify-end gap-1.5">
                      <span className="text-[11px] text-[var(--gold-primary)] font-mono">
                        {item.timeStr}
                      </span>
                      <span className="text-[var(--text-muted)]">•</span>
                      <span className="px-1.5 py-0.5 rounded-md bg-[var(--bg-input)] border border-[var(--border-subtle)] text-[var(--text-primary)] font-mono font-bold text-[11px]" dir="ltr">
                        <bdi>{item.pair}</bdi>
                      </span>
                    </div>

                    <div className="text-[10px] text-[var(--text-muted)] flex items-center justify-end gap-1.5 mt-0.5">
                      <span>{item.martingale}</span>
                      <span>·</span>
                      <span className={`font-bold ${isCall ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
                        {isCall ? 'CALL صعود' : 'PUT هبوط'}
                      </span>
                    </div>
                  </div>

                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                      isCall
                        ? 'bg-[var(--success-soft)] text-[var(--success)] border border-[rgba(25,201,149,0.3)]'
                        : 'bg-[var(--danger-soft)] text-[var(--danger)] border border-[rgba(255,92,108,0.3)]'
                    }`}
                  >
                    {isCall ? (
                      <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
                    ) : (
                      <ArrowDownRight className="w-4 h-4 stroke-[2.5]" />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
