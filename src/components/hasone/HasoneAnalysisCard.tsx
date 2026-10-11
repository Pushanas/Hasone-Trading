// src/components/hasone/HasoneAnalysisCard.tsx
// High-Impact Technical Confluence Analysis Result Card

import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  Clock,
  Shield,
  Copy,
  Check,
  Zap,
  Activity,
  Layers,
  Sparkles,
  Info,
} from 'lucide-react';
import { HasoneAnalysisResult } from '../../utils/hasoneEngine';

interface HasoneAnalysisCardProps {
  result: HasoneAnalysisResult;
  copied: boolean;
  onCopy: () => void;
  imported: boolean;
  onImportToLive?: () => void;
}

export const HasoneAnalysisCard: React.FC<HasoneAnalysisCardProps> = ({
  result,
  copied,
  onCopy,
  imported,
  onImportToLive,
}) => {
  const isCall = result.signalType === 'CALL';
  const isPut = result.signalType === 'PUT';
  const isNone = result.signalType === 'NONE';

  const { indicators, pair } = result;

  return (
    <div
      dir="rtl"
      className={`rounded-3xl border p-4 sm:p-6 space-y-4 shadow-xl transition-all ${
        isCall
          ? 'bg-gradient-to-b from-emerald-950/40 via-[var(--bg-surface)] to-[var(--bg-base)] border-emerald-500/40'
          : isPut
          ? 'bg-gradient-to-b from-rose-950/40 via-[var(--bg-surface)] to-[var(--bg-base)] border-rose-500/40'
          : 'bg-[var(--bg-surface)] border-[var(--border-subtle)]'
      }`}
    >
      {/* 1. Top Badges & Signal Direction */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border-subtle)] pb-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${
              isCall
                ? 'bg-emerald-500 text-slate-950 shadow-emerald-500/20'
                : isPut
                ? 'bg-rose-500 text-white shadow-rose-500/20'
                : 'bg-slate-700 text-white'
            }`}
          >
            {isCall ? (
              <TrendingUp className="w-8 h-8 stroke-[2.5]" />
            ) : isPut ? (
              <TrendingDown className="w-8 h-8 stroke-[2.5]" />
            ) : (
              <Activity className="w-8 h-8" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xl sm:text-2xl font-black font-mono text-white tracking-wide">
                {pair.symbol}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-[var(--bg-elevated)] text-[var(--gold-primary)] border border-[var(--gold-border)]">
                المدة: {result.duration}
              </span>
            </div>
            <div className="text-xs text-[var(--text-secondary)] mt-0.5 flex items-center gap-2">
              <span>{pair.displayName}</span>
              <span>•</span>
              <span className="font-mono text-cyan-300">{result.dataSource}</span>
            </div>
          </div>
        </div>

        {/* Big Signal Callout */}
        <div className="text-right sm:text-left font-mono">
          <div
            className={`text-2xl sm:text-3xl font-black tracking-tight ${
              isCall ? 'text-emerald-400' : isPut ? 'text-rose-400' : 'text-slate-400'
            }`}
          >
            {isCall ? 'CALL صعود' : isPut ? 'PUT هبوط' : 'WAIT لا توجد إشارة'}
          </div>
          <div className="text-xs text-[var(--text-muted)] mt-0.5">
            قوة التوافق الفني: <b className="text-[var(--gold-primary)]">{result.strength}%</b> ({result.confidence})
          </div>
        </div>
      </div>

      {/* 2. Key Execution Parameters Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {/* Entry Time (Strictly HH:MM) */}
        <div className="p-3 rounded-2xl bg-[var(--bg-input)] border border-[var(--border-subtle)]">
          <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
            <Clock className="w-3.5 h-3.5 text-[var(--gold-primary)]" />
            <span>وقت الدخول الدقيق</span>
          </div>
          <div className="text-base sm:text-lg font-black font-mono text-[var(--gold-primary)] mt-1">
            {result.entryTime}
          </div>
          <div className="text-[10px] text-[var(--text-muted)] mt-0.5">
            مع بداية الشمعة القادمة (00 ثانية)
          </div>
        </div>

        {/* Entry Price */}
        <div className="p-3 rounded-2xl bg-[var(--bg-input)] border border-[var(--border-subtle)]">
          <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            <span>سعر التحليل المرجعي</span>
          </div>
          <div className="text-base sm:text-lg font-black font-mono text-white mt-1">
            {result.entryPrice.toFixed(pair.pipDecimals)}
          </div>
          <div className="text-[10px] text-[var(--text-muted)] mt-0.5 font-mono">
            حالة السوق: {result.marketCondition}
          </div>
        </div>

        {/* Risk Level */}
        <div className="p-3 rounded-2xl bg-[var(--bg-input)] border border-[var(--border-subtle)]">
          <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span>درجة المخاطرة</span>
          </div>
          <div className="text-base sm:text-lg font-black text-white mt-1">
            {result.riskLevel}
          </div>
          <div className="text-[10px] text-[var(--text-muted)] mt-0.5">
            إدارة رأس المال: 1% - 2%
          </div>
        </div>

        {/* Quality Metric */}
        <div className="p-3 rounded-2xl bg-[var(--bg-input)] border border-[var(--border-subtle)]">
          <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
            <Activity className="w-3.5 h-3.5 text-amber-400" />
            <span>جودة البيانات</span>
          </div>
          <div className="text-base sm:text-lg font-black font-mono text-emerald-400 mt-1">
            {result.dataQuality}
          </div>
          <div className="text-[10px] text-[var(--text-muted)] mt-0.5 truncate">
            {result.dataSource.includes('Twelve Data') ? 'بيانات بورصة حية' : 'محاكاة OTC موثوقة'}
          </div>
        </div>
      </div>

      {/* 3. Technical Indicators Confluence Breakdown */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] space-y-2.5">
        <div className="flex items-center justify-between text-xs text-[var(--gold-primary)] font-bold">
          <span className="flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5" />
            <span>تحليل المؤشرات الفنية المعتمدة</span>
          </span>
          <span className="text-[10px] font-mono text-[var(--text-muted)]">
            خوارزمية Hasone المتقدمة
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs font-mono">
          <div className="p-2 rounded-xl bg-[var(--bg-input)]">
            <span className="text-[10px] text-[var(--text-muted)] block">سحابة المتوسطات (EMA)</span>
            <span className="font-bold text-white block mt-0.5 text-[11px]">
              {indicators.ema.isBullishStack
                ? 'ترتيب صاعد (9 > 21 > 50)'
                : indicators.ema.isBearishStack
                ? 'ترتيب هابط (9 < 21 < 50)'
                : 'تقارب ومتوسطات متداخلة'}
            </span>
          </div>

          <div className="p-2 rounded-xl bg-[var(--bg-input)]">
            <span className="text-[10px] text-[var(--text-muted)] block">مؤشر القوة النسبية RSI(14)</span>
            <span className={`font-bold block mt-0.5 text-[11px] ${
              indicators.rsi14 >= 70 ? 'text-rose-400' : indicators.rsi14 <= 30 ? 'text-emerald-400' : 'text-cyan-300'
            }`}>
              {indicators.rsi14} ({indicators.rsi14 >= 70 ? 'ذروة شراء' : indicators.rsi14 <= 30 ? 'ذروة بيع' : 'منطقة محايدة'})
            </span>
          </div>

          <div className="p-2 rounded-xl bg-[var(--bg-input)]">
            <span className="text-[10px] text-[var(--text-muted)] block">قوة الاتجاه ADX(14)</span>
            <span className="font-bold text-white block mt-0.5 text-[11px]">
              {indicators.adx14.adx} ({indicators.adx14.isStrongTrend ? 'تريند قوي' : 'اتجاه هادئ'})
            </span>
          </div>

          <div className="p-2 rounded-xl bg-[var(--bg-input)]">
            <span className="text-[10px] text-[var(--text-muted)] block">نطاق البولنجر باند</span>
            <span className="font-bold text-white block mt-0.5 text-[11px]">
              {indicators.bollinger.bandwidth > 0.005 ? 'توسع عالي بالسيولة' : 'انضغاط ضيق (انفجار وشيك)'}
            </span>
          </div>

          <div className="p-2 rounded-xl bg-[var(--bg-input)] col-span-2 sm:col-span-2">
            <span className="text-[10px] text-[var(--text-muted)] block">نموذج الشموع اللحظي (Candlestick Pattern)</span>
            <span className="font-bold text-amber-300 block mt-0.5 text-[11px]">
              {indicators.candlestickPattern.patternName}
            </span>
          </div>
        </div>
      </div>

      {/* 4. Quantitative Reason & AI Institutional Note */}
      <div className="p-3.5 rounded-2xl bg-[var(--bg-input)] border border-[var(--border-subtle)] space-y-1 text-xs">
        <div className="font-bold text-[var(--text-primary)] flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-[var(--gold-primary)]" />
          <span>مذكرة التحليل الكمي:</span>
        </div>
        <p className="text-[var(--text-secondary)] leading-relaxed text-[11px]">
          {result.reason}
        </p>
      </div>

      {/* 5. Action Buttons (One prominent primary button + secondary) */}
      <div className="pt-2 flex flex-col sm:flex-row items-center gap-2">
        <button
          onClick={onCopy}
          className="btn-primary w-full sm:flex-1 h-12 rounded-xl font-black text-xs text-[var(--text-on-gold)] flex items-center justify-center gap-2 cursor-pointer shadow-md"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-slate-950" />
              <span>تم نسخ الإشارة للحافظة بنجاح!</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4 text-slate-950" />
              <span>نسخ الإشارة بتنسيق VIP للتيليجرام</span>
            </>
          )}
        </button>

        {onImportToLive && (
          <button
            onClick={onImportToLive}
            disabled={imported}
            className="btn-secondary w-full sm:w-auto h-12 px-5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
          >
            <Zap className="w-4 h-4 text-[var(--gold-primary)]" />
            <span>{imported ? 'تمت الإضافة لجدول الصفقات' : 'إرسال لجدول الصفقات الحية'}</span>
          </button>
        )}
      </div>
    </div>
  );
};
