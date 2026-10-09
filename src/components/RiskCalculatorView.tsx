import React, { useState } from 'react';
import { Calculator, DollarSign, Percent, ShieldCheck, TrendingUp, AlertTriangle } from 'lucide-react';

export const RiskCalculatorView: React.FC = () => {
  const [balance, setBalance] = useState<number>(500);
  const [riskPercent, setRiskPercent] = useState<number>(2);
  const [multiplier, setMultiplier] = useState<number>(2.2);
  const [payoutPercent, setPayoutPercent] = useState<number>(85);

  const safeBalance = Math.max(1, balance);
  const baseStake = Math.max(1, Math.round(safeBalance * (riskPercent / 100) * 10) / 10);
  const mtg1Stake = Math.round(baseStake * multiplier * 10) / 10;
  const mtg2Stake = Math.round(mtg1Stake * multiplier * 10) / 10;

  const totalRiskMtg1 = Math.round((baseStake + mtg1Stake) * 10) / 10;
  const totalRiskMtg2 = Math.round((baseStake + mtg1Stake + mtg2Stake) * 10) / 10;

  const exposureMtg1Percent = ((totalRiskMtg1 / safeBalance) * 100).toFixed(1);
  const exposureMtg2Percent = ((totalRiskMtg2 / safeBalance) * 100).toFixed(1);

  const profitBase = Math.round(baseStake * (payoutPercent / 100) * 10) / 10;
  const netProfitMtg1 = Math.round((mtg1Stake * (payoutPercent / 100) - baseStake) * 10) / 10;
  const netProfitMtg2 = Math.round((mtg2Stake * (payoutPercent / 100) - totalRiskMtg1) * 10) / 10;

  return (
    <div className="card-surface p-3.5 sm:p-5 space-y-3.5 sm:space-y-4 text-right" dir="rtl">
      {/* Header matching exact app theme */}
      <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
        <div className="text-right flex-1 pl-2">
          <h2 className="text-xs sm:text-base font-black text-[var(--text-primary)] flex items-center justify-start gap-1.5 flex-wrap">
            <span>حاسبة إدارة رأس المال</span>
            <span className="text-[var(--gold-primary)] font-mono text-[11px] sm:text-xs px-2 py-0.5 rounded-md bg-[var(--bg-input)] border border-[var(--gold-border)]" dir="ltr">
              Money Management
            </span>
          </h2>
          <p className="text-[10px] sm:text-xs text-[var(--text-secondary)] mt-0.5">
            حساب رقمي دقيق لمبالغ الدخول والمضاعفات لحماية وتنمية رصيد الحساب
          </p>
        </div>

        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[var(--bg-input)] border border-[var(--gold-border)] flex items-center justify-center text-[var(--gold-primary)] shrink-0 shadow-xs">
          <Calculator className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--gold-primary)]" />
        </div>
      </div>

      {/* Inputs 2x2 Grid with responsive sizing for all phones */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        <div className="space-y-1">
          <label className="text-[10px] sm:text-[11px] font-bold text-[var(--text-secondary)] block">
            المخاطرة لكل صفقة (%)
          </label>
          <div className="relative">
            <input
              type="number"
              min={0.5}
              max={10}
              step={0.5}
              value={riskPercent}
              onChange={(e) => setRiskPercent(Math.max(0.1, Number(e.target.value) || 0))}
              className="w-full h-10 sm:h-11 px-2.5 sm:px-3 rounded-xl sm:rounded-2xl bg-[var(--bg-input)] border border-[var(--border-subtle)] text-[var(--text-primary)] font-mono text-center text-xs sm:text-sm font-bold focus:outline-none focus:border-[var(--gold-border)] focus:ring-1 focus:ring-[var(--gold-border)] transition-all"
            />
            <Percent className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[var(--text-muted)] absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2" />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] sm:text-[11px] font-bold text-[var(--text-secondary)] block">
            رأس المال ($)
          </label>
          <div className="relative">
            <input
              type="number"
              min={10}
              max={1000000}
              value={balance}
              onChange={(e) => setBalance(Math.max(1, Number(e.target.value) || 0))}
              className="w-full h-10 sm:h-11 px-2.5 sm:px-3 rounded-xl sm:rounded-2xl bg-[var(--bg-input)] border border-[var(--border-subtle)] text-[var(--text-primary)] font-mono text-center text-xs sm:text-sm font-bold focus:outline-none focus:border-[var(--gold-border)] focus:ring-1 focus:ring-[var(--gold-border)] transition-all"
            />
            <DollarSign className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[var(--text-muted)] absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2" />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] sm:text-[11px] font-bold text-[var(--text-secondary)] block">
            عائد البروكر (%)
          </label>
          <input
            type="number"
            min={50}
            max={98}
            value={payoutPercent}
            onChange={(e) => setPayoutPercent(Number(e.target.value) || 85)}
            className="w-full h-10 sm:h-11 px-2.5 sm:px-3 rounded-xl sm:rounded-2xl bg-[var(--bg-input)] border border-[var(--border-subtle)] text-[var(--text-primary)] font-mono text-center text-xs sm:text-sm font-bold focus:outline-none focus:border-[var(--gold-border)] focus:ring-1 focus:ring-[var(--gold-border)] transition-all"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] sm:text-[11px] font-bold text-[var(--text-secondary)] block">
            معامل المضاعفة (MTG)
          </label>
          <div className="relative">
            <select
              value={multiplier}
              onChange={(e) => setMultiplier(Number(e.target.value))}
              className="w-full h-10 sm:h-11 px-2 sm:px-3 rounded-xl sm:rounded-2xl bg-[var(--bg-input)] border border-[var(--border-subtle)] text-[var(--gold-primary)] text-[11px] sm:text-xs font-bold focus:outline-none focus:border-[var(--gold-border)] cursor-pointer appearance-none text-right pr-2 sm:pr-3 pl-6"
            >
              <option value="2.2">x2.2 (تعويض + ربح)</option>
              <option value="2.0">x2.0 (مضاعفة قياسية)</option>
              <option value="2.5">x2.5 (مضاعفة هجومية)</option>
            </select>
            <div className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-muted)] text-[10px]">
              ▼
            </div>
          </div>
        </div>
      </div>

      {/* Calculated Stakes Breakdown */}
      <div className="grid grid-cols-3 gap-1.5 sm:gap-2.5 pt-1">
        <div className="p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-[var(--bg-input)] border border-[var(--border-subtle)] text-center shadow-xs">
          <span className="text-[9.5px] sm:text-[10.5px] text-[var(--text-secondary)] block font-medium">الدخول الأساسي</span>
          <span className="font-mono font-bold text-[var(--gold-primary)] text-xs sm:text-base mt-0.5 block">${baseStake}</span>
          <span className="text-[9px] sm:text-[10px] text-[var(--success)] font-mono mt-0.5 block">ربح: +${profitBase}</span>
        </div>

        <div className="p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-[var(--bg-input)] border border-[var(--border-subtle)] text-center shadow-xs">
          <span className="text-[9.5px] sm:text-[10.5px] text-[var(--text-secondary)] block font-medium">مضاعفة 1 (MTG 1)</span>
          <span className="font-mono font-bold text-[var(--warning)] text-xs sm:text-base mt-0.5 block">${mtg1Stake}</span>
          <span className="text-[9px] sm:text-[10px] text-[var(--success)] font-mono mt-0.5 block">صافي: +${netProfitMtg1}</span>
        </div>

        <div className="p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-[var(--bg-input)] border border-[var(--border-subtle)] text-center shadow-xs">
          <span className="text-[9.5px] sm:text-[10.5px] text-[var(--text-secondary)] block font-medium">مضاعفة 2 (MTG 2)</span>
          <span className="font-mono font-bold text-[var(--danger)] text-xs sm:text-base mt-0.5 block">${mtg2Stake}</span>
          <span className="text-[9px] sm:text-[10px] text-[var(--success)] font-mono mt-0.5 block">صافي: +${netProfitMtg2}</span>
        </div>
      </div>

      {/* Financial Exposure Metric Box */}
      <div className="p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-[var(--bg-input)] border border-[var(--border-subtle)] space-y-1.5 text-xs">
        <div className="flex items-center justify-between font-bold">
          <span className="text-[var(--text-primary)] text-[10.5px] sm:text-[11px]">نسبة التعرض المالي التراكمي:</span>
          <span className={`font-mono font-bold text-xs sm:text-sm ${Number(exposureMtg2Percent) > 15 ? 'text-[var(--danger)]' : 'text-[var(--success)]'}`}>
            {exposureMtg2Percent}% من رأس المال
          </span>
        </div>
        <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-[var(--text-muted)] pt-0.5 border-t border-[var(--border-subtle)]">
          <span>إجمالي مبلغ المخاطرة (MTG 1 + 2):</span>
          <span className="font-mono font-bold text-[var(--text-primary)]">${totalRiskMtg2}</span>
        </div>
        <p className="text-[9.5px] sm:text-[10.5px] text-[var(--text-secondary)] leading-relaxed pt-0.5">
          {Number(exposureMtg2Percent) > 15
            ? 'مستوى التعرض الإجمالي مرتفع، يُنصح بضبط نسبة المخاطرة الأساسية إلى 1% للحفاظ على استقرار الحساب.'
            : 'خطة التعرض المالي متوازنة ومنضبطة وفق القواعد الحسابية لحماية الرصيد.'}
        </p>
      </div>
    </div>
  );
};
