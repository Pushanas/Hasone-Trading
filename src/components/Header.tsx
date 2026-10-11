// src/components/Header.tsx
// Responsive Financial Workstation Header with Brand Identity, Desktop Tabs, and Session Controls

import React, { useEffect, useState } from 'react';
import { Lock, Clock, Zap, SlidersHorizontal, Sparkles, Flame, ListFilter, Calculator } from 'lucide-react';
import emblemImage from '../assets/images/hassone_trading_modern_logo_1791570141710.jpg';
import { NavTabType } from './MagicNavigationBar';

interface HeaderProps {
  onLockSession: () => void;
  onSecretTrigger?: () => void;
  activeTab?: NavTabType;
  onChangeTab?: (tab: NavTabType) => void;
}

const DESKTOP_NAV_ITEMS: { id: NavTabType; label: string; icon: any }[] = [
  { id: 'analyzer', label: 'محلل Hasone', icon: Sparkles },
  { id: 'live', label: 'الصفقة الحية', icon: Zap },
  { id: 'generator', label: 'المولّد', icon: SlidersHorizontal },
  { id: 'collection', label: 'الاستراتيجيات', icon: Flame },
  { id: 'table', label: 'الجدول', icon: ListFilter },
  { id: 'calculator', label: 'الحاسبة', icon: Calculator },
];

export const Header: React.FC<HeaderProps> = ({
  onLockSession,
  onSecretTrigger,
  activeTab,
  onChangeTab,
}) => {
  const [time, setTime] = useState<string>('');
  const [clickCount, setClickCount] = useState<number>(0);
  const lastClickRef = React.useRef<number>(0);

  const handleLogoClick = () => {
    const now = Date.now();
    if (now - lastClickRef.current > 3500) {
      lastClickRef.current = now;
      setClickCount(1);
    } else {
      lastClickRef.current = now;
      const next = clickCount + 1;
      if (next >= 5) {
        setClickCount(0);
        onSecretTrigger?.();
      } else {
        setClickCount(next);
      }
    }
  };

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      setTime(`${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header
      dir="rtl"
      className="sticky top-0 z-30 select-none bg-[var(--bg-base)]/95 backdrop-blur-md border-b border-[var(--border-subtle)] px-3 sm:px-6 py-2.5 sm:py-3 shadow-sm"
    >
      <div className="flex items-center justify-between gap-3 sm:gap-6 w-full max-w-7xl mx-auto">
        {/* ================= ZONE 1: BRAND IDENTITY (Right) ================= */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          <div
            onClick={handleLogoClick}
            className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-xl shrink-0 group cursor-default select-none"
          >
            <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-br from-emerald-500/40 via-cyan-500/35 to-violet-500/25 blur-[3px] opacity-90 transition-opacity" />

            <div className="relative w-full h-full rounded-xl overflow-hidden border border-cyan-500/40 p-0.5 bg-[var(--bg-surface)] shadow-lg ring-1 ring-emerald-500/20">
              <img
                src={emblemImage}
                alt="Hasone Trading"
                className="w-full h-full object-cover rounded-[9px]"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>

          <div className="text-right flex flex-col justify-center">
            <h1 className="text-xs sm:text-sm font-black text-[var(--text-primary)] tracking-wide leading-none whitespace-nowrap">
              Hasone Trading
            </h1>
            <span
              className="text-[8px] sm:text-[9px] font-bold tracking-[0.16em] text-cyan-400 uppercase block mt-1 font-mono leading-none whitespace-nowrap"
              dir="ltr"
            >
              HASONE TRADING VIP
            </span>
          </div>
        </div>

        {/* ================= ZONE 2: DESKTOP WORKSPACE NAVIGATION (Center) ================= */}
        {onChangeTab && activeTab && (
          <div className="hidden md:flex items-center gap-1 bg-[var(--bg-surface)] p-1 rounded-2xl border border-[var(--border-subtle)]">
            {DESKTOP_NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onChangeTab(item.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    isActive
                      ? 'bg-gradient-to-r from-[var(--gold-primary)] to-amber-500 text-[var(--text-on-gold)] shadow-sm'
                      : 'text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-hover)]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* ================= ZONE 3: LIVE CLOCK & CONTROLS (Left) ================= */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Live UTC/Local Time */}
          <div
            dir="ltr"
            className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-default)] text-[var(--text-primary)] shadow-xs"
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--success)] opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[var(--success)]" />
            </span>
            <Clock className="w-3 h-3 text-[var(--gold-primary)] shrink-0" />
            <span className="text-[11px] sm:text-xs font-mono font-bold tracking-wider whitespace-nowrap text-[var(--text-primary)] tabular-nums">
              {time || '00:00:00'}
            </span>
          </div>

          {/* Session Lock Button */}
          <button
            onClick={onLockSession}
            aria-label="قفل الجلسة"
            title="قفل الجلسة"
            className="w-8 h-8 rounded-xl bg-[var(--danger-soft)] hover:bg-[var(--bg-hover)] border border-[rgba(251,113,133,0.25)] text-[var(--danger)] flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-95"
          >
            <Lock className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
