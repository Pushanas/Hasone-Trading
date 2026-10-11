// src/components/dashboard/SignalCard.tsx
// High-Impact Signal Card with Multi-Factor Confluence & AI Rationale

import React from 'react';
import { FullAnalysisReport } from '../../../shared/types';
import { ArrowUpRight, ArrowDownRight, Clock, ShieldCheck, Sparkles, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface SignalCardProps {
  report: FullAnalysisReport | null;
  isLoading?: boolean;
}

export const SignalCard: React.FC<SignalCardProps> = ({ report, isLoading }) => {
  if (isLoading) {
    return (
      <div className="bg-[#0e121b]/95 border border-slate-800 rounded-2xl p-6 shadow-xl animate-pulse">
        <div className="h-6 bg-slate-800 rounded w-1/3 mb-4"></div>
        <div className="h-16 bg-slate-800/60 rounded-xl mb-4"></div>
        <div className="grid grid-cols-3 gap-3">
          <div className="h-12 bg-slate-800/40 rounded-lg"></div>
          <div className="h-12 bg-slate-800/40 rounded-lg"></div>
          <div className="h-12 bg-slate-800/40 rounded-lg"></div>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="bg-[#0e121b]/90 border border-slate-800/80 rounded-2xl p-6 text-center text-slate-400">
        <Sparkles className="w-8 h-8 mx-auto mb-2 text-amber-400/60" />
        <h4 className="font-bold text-sm text-slate-200">اختر زوجاً واضغط على التحليل الفوري</h4>
        <p className="text-xs text-slate-500 mt-1">سيتم تشغيل محرك حسون الفائق وتوليد بطاقة الإشارة اللحظية</p>
      </div>
    );
  }

  const isCall = report.signal.direction === 'CALL';
  const isPut = report.signal.direction === 'PUT';

  return (
    <div className="bg-[#0e121b]/95 border border-slate-800/90 rounded-2xl p-5 shadow-2xl backdrop-blur-md relative overflow-hidden">
      {/* Background Accent Glow */}
      <div
        className={`absolute -top-24 -right-24 w-48 h-48 rounded-full blur-3xl pointer-events-none opacity-20 ${
          isCall ? 'bg-emerald-500' : isPut ? 'bg-rose-500' : 'bg-amber-500'
        }`}
      />

      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800/70 pb-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-black text-base text-slate-100">{report.pair.name}</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                report.dataSource === 'TWELVE_DATA_API'
                  ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                  : 'bg-purple-500/10 text-purple-400 border-purple-500/30'
              }`}
            >
              {report.dataSource === 'TWELVE_DATA_API' ? 'Twelve Data Live' : 'Quotex OTC Gateway'}
            </span>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            سعر الدخول: <span className="text-amber-300 font-bold">{report.currentPrice.toFixed(report.pair.decimalPlaces)}</span>
          </p>
        </div>

        <div className="text-left font-mono">
          <div className="text-xs text-slate-400">العائد المتوقع</div>
          <div className="text-sm font-bold text-emerald-400">+{report.pair.payout}%</div>
        </div>
      </div>

      {/* Main Signal Banner */}
      <div
        className={`rounded-2xl p-4 mb-4 border flex items-center justify-between ${
          isCall
            ? 'bg-gradient-to-r from-emerald-950/40 via-emerald-900/20 to-slate-900/60 border-emerald-500/40 text-emerald-400'
            : isPut
            ? 'bg-gradient-to-r from-rose-950/40 via-rose-900/20 to-slate-900/60 border-rose-500/40 text-rose-400'
            : 'bg-slate-900/60 border-slate-700 text-amber-400'
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-xl border shadow-lg ${
              isCall
                ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-emerald-500/20'
                : isPut
                ? 'bg-rose-500 text-white border-rose-400 shadow-rose-500/20'
                : 'bg-amber-500 text-slate-950 border-amber-400'
            }`}
          >
            {isCall ? <ArrowUpRight className="w-7 h-7" /> : isPut ? <ArrowDownRight className="w-7 h-7" /> : '•'}
          </div>

          <div>
            <div className="text-xs uppercase tracking-wider opacity-80">توصية المحرك</div>
            <div className="text-2xl font-black">
              {isCall ? 'شراء (CALL)' : isPut ? 'بيع (PUT)' : 'ترقب وانتظار (HOLD)'}
            </div>
          </div>
        </div>

        <div className="text-right">
          <div className="text-xs opacity-75">مستوى الثقة</div>
          <div className="text-2xl font-black font-mono">{report.signal.confidence}%</div>
          <div className="text-[10px] text-slate-300">
            {report.signal.confluenceCount}/{report.signal.totalChecked} إشارات مؤكدة
          </div>
        </div>
      </div>

      {/* Technical Indicators Matrix */}
      <div className="grid grid-cols-4 gap-2 mb-4 text-center">
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-2">
          <div className="text-[10px] text-slate-400">RSI (14)</div>
          <div className="text-xs font-bold font-mono text-slate-100">{report.indicators.rsi}</div>
          <div className={`text-[9px] font-bold ${
            report.indicators.rsiSignal === 'OVERSOLD' ? 'text-emerald-400' : report.indicators.rsiSignal === 'OVERBOUGHT' ? 'text-rose-400' : 'text-slate-400'
          }`}>
            {report.indicators.rsiSignal}
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-2">
          <div className="text-[10px] text-slate-400">MACD (12,26)</div>
          <div className="text-xs font-bold font-mono text-slate-100">{report.indicators.macd.histogram}</div>
          <div className="text-[9px] font-bold text-amber-400">{report.indicators.macd.trend}</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-2">
          <div className="text-[10px] text-slate-400">Bollinger %B</div>
          <div className="text-xs font-bold font-mono text-slate-100">{report.indicators.bollingerBands.percentB}</div>
          <div className="text-[9px] font-bold text-blue-400">نطاق السعر</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-2">
          <div className="text-[10px] text-slate-400">اتجاه EMA</div>
          <div className="text-xs font-bold font-mono text-slate-100">{report.indicators.ema.trend}</div>
          <div className="text-[9px] font-bold text-emerald-400">9/21/50</div>
        </div>
      </div>

      {/* Duration & Risk */}
      <div className="flex items-center justify-between bg-slate-900/40 border border-slate-800/60 rounded-xl p-2.5 mb-3 text-xs">
        <div className="flex items-center gap-1.5 text-slate-300">
          <Clock className="w-3.5 h-3.5 text-amber-400" />
          <span>مدة الصفقة المقترحة: <strong className="text-slate-100">{report.signal.recommendedDuration}</strong></span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-300">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>إدارة المخاطر: <strong className="text-emerald-300">{report.geminiAi?.riskRating || 'MEDIUM'}</strong></span>
        </div>
      </div>

      {/* Gemini AI Rationale */}
      {report.geminiAi?.rationale && (
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3 text-xs text-amber-200/90 leading-relaxed flex items-start gap-2">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-[11px] text-amber-300 mb-0.5">رؤية الذكاء الاصطناعي (Gemini 3.8 Intelligence):</div>
            <p>{report.geminiAi.rationale}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default SignalCard;
