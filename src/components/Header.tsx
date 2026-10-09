import React, { useEffect, useState } from 'react';
import { Lock, Clock, Shield } from 'lucide-react';
import emblemImage from '../assets/images/hassone_trading_modern_logo_1791570141710.jpg';

interface HeaderProps {
  onLockSession: () => void;
  onSecretTrigger?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onLockSession,
  onSecretTrigger,
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
      className="sticky top-0 z-30 select-none bg-[var(--bg-base)]/90 backdrop-blur-md border-b border-[var(--border-subtle)] px-3 sm:px-4 py-2 sm:py-2.5 shadow-sm"
    >
      <div className="flex items-center justify-between gap-2 sm:gap-3 w-full">
        {/* ================= ZONE 1: BRAND IDENTITY (Right) ================= */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          <div
            onClick={handleLogoClick}
            className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-xl shrink-0 group cursor-default select-none"
          >
            {/* Subtle Optimistic Cyan & Emerald Ambient Backlight Glow */}
            <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-br from-emerald-500/40 via-cyan-500/35 to-violet-500/25 blur-[3px] opacity-90 transition-opacity" />

            <div className="relative w-full h-full rounded-xl overflow-hidden border border-cyan-500/40 p-0.5 bg-[var(--bg-surface)] shadow-lg ring-1 ring-emerald-500/20">
              <img
                src={emblemImage}
                alt="حسون - Trading"
                className="w-full h-full object-cover rounded-[9px]"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>

          <div className="text-right flex flex-col justify-center">
            <h1
              className="text-xs sm:text-sm font-black text-[var(--text-primary)] tracking-wide leading-none whitespace-nowrap"
            >
              حسون - Trading
            </h1>
            <span
              className="text-[8px] sm:text-[9px] font-bold tracking-[0.16em] text-cyan-400 uppercase block mt-1 font-mono leading-none whitespace-nowrap"
              dir="ltr"
            >
              HASSONE TRADING VIP
            </span>
          </div>
        </div>

        {/* ================= ZONE 2: LIVE CLOCK & STATUS (Center-Left) ================= */}
        <div className="flex-1 flex justify-center items-center px-1">
          <div
            dir="ltr"
            className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-[var(--radius-md)] bg-[var(--bg-surface)] border border-[var(--border-default)] text-[var(--text-primary)] shadow-xs"
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
        </div>

        {/* ================= ZONE 3: ACTIONS & SECURITY (Left) ================= */}
        <div className="flex items-center gap-1.5 shrink-0" dir="ltr">
          {/* Session Lock Button */}
          <button
            onClick={onLockSession}
            aria-label="قفل الجلسة"
            title="قفل الجلسة"
            className="w-8 h-8 rounded-[var(--radius-md)] bg-[var(--danger-soft)] hover:bg-[var(--bg-hover)] border border-[rgba(251,113,133,0.25)] text-[var(--danger)] flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-95"
          >
            <Lock className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
