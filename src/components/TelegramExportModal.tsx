import React, { useState } from 'react';
import { X, Copy, Check, Send, Sparkles } from 'lucide-react';
import { SignalItem, MartingaleType } from '../types';
import { formatAreenDecoratedTelegram, formatSingleSignalMono } from '../utils/formatter';
import { ModalWrapper } from './ModalWrapper';

interface TelegramExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  signals: SignalItem[];
  martingale: MartingaleType;
}

export const TelegramExportModal: React.FC<TelegramExportModalProps> = ({
  isOpen,
  onClose,
  signals,
  martingale,
}) => {
  const [copied, setCopied] = useState(false);
  const [style, setStyle] = useState<'areen_mono' | 'standard' | 'minimal'>('areen_mono');

  const generateFormattedText = () => {
    if (signals.length === 0) return 'لا توجد صفقات حالياً';

    const firstTf = signals[0]?.timeframe || 'M1';

    if (style === 'areen_mono') {
      return formatAreenDecoratedTelegram(
        signals.map((s) => ({ ...s, strategyBadge: s.strategyName })),
        {
          timeframe: firstTf,
          martingale,
          utcOffset: '+03:00',
          strategyName: 'استراتيجية حسون Breakout (Golden Trend & Volume)',
        }
      );
    }

    if (style === 'minimal') {
      return signals.map(formatSingleSignalMono).join('\n');
    }

    if (style === 'standard') {
      const header = `⧉ HASSONE TRADING SIGNALS (${signals.length} TRADES - ${firstTf})\n`;
      const body = signals
        .map((s) => {
          const pairClean = s.pair.replace('/', '').replace(' OTC', '').replace('-OTC', '');
          return `${firstTf};${pairClean}•${s.timeStr};${s.direction}`;
        })
        .join('\n');
      const footer = `\n${martingale} • OTC`;
      return header + body + footer;
    }

    return formatAreenDecoratedTelegram(signals, { timeframe: firstTf, martingale });
  };

  const textToCopy = generateFormattedText();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = textToCopy;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleTelegramShare = () => {
    const encoded = encodeURIComponent(textToCopy);
    window.open(`https://t.me/share/url?url=&text=${encoded}`, '_blank');
  };

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} maxWidth="max-w-md">
      <div className="p-4 sm:p-5 flex flex-col max-h-[88vh] text-right" dir="rtl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-[var(--bg-input)] text-[var(--gold-primary)] border border-[var(--gold-border)] shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-[var(--text-primary)]">
                تصدير صفقات حسون - Trading
              </h3>
              <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">
                صيغ مزخرفة جاهزة للنشر الفوري في قنوات التيليجرام
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="إغلاق"
            className="p-1.5 rounded-xl text-[var(--text-muted)] hover:text-white hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Style Selector */}
        <div className="flex items-center gap-1.5 mt-3 text-[11px] overflow-x-auto pb-1 scrollbar-none">
          <span className="text-[var(--text-muted)] shrink-0 font-semibold">التنسيق:</span>
          <button
            type="button"
            onClick={() => setStyle('areen_mono')}
            className={`px-2.5 py-1 rounded-xl font-bold shrink-0 transition-all cursor-pointer ${
              style === 'areen_mono'
                ? 'bg-[var(--gold-primary)] text-[var(--text-on-gold)] shadow-xs'
                : 'bg-[var(--bg-input)] text-[var(--text-secondary)] border border-[var(--border-subtle)] hover:text-[var(--text-primary)]'
            }`}
          >
            👑 مزخرف 𝚄𝚃𝙲 حسون
          </button>
          <button
            type="button"
            onClick={() => setStyle('minimal')}
            className={`px-2.5 py-1 rounded-xl font-bold shrink-0 transition-all cursor-pointer ${
              style === 'minimal'
                ? 'bg-[var(--gold-primary)] text-[var(--text-on-gold)] shadow-xs'
                : 'bg-[var(--bg-input)] text-[var(--text-secondary)] border border-[var(--border-subtle)] hover:text-[var(--text-primary)]'
            }`}
          >
            ❒ قائمة مونو فقط
          </button>
          <button
            type="button"
            onClick={() => setStyle('standard')}
            className={`px-2.5 py-1 rounded-xl font-bold shrink-0 transition-all cursor-pointer ${
              style === 'standard'
                ? 'bg-[var(--gold-primary)] text-[var(--text-on-gold)] shadow-xs'
                : 'bg-[var(--bg-input)] text-[var(--text-secondary)] border border-[var(--border-subtle)] hover:text-[var(--text-primary)]'
            }`}
          >
            📋 كوتيكس قياسي
          </button>
        </div>

        {/* Text Preview Box */}
        <div className="mt-3 flex-1 overflow-y-auto min-h-[160px] max-h-[280px]">
          <pre className="p-3.5 rounded-2xl bg-[var(--bg-input)] border border-[var(--border-subtle)] text-[var(--gold-primary)] text-xs font-mono leading-relaxed whitespace-pre-wrap select-all text-left dir-ltr">
            {textToCopy}
          </pre>
        </div>

        {/* Footer Actions */}
        <div className="grid grid-cols-2 gap-2 sm:gap-2.5 mt-3 pt-3 border-t border-[var(--border-subtle)]">
          <button
            type="button"
            onClick={handleCopy}
            className="py-2.5 sm:py-3 px-3 rounded-2xl bg-[var(--bg-input)] hover:bg-[var(--bg-hover)] text-[var(--gold-primary)] border border-[var(--gold-border)] font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-98 shadow-xs"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-[var(--success)]" />
                <span className="text-[var(--success)]">تم النسخ!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-[var(--gold-primary)]" />
                <span>نسخ إلى الحافظة</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleTelegramShare}
            className="py-2.5 sm:py-3 px-3 rounded-2xl bg-[var(--accent-burgundy)] hover:bg-[var(--accent-burgundy-deep)] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md active:scale-98"
          >
            <Send className="w-4 h-4" />
            <span>مشاركة في تيليجرام</span>
          </button>
        </div>
      </div>
    </ModalWrapper>
  );
};
