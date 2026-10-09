import React from 'react';
import { AlertTriangle, Check } from 'lucide-react';
import { ModalWrapper } from './ModalWrapper';

interface RiskConsentModalProps {
  isOpen: boolean;
  onAccept: () => void;
}

export const RiskConsentModal: React.FC<RiskConsentModalProps> = ({ isOpen, onAccept }) => {
  return (
    <ModalWrapper isOpen={isOpen} onClose={onAccept} maxWidth="max-w-md">
      <div className="p-4 sm:p-5 text-right flex flex-col space-y-3.5" dir="rtl">
        {/* Header Icon */}
        <div className="flex items-center gap-3 border-b border-[var(--border-subtle)] pb-3">
          <div className="w-10 h-10 rounded-2xl bg-[var(--bg-input)] border border-[var(--gold-border)] flex items-center justify-center text-[var(--gold-primary)] shrink-0 shadow-xs">
            <AlertTriangle className="w-5 h-5 text-[var(--gold-primary)]" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-black text-[var(--text-primary)] tracking-tight">
              إقرار وضوابط الاستخدام التقني
            </h2>
            <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">
              منصة Hasone Trading للبرمجيات • اتفاقية البروتوكول التشغيلي
            </p>
          </div>
        </div>

        {/* Operational Guidelines Body */}
        <div className="p-3.5 rounded-2xl bg-[var(--bg-input)] border border-[var(--border-subtle)] space-y-2.5 text-xs text-[var(--text-secondary)] leading-relaxed">
          <p>
            تداول الخيارات الرقمية وأسواق الـ <bdi className="font-mono font-bold text-[var(--text-primary)]">OTC</bdi> ينطوي على تقلبات سعرية سريعة تتطلب انضباطاً صارماً بإدارة رأس المال.
          </p>
          <ul className="space-y-1.5 list-disc list-inside text-[11px] text-[var(--text-muted)]">
            <li>
              الخوارزميات البرمجية هي <strong className="text-[var(--text-primary)]">أدوات إحصائية وتحليلية</strong> مبنية على نماذج السيولة والبرايس أكشن.
            </li>
            <li>
              يجب الالتزام التام بنسب التحوط المحسوبة في حاسبة رأس المال وعدم التداول العشوائي.
            </li>
            <li>
              أنت المتحكم الكامل في تنفيذ الصفقات وإدارة الحساب الخاص بك.
            </li>
          </ul>
        </div>

        {/* Acceptance Button */}
        <div className="pt-1">
          <button
            type="button"
            onClick={onAccept}
            className="btn-primary w-full h-11 py-2.5 px-4 text-xs sm:text-sm shadow-md"
          >
            <Check className="w-4 h-4 stroke-[2.5]" />
            <span>الموافقة والدخول إلى المنصة</span>
          </button>
        </div>
      </div>
    </ModalWrapper>
  );
};
