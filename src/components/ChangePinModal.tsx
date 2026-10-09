import React, { useState } from 'react';
import { X, KeyRound, Check, ShieldAlert } from 'lucide-react';
import { updateMasterPassword } from '../utils/crypto';
import { ModalWrapper } from './ModalWrapper';

interface ChangePinModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChangePinModal: React.FC<ChangePinModalProps> = ({ isOpen, onClose }) => {
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: 'error' | 'success' } | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPin) {
      setMsg({ text: 'يرجى إدخال كلمة المرور الحالية لتأكيد الهوية', type: 'error' });
      return;
    }
    if (!newPin || newPin.trim().length < 4) {
      setMsg({ text: 'يجب أن تكون كلمة المرور الجديدة 4 خانات على الأقل', type: 'error' });
      return;
    }
    if (newPin !== confirmPin) {
      setMsg({ text: 'كلمة المرور الجديدة وتأكيدها غير متطابقين', type: 'error' });
      return;
    }

    setLoading(true);
    setMsg(null);

    const result = await updateMasterPassword(currentPin, newPin);
    setLoading(false);

    if (!result.success) {
      setMsg({ text: result.error || 'فشل تحديث كلمة المرور', type: 'error' });
    } else {
      setMsg({ text: 'تم تشفير وتحديث كلمة مرور حسون - Trading بنجاح!', type: 'success' });
      setCurrentPin('');
      setNewPin('');
      setConfirmPin('');
      setTimeout(() => {
        onClose();
      }, 1500);
    }
  };

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} maxWidth="max-w-sm">
      <div className="p-4 sm:p-5 text-right flex flex-col" dir="rtl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-[var(--bg-input)] text-[var(--gold-primary)] border border-[var(--gold-border)] shadow-xs">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-[var(--gold-primary)]">
                تغيير رمز أمان حسون - Trading
              </h3>
              <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">
                تحديث التشفير الرقمي والتحكم بالأجهزة
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

        {/* Security Notification Box */}
        <div className="mt-3 p-3 rounded-2xl bg-[var(--bg-input)] border border-[var(--border-subtle)] text-[11px] text-[var(--text-secondary)] leading-relaxed">
          🔒 <b>خاصية الطرد الموحد:</b> فور تغيير كلمة المرور، سيتم إنهاء الجلسة فوراً من كافة الأجهزة المتصلة ويُطلب منها تسجيل الدخول بكلمة المرور الجديدة.
        </div>

        <form onSubmit={handleSave} className="mt-3.5 space-y-3">
          <div>
            <label className="block text-[11px] font-bold text-[var(--text-secondary)] mb-1">
              كلمة المرور الحالية:
            </label>
            <input
              type="password"
              placeholder="أدخل كلمة المرور الحالية لمنصة حسون - Trading..."
              value={currentPin}
              onChange={(e) => setCurrentPin(e.target.value)}
              disabled={loading}
              className="w-full h-11 px-3 rounded-xl bg-[var(--bg-input)] border border-[var(--border-subtle)] text-[var(--text-primary)] font-mono text-center text-sm focus:outline-none focus:border-[var(--gold-border)] transition-all"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[var(--text-secondary)] mb-1">
              كلمة المرور الجديدة:
            </label>
            <input
              type="password"
              placeholder="أدخل كلمة المرور الجديدة (4 خانات فأكثر)..."
              value={newPin}
              onChange={(e) => setNewPin(e.target.value)}
              disabled={loading}
              className="w-full h-11 px-3 rounded-xl bg-[var(--bg-input)] border border-[var(--border-subtle)] text-[var(--text-primary)] font-mono text-center text-sm focus:outline-none focus:border-[var(--gold-border)] transition-all"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[var(--text-secondary)] mb-1">
              تأكيد كلمة المرور الجديدة:
            </label>
            <input
              type="password"
              placeholder="أعد إدخال الكلمة الجديدة للتأكيد..."
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value)}
              disabled={loading}
              className="w-full h-11 px-3 rounded-xl bg-[var(--bg-input)] border border-[var(--border-subtle)] text-[var(--text-primary)] font-mono text-center text-sm focus:outline-none focus:border-[var(--gold-border)] transition-all"
            />
          </div>

          {msg && (
            <div
              className={`p-2.5 rounded-xl text-xs flex items-center gap-1.5 ${
                msg.type === 'error'
                  ? 'bg-[var(--danger-soft)] text-[var(--danger)] border border-[var(--danger)]'
                  : 'bg-[var(--success-soft)] text-[var(--success)] border border-[var(--success)]'
              }`}
            >
              {msg.type === 'error' ? (
                <ShieldAlert className="w-4 h-4 text-[var(--danger)] shrink-0" />
              ) : (
                <Check className="w-4 h-4 text-[var(--success)] shrink-0" />
              )}
              <span>{msg.text}</span>
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full h-11 text-xs sm:text-sm disabled:opacity-50"
            >
              {loading ? 'جاري التحديث...' : 'حفظ كلمة المرور الجديدة'}
            </button>
          </div>
        </form>
      </div>
    </ModalWrapper>
  );
};
