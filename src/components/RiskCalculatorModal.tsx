import React, { useState } from 'react';
import { X, Calculator, ShieldCheck } from 'lucide-react';
import { ModalWrapper } from './ModalWrapper';

interface RiskCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RiskCalculatorModal: React.FC<RiskCalculatorModalProps> = ({ isOpen, onClose }) => {
  const [balance, setBalance] = useState<number>(500);
  const [riskPercent, setRiskPercent] = useState<number>(2);
  const [multiplier, setMultiplier] = useState<number>(2.2);
  const [payoutPercent, setPayoutPercent] = useState<number>(85);

  const baseStake = Math.max(1, Math.round((balance * (riskPercent / 100)) * 10) / 10);
  const mtg1Stake = Math.round(baseStake * multiplier * 10) / 10;
  const mtg2Stake = Math.round(mtg1Stake * multiplier * 10) / 10;

  const totalRiskMtg1 = Math.round((baseStake + mtg1Stake) * 10) / 10;
  const totalRiskMtg2 = Math.round((baseStake + mtg1Stake + mtg2Stake) * 10) / 10;

  const profitBase = Math.round(baseStake * (payoutPercent / 100) * 10) / 10;
  const netProfitMtg1 = Math.round((mtg1Stake * (payoutPercent / 100) - baseStake) * 10) / 10;
  const netProfitMtg2 = Math.round((mtg2Stake * (payoutPercent / 100) - totalRiskMtg1) * 10) / 10;

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} maxWidth="max-w-lg">
      <div className="p-4 sm:p-5 flex flex-col max-h-[88vh] overflow-y-auto text-right" dir="rtl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-[var(--bg-input)] text-[var(--gold-primary)] border border-[var(--gold-border)] shadow-xs">
              <Calculator className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-[var(--gold-primary)]">
                حاسبة إدارة رأس المال — حسون - Trading
              </h3>
              <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">
                حساب دقيق لمبالغ الدخول والمضاعفات لحماية حسابك
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="إغلاق"
            className="p-1.5 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3 mt-4 text-right">
          <div className="space-y-1">
            <label className="text-[10.5px] sm:text-[11px] font-bold text-[var(--text-secondary)]">
              إجمالي رأس المال ($)
            </label>
            <input
              type="number"
              min={10}
              max={100000}
              value={balance}
              onChange={(e) => setBalance(Number(e.target.value) || 0)}
              className="w-full h-11 px-3 rounded-xl bg-[var(--bg-input)] border border-[var(--border-subtle)] text-[var(--text-primary)] font-mono text-sm focus:outline-none focus:border-[var(--gold-border)] transition-all text-center"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10.5px] sm:text-[11px] font-bold text-[var(--text-secondary)]">
              نسبة المخاطرة لكل صفقة (%)
            </label>
            <input
              type="number"
              min={0.5}
              max={10}
              step={0.5}
              value={riskPercent}
              onChange={(e) => setRiskPercent(Number(e.target.value) || 0)}
              className="w-full h-11 px-3 rounded-xl bg-[var(--bg-input)] border border-[var(--border-subtle)] text-[var(--text-primary)] font-mono text-sm focus:outline-none focus:border-[var(--gold-border)] transition-all text-center"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10.5px] sm:text-[11px] font-bold text-[var(--text-secondary)]">
              معامل المضاعفة (Multiplier)
            </label>
            <select
              value={multiplier}
              onChange={(e) => setMultiplier(Number(e.target.value))}
              className="w-full h-11 px-3 rounded-xl bg-[var(--bg-input)] border border-[var(--border-subtle)] text-[var(--gold-primary)] text-xs font-bold focus:outline-none focus:border-[var(--gold-border)] cursor-pointer"
            >
              <option value="2.0">x2.0 (مضاعفة قياسية)</option>
              <option value="2.2">x2.2 (موصى بها لتعويض العائد)</option>
              <option value="2.5">x2.5 (هجومي)</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10.5px] sm:text-[11px] font-bold text-[var(--text-secondary)]">
              نسبة عائد البروكر (%)
            </label>
            <input
              type="number"
              min={50}
              max={98}
              value={payoutPercent}
              onChange={(e) => setPayoutPercent(Number(e.target.value) || 85)}
              className="w-full h-11 px-3 rounded-xl bg-[var(--bg-input)] border border-[var(--border-subtle)] text-[var(--text-primary)] font-mono text-sm focus:outline-none focus:border-[var(--gold-border)] transition-all text-center"
            />
          </div>
        </div>

        {/* Calculation Results Card */}
        <div className="mt-4 p-3.5 sm:p-4 rounded-2xl bg-[var(--bg-input)] border border-[var(--border-subtle)] space-y-3">
          <div className="text-xs font-bold text-[var(--gold-primary)] border-b border-[var(--border-subtle)] pb-2 flex items-center justify-between">
            <span>مبالغ الدخول المحسوبة لصفقات حسون - Trading:</span>
            <span className="font-mono text-[var(--text-primary)]">${balance}</span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            {/* Step 1 */}
            <div className="p-2 sm:p-2.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
              <div className="text-[10px] text-[var(--text-secondary)] font-semibold">الصفقة الأساسية</div>
              <div className="text-sm sm:text-base font-black font-mono text-[var(--gold-primary)] mt-1">
                ${baseStake}
              </div>
              <div className="text-[9px] text-[var(--success)] mt-0.5 font-mono">
                ربح: +${profitBase}
              </div>
            </div>

            {/* Step 2 */}
            <div className="p-2 sm:p-2.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
              <div className="text-[10px] text-[var(--text-secondary)] font-semibold">المضاعفة 1 (MTG1)</div>
              <div className="text-sm sm:text-base font-black font-mono text-[var(--warning)] mt-1">
                ${mtg1Stake}
              </div>
              <div className="text-[9px] text-[var(--success)] mt-0.5 font-mono">
                صافي: +${netProfitMtg1}
              </div>
            </div>

            {/* Step 3 */}
            <div className="p-2 sm:p-2.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
              <div className="text-[10px] text-[var(--text-secondary)] font-semibold">المضاعفة 2 (MTG2)</div>
              <div className="text-sm sm:text-base font-black font-mono text-[var(--danger)] mt-1">
                ${mtg2Stake}
              </div>
              <div className="text-[9px] text-[var(--success)] mt-0.5 font-mono">
                صافي: +${netProfitMtg2}
              </div>
            </div>
          </div>

          {/* Safety Summary */}
          <div className="pt-2 text-[10.5px] sm:text-[11px] text-[var(--text-secondary)] space-y-1">
            <div className="flex justify-between">
              <span>إجمالي المخاطرة مع MTG 1:</span>
              <span className="font-mono font-bold text-[var(--text-primary)]">${totalRiskMtg1} ({balance > 0 ? (totalRiskMtg1 / balance * 100).toFixed(1) : 0}% من المحفظة)</span>
            </div>
            <div className="flex justify-between">
              <span>إجمالي المخاطرة مع MTG 2:</span>
              <span className="font-mono font-bold text-[var(--text-primary)]">${totalRiskMtg2} ({balance > 0 ? (totalRiskMtg2 / balance * 100).toFixed(1) : 0}% من المحفظة)</span>
            </div>
          </div>
        </div>

        {/* Operational Guard Rule */}
        <div className="mt-3.5 p-3 rounded-2xl bg-[var(--bg-input)] border border-[var(--border-subtle)] flex items-start gap-2.5 text-xs text-[var(--text-secondary)]">
          <ShieldCheck className="w-4 h-4 text-[var(--gold-primary)] shrink-0 mt-0.5" />
          <p className="leading-relaxed text-[11px]">
            قاعدة الأمان الرقمي: لا تتجاوز أبداً 3 صفقات خاسرة متتالية في جلسة واحدة. التزم بحد الخسارة اليومي واستأنف في جلسة جديدة وفق خطة إدارة رأس المال.
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="btn-primary mt-3.5 w-full h-11 font-bold text-xs sm:text-sm text-[var(--text-on-burgundy)]"
        >
          تم، اعتماد الخطة
        </button>
      </div>
    </ModalWrapper>
  );
};
