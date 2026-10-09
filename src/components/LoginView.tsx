import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Lock, Sparkles, KeyRound, AlertCircle } from 'lucide-react';
import { verifyMasterPassword } from '../utils/crypto';
import emblemImage from '../assets/images/hassone_trading_modern_logo_1791570141710.jpg';

interface LoginViewProps {
  onSuccess: () => void;
  kickoutMessage?: string | null;
  onSecretTrigger?: () => void;
}

const MAX_ATTEMPTS = 5;
const LOCK_STEPS = [15, 30, 60, 120, 300];

export const LoginView: React.FC<LoginViewProps> = ({
  onSuccess,
  kickoutMessage,
  onSecretTrigger,
}) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState(0);
  const [secondsRemaining, setSecondsRemaining] = useState(0);
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
    const timer = setInterval(() => {
      if (lockedUntil > 0) {
        const diff = Math.max(0, Math.ceil((lockedUntil - Date.now()) / 1000));
        setSecondsRemaining(diff);
        if (diff === 0) {
          setLockedUntil(0);
        }
      }
    }, 500);
    return () => clearInterval(timer);
  }, [lockedUntil]);

  const handleLogin = async () => {
    if (secondsRemaining > 0) return;
    const cleanPass = password.trim();
    if (!cleanPass) {
      setError('يرجى إدخال كلمة المرور للوصول إلى منصة حسون - Trading');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await verifyMasterPassword(cleanPass);
      if (result.success) {
        setFailedAttempts(0);
        setLockedUntil(0);
        onSuccess();
      } else {
        const nextFailed = failedAttempts + 1;
        setFailedAttempts(nextFailed);
        setPassword('');
        if (nextFailed >= MAX_ATTEMPTS) {
          const step = Math.min(nextFailed - MAX_ATTEMPTS, LOCK_STEPS.length - 1);
          const penalty = LOCK_STEPS[step];
          setLockedUntil(Date.now() + penalty * 1000);
          setError(`تم تفعيل القفل الأمني المشدد لمنصة حسون - Trading لمدة ${penalty} ثانية بسبب تكرار المحاولات الخاطئة.`);
        } else {
          setError(result.error || `كلمة المرور غير صحيحة. متبقي لديك ${MAX_ATTEMPTS - nextFailed} محاولات.`);
        }
      }
    } catch {
      setError('حدث خطأ أمني أثناء التحقق المشفر، يرجى إعادة المحاولة.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-[var(--bg-canvas)] text-[var(--text-primary)]">
      <div className="w-full max-w-sm card-surface p-6 relative overflow-hidden text-right backdrop-blur-xl">
        {/* Ambient Top Glow */}
        <div className="absolute top-0 right-1/2 translate-x-1/2 w-44 h-1 bg-gradient-to-r from-transparent via-[var(--accent-burgundy)] to-transparent opacity-70" />

        {/* Brand Crest */}
        <div className="flex flex-col items-center text-center mb-6 relative">
          <div
            onClick={handleLogoClick}
            className="relative mb-3.5 cursor-default select-none"
          >
            {/* Optimistic Cyan & Emerald Glow behind Logo */}
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-emerald-500/25 to-cyan-500/25 blur-xl -z-10 scale-110" />
            
            <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl overflow-hidden border border-cyan-500/40 shadow-2xl bg-[var(--bg-canvas)] ring-1 ring-emerald-500/30">
              <img
                src={emblemImage}
                alt="حسون - Trading"
                className="w-full h-full object-cover rounded-3xl"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>

          <h1 className="text-2xl font-black tracking-tight text-[var(--text-primary)]">
            حسون - Trading
          </h1>
          <p className="text-[10px] sm:text-[11px] text-cyan-400 tracking-widest mt-1 font-bold uppercase font-mono">
            HASSONE TRADING ▪ VIP SYSTEMS
          </p>
        </div>

        {/* Kickout / Security Notification */}
        {kickoutMessage && (
          <div className="mb-4 p-3 rounded-xl bg-[var(--warning-soft)] border border-[var(--warning)] text-xs text-[var(--warning)] flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-[var(--warning)] shrink-0 mt-0.5" />
            <span>{kickoutMessage}</span>
          </div>
        )}

        {/* Form Fields */}
        <div className="space-y-3.5">
          <div>
            <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1.5">
              كود تفعيل VIP أو كلمة المرور
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                disabled={loading || secondsRemaining > 0}
                placeholder="HASSONE-VIP-... أو كلمة المرور"
                className="w-full h-12 pr-10 pl-10 rounded-2xl bg-[var(--bg-input)] border-2 border-[var(--border-default)] text-[var(--text-primary)] text-sm font-mono focus:border-[var(--accent-tech)] focus:ring-1 focus:ring-[var(--accent-tech)] outline-none transition-all placeholder:text-[var(--text-muted)] text-center disabled:opacity-50"
                autoFocus
              />
              <KeyRound className="w-4 h-4 text-[var(--text-muted)] absolute right-3.5 top-1/2 -translate-y-1/2" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Subtext info row */}
          <div className="flex items-center justify-between text-[11px] font-bold px-1">
            <span className="text-[var(--success)]">حماية مشددة نشطة</span>
            <span className="text-[var(--text-secondary)]">
              محاولات متبقية: {MAX_ATTEMPTS - failedAttempts}
            </span>
          </div>

          {error && (
            <div className="p-2.5 rounded-xl bg-[var(--danger-soft)] border border-[var(--danger)] text-xs text-[var(--danger)] flex items-start gap-1.5">
              <AlertCircle className="w-4 h-4 text-[var(--danger)] shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {secondsRemaining > 0 && (
            <div className="p-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)] text-center space-y-0.5">
              <span className="text-[11px] text-[var(--text-secondary)] block">النظام مقفل مؤقتاً:</span>
              <span className="font-mono font-bold text-[var(--warning)] text-base">{secondsRemaining} ثانية</span>
            </div>
          )}

          {/* Main CTA Button */}
          <div className="pt-2">
            <button
              onClick={handleLogin}
              disabled={loading || secondsRemaining > 0}
              className="btn-primary w-full h-12 text-sm text-[var(--text-on-burgundy)] shadow-md disabled:opacity-50"
            >
              <Lock className="w-4 h-4 text-[var(--text-on-burgundy)]" />
              <span>{loading ? 'جاري الدخول...' : 'دخول منصة حسون - Trading VIP'}</span>
            </button>
          </div>
        </div>

        {/* Subscription Link for @bker_38 */}
        <div className="mt-6 pt-3 border-t border-[var(--border-subtle)] flex items-center justify-center">
          <a
            href="https://t.me/bker_38"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[var(--bg-input)] hover:bg-[var(--bg-hover)] border border-[var(--gold-border)]/40 hover:border-[var(--gold-primary)] text-[var(--text-secondary)] hover:text-[var(--gold-primary)] transition-all text-xs group shadow-xs cursor-pointer"
          >
            <div className="w-5 h-5 rounded-full bg-[var(--accent-burgundy)] text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-110 transition-transform">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-2.5 h-2.5 fill-current">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.19-.08-.05-.19-.02-.27 0-.12.03-1.99 1.27-5.62 3.72-.53.36-1.01.54-1.44.53-.47-.01-1.38-.27-2.06-.49-.83-.27-1.49-.42-1.43-.88.03-.24.37-.49 1.02-.75 3.99-1.74 6.66-2.88 7.99-3.44 3.82-1.6 4.61-1.88 5.13-1.89.11 0 .37.03.54.17.14.12.18.28.2.45-.02.07-.02.13-.04.22z" />
              </svg>
            </div>
            <span className="text-[11px] text-[var(--text-muted)] group-hover:text-[var(--text-secondary)]">
              للاشتراك:
            </span>
            <span className="font-mono font-bold text-[var(--gold-primary)]" dir="ltr">
              @bker_38
            </span>
          </a>
        </div>
      </div>
    </div>
  );
};
