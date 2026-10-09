import React, { useEffect, useState } from 'react';
import { Volume2, VolumeX, Lock, Clock, Shield } from 'lucide-react';
import emblemImage from '../assets/images/hasone_clear_logo_1791521412888.jpg';

interface HeaderProps {
  soundEnabled: boolean;
  onToggleSound: () => void;
  onLockSession: () => void;
  onSecretTrigger?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  soundEnabled,
  onToggleSound,
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
            {/* Subtle Metallic Ambient Backlight Glow */}
            <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-br from-[var(--gold-primary)]/30 via-[var(--accent-burgundy)]/25 to-transparent blur-[3px] opacity-90 transition-opacity" />

            <div className="relative w-full h-full rounded-xl overflow-hidden border border-[var(--gold-border)] p-0.5 bg-[var(--bg-surface)] shadow-lg ring-1 ring-white/10">
              <img
                src={emblemImage}
                alt="Hasone Trading"
                className="w-full h-full object-cover rounded-[9px]"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>

          <div className="text-right flex flex-col justify-center">
            <h1
              className="text-xs sm:text-sm font-black text-[var(--text-primary)] tracking-wide leading-none whitespace-nowrap font-mono"
              dir="ltr"
            >
              Hasone Trading
            </h1>
            <span
              className="text-[8px] sm:text-[9px] font-bold tracking-[0.16em] text-[var(--gold-primary)] uppercase block mt-1 font-mono leading-none whitespace-nowrap"
              dir="ltr"
            >
              HASONE TRADING VIP
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
          {/* Sound Toggle */}
          <button
            onClick={onToggleSound}
            aria-label={soundEnabled ? 'كتم الصوت' : 'تشغيل الصوت'}
            title={soundEnabled ? 'كتم التنبيهات الصوتية' : 'تشغيل التنبيهات الصوتية'}
            className={`w-8 h-8 rounded-[var(--radius-md)] border transition-all flex items-center justify-center cursor-pointer shadow-xs active:scale-95 ${
              soundEnabled
                ? 'bg-[var(--gold-soft)] border-[var(--gold-border)] text-[var(--gold-primary)] hover:bg-[var(--bg-hover)]'
                : 'bg-[var(--bg-surface)] border-[var(--border-default)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
            }`}
          >
            {soundEnabled ? (
              <Volume2 className="w-4 h-4" />
            ) : (
              <VolumeX className="w-4 h-4" />
            )}
          </button>

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
