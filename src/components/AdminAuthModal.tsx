import React, { useState } from 'react';
import { Lock, Shield, KeyRound, AlertCircle, X } from 'lucide-react';
import { ModalWrapper } from './ModalWrapper';

interface AdminAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (token: string) => void;
}

export const AdminAuthModal: React.FC<AdminAuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = password.trim();
    if (!clean) {
      setError('يرجى إدخال كلمة المرور السرية للإدارة');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: clean }),
      });
      const data = await res.json();

      if (res.ok && data.success && data.token) {
        setPassword('');
        onSuccess(data.token);
      } else {
        setError(data.error || 'كلمة المرور غير صحيحة');
      }
    } catch {
      setError('حدث خطأ أثناء الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} maxWidth="max-w-sm">
      <div className="p-4 sm:p-5 text-right flex flex-col" dir="rtl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-[var(--bg-input)] text-[var(--gold-primary)] border border-[var(--gold-border)] shadow-xs">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-[var(--gold-primary)]">
                الوصول الإداري المحمي
              </h3>
              <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">
                نظام إدارة الأكواد والتحكم بالأجهزة
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

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
          <div>
            <label className="block text-[11px] font-bold text-[var(--text-secondary)] mb-1.5">
              كلمة مرور الإدارة:
            </label>
            <div className="relative">
              <input
                type="password"
                placeholder="أدخل كلمة مرور الإدارة السرية..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="w-full h-11 pr-10 pl-3 rounded-xl bg-[var(--bg-input)] border border-[var(--border-subtle)] text-[var(--text-primary)] font-mono text-center text-sm focus:outline-none focus:border-[var(--gold-border)] transition-all"
                autoFocus
              />
              <KeyRound className="w-4 h-4 text-[var(--text-muted)] absolute right-3.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          {error && (
            <div className="p-2.5 rounded-xl bg-[var(--danger-soft)] border border-[var(--danger)] text-xs text-[var(--danger)] flex items-start gap-1.5">
              <AlertCircle className="w-4 h-4 text-[var(--danger)] shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="pt-1">
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full h-11 text-xs sm:text-sm shadow-md disabled:opacity-50"
            >
              <Lock className="w-4 h-4 text-white" />
              <span>{loading ? 'جاري التحقق...' : 'دخول لوحة إدارة الأكواد'}</span>
            </button>
          </div>
        </form>
      </div>
    </ModalWrapper>
  );
};
