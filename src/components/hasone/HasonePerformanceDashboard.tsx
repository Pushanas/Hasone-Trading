// src/components/hasone/HasonePerformanceDashboard.tsx
// Financial Performance & Quantitative Statistics Dashboard

import React from 'react';
import { BarChart2, TrendingUp, Award, Target, Activity, ShieldCheck, Flame } from 'lucide-react';
import { TradingStats } from '../../utils/hasoneTracker';

interface HasonePerformanceDashboardProps {
  stats: TradingStats;
  isPaperMode: boolean;
}

export const HasonePerformanceDashboard: React.FC<HasonePerformanceDashboardProps> = ({
  stats,
  isPaperMode,
}) => {
  return (
    <div className="space-y-4" dir="rtl">
      {/* Top Banner */}
      <div className="p-4 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
        <div>
          <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-[var(--gold-primary)]" />
            <span>لوحة الأداء والإحصائيات الكمية الفعلية</span>
          </h3>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            يتم احتساب هذه النسب حصرياً بناءً على نتائج الصفقات المسجلة في قاعدة البيانات المحلية.
          </p>
        </div>

        <span className="px-3 py-1 rounded-xl text-xs font-bold font-mono self-start sm:self-auto bg-[var(--bg-input)] border border-[var(--border-default)] text-amber-300">
          {isPaperMode ? 'نتائج الوضع التجريبي (Paper Mode)' : 'نتائج الوضع الحقيقي (Live)'}
        </span>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {/* Win Rate */}
        <div className="card-surface p-4 rounded-2xl border border-[var(--gold-border)] space-y-1">
          <div className="text-[11px] font-bold text-[var(--text-muted)] flex items-center justify-between">
            <span>نسبة النجاح (Win Rate)</span>
            <Target className="w-4 h-4 text-[var(--gold-primary)]" />
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-[var(--gold-primary)]">
            {stats.winRate}%
          </div>
          <div className="text-[10px] text-[var(--text-muted)]">
            من إجمالي {stats.wins + stats.losses} صفقة منتهية
          </div>
        </div>

        {/* Wins */}
        <div className="card-surface p-4 rounded-2xl border border-emerald-500/30 space-y-1">
          <div className="text-[11px] font-bold text-emerald-400 flex items-center justify-between">
            <span>الصفقات الرابحة (WIN)</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-400">
            {stats.wins}
          </div>
          <div className="text-[10px] text-[var(--text-muted)]">
            صفقات انتهت داخل السعر (ITM)
          </div>
        </div>

        {/* Losses */}
        <div className="card-surface p-4 rounded-2xl border border-rose-500/30 space-y-1">
          <div className="text-[11px] font-bold text-rose-400 flex items-center justify-between">
            <span>الصفقات الخاسرة (LOSS)</span>
            <Activity className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-rose-400">
            {stats.losses}
          </div>
          <div className="text-[10px] text-[var(--text-muted)]">
            صفقات انتهت خارج السعر (OTM)
          </div>
        </div>

        {/* Total Today */}
        <div className="card-surface p-4 rounded-2xl border border-[var(--border-subtle)] space-y-1">
          <div className="text-[11px] font-bold text-[var(--text-muted)] flex items-center justify-between">
            <span>إشارات اليوم</span>
            <Flame className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-white">
            {stats.todaySignals}
          </div>
          <div className="text-[10px] text-[var(--text-muted)]">
            إجمالي المسجل: {stats.totalSignals}
          </div>
        </div>
      </div>

      {/* Secondary Insights Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
        <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-1.5">
          <span className="text-[var(--text-muted)] text-[11px] font-bold flex items-center gap-1.5">
            <Award className="w-4 h-4 text-[var(--gold-primary)]" />
            <span>الزوج الأكثر نجاحاً (Best Pair)</span>
          </span>
          <span className="text-sm font-black font-mono text-white block">
            {stats.bestPair || '—'}
          </span>
          <span className="text-[10px] text-[var(--text-muted)] block">
            أعلى معدل فوز مستمر
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-1.5">
          <span className="text-[var(--text-muted)] text-[11px] font-bold flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>المدة المثالية للصفقات</span>
          </span>
          <span className="text-sm font-black font-mono text-white block">
            {stats.bestDuration || '1m'}
          </span>
          <span className="text-[10px] text-[var(--text-muted)] block">
            أعلى استقرار في التوقعات
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-1.5">
          <span className="text-[var(--text-muted)] text-[11px] font-bold flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-cyan-400" />
            <span>متوسط قوة الإشارات (Avg Strength)</span>
          </span>
          <span className="text-sm font-black font-mono text-cyan-300 block">
            {stats.avgStrength}%
          </span>
          <span className="text-[10px] text-[var(--text-muted)] block">
            تطابق الشروط الفنية والمؤشرات
          </span>
        </div>
      </div>
    </div>
  );
};
