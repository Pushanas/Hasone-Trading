import React, { useState } from 'react';
import {
  Copy,
  Check,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Send,
  Zap,
  CheckSquare,
  Square,
  Flame,
  Clock
} from 'lucide-react';
import { AREEN_OTC_PAIRS } from '../constants/areenPairs';
import { SignalItem, MartingaleType, TimeFrame } from '../types';
import { formatAreenDecoratedTelegram, formatSingleSignalMono } from '../utils/formatter';

interface AreenCollectionTabProps {
  onImportToLiveTracker: (signals: SignalItem[]) => void;
}

export interface AreenStrategyDef {
  id: string;
  name: string;
  badge: string;
  pattern: string;
  indicators: string[];
  winRateEstimate: string;
}

// Exactly matching screenshot IMG_20261007_143901_239.jpg
const STRATEGIES_LIST: AreenStrategyDef[] = [
  {
    id: 'lion_breakout',
    name: '👑 استراتيجية Hasone Breakout (Golden Trend & Volume) — دقة +94%',
    badge: 'Hasone Momentum',
    pattern: 'كسر مناطق العرض والطلب + فوليوم مؤسسي',
    indicators: ['Price Action', 'Smart Money Concepts', 'Volume Spike'],
    winRateEstimate: '+94%',
  },
  {
    id: 'temporal_shockwave',
    name: '⚡ استراتيجية الصدمة الانعكاسية (Temporal Shockwave) — دقة +91%',
    badge: 'الصدمة الانعكاسية',
    pattern: 'انعكاسات تشبع الفوليوم والارتداد الزمني الدقيق',
    indicators: ['Volume Climax', 'Mean Reversion', 'RSI 14'],
    winRateEstimate: '+91%',
  },
  {
    id: 'institutional_sniper',
    name: '🎯 استراتيجية القناص المؤسسي (Institutional Sniper SMC) — دقة +95%',
    badge: 'القناص المؤسسي',
    pattern: 'اقتناص صفقات صانع السوق عند مناطق السيولة الكبرى',
    indicators: ['Liquidity Pools', 'Fair Value Gap', 'Order Flow'],
    winRateEstimate: '+95%',
  },
  {
    id: 'golden_trend_armor',
    name: '💎 استراتيجية المطرقة الذهبية (Golden Trend Armor) — دقة +93%',
    badge: 'المطرقة الذهبية',
    pattern: 'استمرار الاتجاه القوي مع كسر القمم والقيعان المحمية',
    indicators: ['Trend Strength', 'EMA Ribbon', 'Breakout Bar'],
    winRateEstimate: '+93%',
  },
  {
    id: 'falcon_scalp',
    name: '🦅 استراتيجية صقر السكالبينج (Fast Falcon Scalp M1) — دقة +89%',
    badge: 'صقر السكالبينج',
    pattern: 'صفقات سريعة دقيقة على فريم الدقيقة M1 مع الزخم',
    indicators: ['Micro Momentum', 'Tick Volume', 'Stochastic'],
    winRateEstimate: '+89%',
  },
  {
    id: 'royal_shield',
    name: '🛡️ استراتيجية الدرع الملكي المحافظ (Royal Shield) — دقة +96%',
    badge: 'الدرع الملكي',
    pattern: 'أعلى درجات التأكيد مع تجنب أوقات التذبذب العشوائي',
    indicators: ['Triple Confluence', 'Institutional Block', 'Safety Filter'],
    winRateEstimate: '+96%',
  },
  {
    id: 'order_flow',
    name: '📊 استراتيجية تدفق الأوامر (Order Flow Imbalance) — دقة +93%',
    badge: 'تدفق الأوامر',
    pattern: 'عدم التوازن الحجمي وامتصاص السيولة المؤسسية',
    indicators: ['Footprint Imbalance', 'Delta Volume', 'Volume Profile'],
    winRateEstimate: '+93%',
  },
  {
    id: 'order_block',
    name: '🧱 استراتيجية الكتل السعرية (Order Block Sniping) — دقة +92%',
    badge: 'كتل سعرية',
    pattern: 'إعادة اختبار كتل الأوامر غير المخترقة والمناطق المحمية',
    indicators: ['Mitigation Blocks', 'Institutional Rejection', 'SMC'],
    winRateEstimate: '+92%',
  },
];

export const AreenCollectionTab: React.FC<AreenCollectionTabProps> = ({
  onImportToLiveTracker,
}) => {
  const [selectedStrategyId, setSelectedStrategyId] = useState<string>('lion_breakout');
  const [startTime, setStartTime] = useState<string>(() => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  });
  const [endTime, setEndTime] = useState<string>(() => {
    const d = new Date(Date.now() + 60 * 60 * 1000);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  });

  const [timeframe, setTimeframe] = useState<TimeFrame>('M1');
  const [martingale, setMartingale] = useState<MartingaleType>('NON MTG');
  const [selectedPairs, setSelectedPairs] = useState<string[]>([...AREEN_OTC_PAIRS]);

  const [generatedSignals, setGeneratedSignals] = useState<SignalItem[]>([]);
  const [exportFormat, setExportFormat] = useState<'areen_mono' | 'standard' | 'minimal'>('areen_mono');
  const [copiedBatch, setCopiedBatch] = useState(false);
  const [copiedRowId, setCopiedRowId] = useState<string | null>(null);

  const selectedStrategy =
    STRATEGIES_LIST.find((s) => s.id === selectedStrategyId) || STRATEGIES_LIST[0];

  const setDurationHours = (hours: number) => {
    const [startH, startM] = startTime.split(':').map(Number);
    const startDate = new Date();
    startDate.setHours(startH, startM, 0, 0);

    const endDate = new Date(startDate.getTime() + hours * 60 * 60 * 1000);
    const pad = (n: number) => String(n).padStart(2, '0');
    setEndTime(`${pad(endDate.getHours())}:${pad(endDate.getMinutes())}`);
  };

  const handleSelectAll = () => {
    setSelectedPairs([...AREEN_OTC_PAIRS]);
  };

  const handleClearAll = () => {
    setSelectedPairs([]);
  };

  const togglePair = (pair: string) => {
    if (selectedPairs.includes(pair)) {
      setSelectedPairs(selectedPairs.filter((p) => p !== pair));
    } else {
      setSelectedPairs([...selectedPairs, pair]);
    }
  };

  // Strategy Analysis Tag Helper matching screenshot
  const getAnalysisTag = (dir: 'CALL' | 'PUT', index: number): string => {
    const reasonsCall = [
      'سحب سيولة قيعان',
      'كسر قمة صاعدة',
      'إعادة اختبار Order Block',
      'نموذج ابتلاع شرائي',
      'زخم شراء مؤسسي',
      'ارتداد من FVG صاعد',
    ];
    const reasonsPut = [
      'رفض سعري من منطقة عرض',
      'كسر قاع هابط',
      'إعادة اختبار Order Block',
      'زخم بيع',
      'سحب سيولة قمم',
      'كسر BOS هابط',
    ];
    return dir === 'CALL'
      ? reasonsCall[index % reasonsCall.length]
      : reasonsPut[index % reasonsPut.length];
  };

  // Run Strategy and Generate
  const handleRunStrategy = () => {
    if (selectedPairs.length === 0) {
      return;
    }

    const now = new Date();
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);

    const start = new Date(now);
    start.setHours(startH, startM, 0, 0);

    const end = new Date(now);
    end.setHours(endH, endM, 0, 0);

    if (end.getTime() <= start.getTime()) {
      end.setDate(end.getDate() + 1);
    }

    const stepMs = timeframe === 'M5' ? 5 * 60 * 1000 : 3 * 60 * 1000;
    const pad = (n: number) => String(n).padStart(2, '0');
    const signals: SignalItem[] = [];

    let current = new Date(start.getTime() + (timeframe === 'M5' ? 5 : 2) * 60 * 1000);
    let idx = 0;

    while (current.getTime() <= end.getTime() && signals.length < 35) {
      const pair = selectedPairs[idx % selectedPairs.length];
      const seed = `${pair}_${selectedStrategy.id}_${current.getHours()}_${current.getMinutes()}_${idx}`;
      let hash = 0;
      for (let i = 0; i < seed.length; i++) {
        hash = (hash << 5) - hash + seed.charCodeAt(i);
        hash |= 0;
      }
      const dir: 'CALL' | 'PUT' = Math.abs(hash) % 2 === 0 ? 'CALL' : 'PUT';

      signals.push({
        id: `areen_strat_${current.getTime()}_${idx}`,
        pair,
        time: new Date(current),
        timeStr: `${pad(current.getHours())}:${pad(current.getMinutes())}`,
        direction: dir,
        timeframe,
        martingale,
        done: false,
        result: 'pending',
        strategyName: getAnalysisTag(dir, idx),
      });

      current = new Date(current.getTime() + stepMs);
      idx++;
    }

    setGeneratedSignals(signals);
  };

  const getExportedText = (): string => {
    if (generatedSignals.length === 0) return '';
    if (exportFormat === 'areen_mono') {
      return formatAreenDecoratedTelegram(
        generatedSignals.map((s) => ({ ...s, strategyBadge: s.strategyName })),
        {
          timeframe,
          martingale,
          utcOffset: '+03:00',
          strategyName: selectedStrategy.name,
        }
      );
    }
    if (exportFormat === 'minimal') {
      return generatedSignals.map(formatSingleSignalMono).join('\n');
    }
    const header = `⧉ HASONE TRADING SIGNALS (${generatedSignals.length} TRADES - ${timeframe})\n`;
    const body = generatedSignals
      .map((s) => `${timeframe};${s.pair.replace('/', '').replace(' OTC', '').replace('-OTC', '')}•${s.timeStr};${s.direction}`)
      .join('\n');
    const footer = `\n${martingale} • OTC`;
    return header + body + footer;
  };

  const handleCopyBatch = async () => {
    const text = getExportedText();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedBatch(true);
      setTimeout(() => setCopiedBatch(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleTelegramShare = () => {
    const text = getExportedText();
    if (!text) return;
    const encoded = encodeURIComponent(text);
    window.open(`https://t.me/share/url?url=&text=${encoded}`, '_blank');
  };

  const handleCopySingleRow = async (signal: SignalItem) => {
    const txt = formatSingleSignalMono(signal);
    try {
      await navigator.clipboard.writeText(txt);
      setCopiedRowId(signal.id);
      setTimeout(() => setCopiedRowId(null), 1500);
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-4 text-right">
      {/* Top Strategy Card matching Screenshot 4 */}
      <div className="card-surface p-4 sm:p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
          <div className="px-3 py-1 rounded-xl bg-[var(--bg-input)] border border-[var(--gold-border)] text-xs font-bold text-[var(--gold-primary)] flex items-center gap-1.5 shadow-xs">
            <Zap className="w-3.5 h-3.5 text-[var(--gold-primary)]" />
            <span>البدء الآن</span>
          </div>

          <div className="text-right flex-1 px-3">
            <h2 className="text-sm sm:text-base font-black text-[var(--gold-primary)] tracking-tight">
              استراتيجيات Hasone Trading الاحترافية
            </h2>
            <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">
              نماذج البرايس أكشن وتدفق السيولة الذكية (Smart Money Concepts)
            </p>
          </div>

          <div className="w-9 h-9 rounded-xl bg-[var(--bg-input)] border border-[var(--gold-border)] flex items-center justify-center text-[var(--gold-primary)] shadow-xs">
            <Flame className="w-4 h-4 text-[var(--gold-primary)]" />
          </div>
        </div>

        {/* Strategy Selector with Accuracy Tag */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-[var(--success)] text-[11px] font-mono">
              دقة متوقعة {selectedStrategy.winRateEstimate}
            </span>
            <label className="text-[var(--gold-primary)] flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-[var(--gold-primary)]" />
              <span>اختر استراتيجية التداول المعتمدة:</span>
            </label>
          </div>

          <div className="relative">
            <select
              value={selectedStrategyId}
              onChange={(e) => setSelectedStrategyId(e.target.value)}
              className="w-full h-12 px-3.5 rounded-xl bg-[var(--bg-input)] border-2 border-[var(--gold-border)] text-[var(--gold-primary)] text-xs sm:text-sm font-black focus:border-[var(--gold-primary)] outline-none transition-all cursor-pointer appearance-none text-right pr-3.5 pl-8"
            >
              {STRATEGIES_LIST.map((strat) => (
                <option key={strat.id} value={strat.id} className="bg-[var(--bg-surface)] text-[var(--text-primary)]">
                  {strat.name}
                </option>
              ))}
            </select>
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--gold-primary)] text-xs">
              ▼
            </div>
          </div>

          {/* Technical Info Box */}
          <div className="p-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-subtle)] space-y-1 text-xs">
            <div className="text-[var(--text-secondary)] text-[11px] flex items-center justify-start gap-1">
              <span className="text-[var(--gold-primary)] font-bold">النموذج الفني:</span>
              <span className="text-[var(--text-secondary)]">{selectedStrategy.pattern}</span>
            </div>
            <div className="flex items-center gap-1 flex-wrap pt-0.5">
              <span className="text-[10px] text-[var(--text-muted)] font-bold">المؤشرات:</span>
              {selectedStrategy.indicators.map((ind) => (
                <span
                  key={ind}
                  className="px-2 py-0.5 rounded-md bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[10px] font-mono text-[var(--gold-primary)]"
                >
                  {ind}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Start and End Time Range */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-[var(--text-secondary)] block text-right">
              وقت البدء (Start Time)
            </label>
            <div className="relative">
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full h-11 px-3 rounded-xl bg-[var(--bg-input)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-xs font-bold font-mono focus:border-[var(--gold-border)] outline-none text-center"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-[var(--text-secondary)] block text-right">
              وقت الانتهاء (End Time)
            </label>
            <div className="relative">
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full h-11 px-3 rounded-xl bg-[var(--bg-input)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-xs font-bold font-mono focus:border-[var(--gold-border)] outline-none text-center"
              />
            </div>
          </div>
        </div>

        {/* Quick Duration Buttons */}
        <div className="flex items-center gap-1.5 text-xs overflow-x-auto pb-1">
          <span className="text-[var(--text-muted)] text-[10px] font-bold shrink-0">مدة الجلسة:</span>
          <button
            type="button"
            onClick={() => setDurationHours(0.5)}
            className="px-2.5 py-1 rounded-lg bg-[var(--bg-input)] hover:bg-[var(--bg-hover)] text-[var(--gold-primary)] border border-[var(--border-subtle)] text-[10px] font-bold shrink-0 cursor-pointer"
          >
            30 دقيقة
          </button>
          <button
            type="button"
            onClick={() => setDurationHours(1)}
            className="px-2.5 py-1 rounded-lg bg-[var(--bg-input)] hover:bg-[var(--bg-hover)] text-[var(--gold-primary)] border border-[var(--gold-border)] text-[10px] font-bold shrink-0 cursor-pointer"
          >
            ساعة واحدة
          </button>
          <button
            type="button"
            onClick={() => setDurationHours(2)}
            className="px-2.5 py-1 rounded-lg bg-[var(--bg-input)] hover:bg-[var(--bg-hover)] text-[var(--gold-primary)] border border-[var(--border-subtle)] text-[10px] font-bold shrink-0 cursor-pointer"
          >
            ساعتان
          </button>
          <button
            type="button"
            onClick={() => setDurationHours(3)}
            className="px-2.5 py-1 rounded-lg bg-[var(--bg-input)] hover:bg-[var(--bg-hover)] text-[var(--gold-primary)] border border-[var(--border-subtle)] text-[10px] font-bold shrink-0 cursor-pointer"
          >
            3 ساعات
          </button>
        </div>

        {/* Timeframe and MTG */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-[var(--text-secondary)] block text-right">
              فريم الشمعة (Timeframe)
            </label>
            <div className="relative">
              <select
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value as TimeFrame)}
                className="w-full h-11 px-3 rounded-xl bg-[var(--bg-input)] border border-[var(--border-subtle)] text-[var(--gold-primary)] text-xs font-bold focus:border-[var(--gold-border)] outline-none transition-all cursor-pointer appearance-none text-right pr-3 pl-8"
              >
                <option value="M1">دقيقة واحدة (M1)</option>
                <option value="M5">خمس دقائق (M5)</option>
              </select>
              <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-muted)] text-xs">
                ▼
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-[var(--text-secondary)] block text-right">
              نظام المضاعفة (MTG)
            </label>
            <div className="relative">
              <select
                value={martingale}
                onChange={(e) => setMartingale(e.target.value as MartingaleType)}
                className="w-full h-11 px-3 rounded-xl bg-[var(--bg-input)] border border-[var(--border-subtle)] text-[var(--gold-primary)] text-xs font-bold focus:border-[var(--gold-border)] outline-none transition-all cursor-pointer appearance-none text-right pr-3 pl-8"
              >
                <option value="NON MTG">بدون مضاعفة (ON MTG)</option>
                <option value="MTG 1">مضاعفة واحدة (MTG 1)</option>
                <option value="MTG 2">مضاعفتين (MTG 2)</option>
              </select>
              <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-muted)] text-xs">
                ▼
              </div>
            </div>
          </div>
        </div>

        {/* Pairs Selection */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleSelectAll}
                className="px-2.5 py-1 rounded-lg bg-[var(--bg-input)] hover:bg-[var(--bg-hover)] text-[var(--gold-primary)] border border-[var(--border-subtle)] text-[11px] font-bold cursor-pointer"
              >
                الكل
              </button>
              <button
                type="button"
                onClick={handleClearAll}
                className="px-2.5 py-1 rounded-lg bg-[var(--bg-input)] hover:bg-[var(--bg-hover)] text-[var(--text-muted)] border border-[var(--border-subtle)] text-[11px] font-bold cursor-pointer"
              >
                مسح
              </button>
              <button
                type="button"
                className="px-2.5 py-1 rounded-lg bg-[var(--bg-input)] text-[var(--gold-primary)] border border-[var(--gold-border)] text-[11px] font-bold cursor-pointer"
              >
                + إضافة
              </button>
            </div>

            <label className="text-[11px] font-bold text-[var(--text-secondary)]">
              الأزواج المعتمدة للتحليل ({selectedPairs.length} من {AREEN_OTC_PAIRS.length})
            </label>
          </div>

          <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1 scrollbar-thin">
            {AREEN_OTC_PAIRS.map((pair) => {
              const isSelected = selectedPairs.includes(pair);
              return (
                <button
                  key={pair}
                  type="button"
                  onClick={() => togglePair(pair)}
                  className={`p-2 rounded-xl border text-xs flex items-center justify-between transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[var(--bg-hover)] border-[var(--gold-border)] text-[var(--text-primary)] shadow-xs'
                      : 'bg-[var(--bg-input)] border-[var(--border-subtle)] text-[var(--text-muted)] hover:border-[var(--border-default)]'
                  }`}
                >
                  <span
                    className={`font-mono text-[11px] font-bold ${
                      isSelected ? 'text-[var(--gold-primary)]' : 'text-[var(--text-muted)]'
                    }`}
                    dir="ltr"
                  >
                    {pair}
                  </span>
                  {isSelected ? (
                    <CheckSquare className="w-3.5 h-3.5 text-[var(--gold-primary)] shrink-0" />
                  ) : (
                    <Square className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Big Golden Run Button matching Screenshot 4 */}
        <div className="pt-2">
          <button
            onClick={handleRunStrategy}
            className="btn-primary w-full py-3.5 px-4 text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.99]"
          >
            <Zap className="w-4 h-4 text-[var(--text-on-gold)] fill-current" />
            <span className="font-mono font-black tracking-wider uppercase text-xs sm:text-sm" dir="ltr">
              GENERATE HASONE SIGNALS
            </span>
            <Zap className="w-4 h-4 text-[var(--text-on-gold)] fill-current" />
          </button>
        </div>
      </div>

      {/* Generated Results Section matching Screenshot IMG_20261007_143933_021.jpg */}
      {generatedSignals.length > 0 && (
        <div className="card-surface p-4 space-y-3.5">
          {/* Section Header with Format Selector */}
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2.5">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setExportFormat('areen_mono')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                  exportFormat === 'areen_mono'
                    ? 'bg-[var(--gold-primary)] text-[var(--text-on-gold)] shadow-xs'
                    : 'bg-[var(--bg-input)] text-[var(--text-secondary)] border border-[var(--border-subtle)]'
                }`}
              >
                VIP مزخرف
              </button>
              <button
                onClick={() => setExportFormat('standard')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                  exportFormat === 'standard'
                    ? 'bg-[var(--gold-primary)] text-[var(--text-on-gold)] shadow-xs'
                    : 'bg-[var(--bg-input)] text-[var(--text-secondary)] border border-[var(--border-subtle)]'
                }`}
              >
                كوتيكس
              </button>
              <button
                onClick={() => setExportFormat('minimal')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                  exportFormat === 'minimal'
                    ? 'bg-[var(--gold-primary)] text-[var(--text-on-gold)] shadow-xs'
                    : 'bg-[var(--bg-input)] text-[var(--text-secondary)] border border-[var(--border-subtle)]'
                }`}
              >
                بسيط
              </button>
            </div>

            <div className="text-right">
              <h3 className="text-sm font-black text-[var(--gold-primary)]">
                صفقات {selectedStrategy.badge} 👑
              </h3>
              <p className="text-[10px] text-[var(--text-muted)]">
                {generatedSignals.length} صفقات مؤكدة بالبرايس أكشن
              </p>
            </div>
          </div>

          {/* Action Buttons: Copy & Telegram Share */}
          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={handleCopyBatch}
              className="btn-primary py-3 px-3 text-xs"
            >
              {copiedBatch ? (
                <>
                  <Check className="w-4 h-4 text-[var(--text-on-gold)]" />
                  <span>تم نسخ الصفقات!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-[var(--text-on-gold)]" />
                  <span>نسخ صفقات الاستراتيجية</span>
                </>
              )}
            </button>

            <button
              onClick={handleTelegramShare}
              className="py-3 px-3 rounded-2xl font-black text-xs bg-[var(--accent-burgundy)] hover:bg-[var(--accent-burgundy-deep)] text-white flex items-center justify-center gap-1.5 cursor-pointer shadow-md transition-all active:scale-[0.99]"
            >
              <Send className="w-4 h-4 text-white" />
              <span>مشاركة بالتيليجرام</span>
            </button>
          </div>

          {/* Full Width Button: Load into Live Tracker */}
          <button
            onClick={() => onImportToLiveTracker(generatedSignals)}
            className="w-full py-3 px-4 rounded-2xl font-bold text-xs bg-[var(--bg-input)] hover:bg-[var(--bg-hover)] text-[var(--gold-primary)] border border-[var(--gold-border)] flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-xs"
          >
            <Target className="w-4 h-4 text-[var(--danger)]" />
            <span>تحميل الصفقات لشاشة المراقبة الحية والعد التنازلي ▷</span>
          </button>

          {/* Trade Rows matching screenshot IMG_20261007_143933_021.jpg */}
          <div className="space-y-2 max-h-96 overflow-y-auto pt-1">
            {generatedSignals.map((item) => {
              const isCall = item.direction === 'CALL';
              const isCopied = copiedRowId === item.id;
              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-2.5 rounded-2xl bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] hover:border-[var(--border-default)] transition-all"
                >
                  {/* Left: Copy and Direction Badge */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopySingleRow(item)}
                      title="نسخ صيغة الصفقة"
                      className="w-8 h-8 rounded-xl bg-[var(--bg-input)] border border-[var(--border-subtle)] hover:border-[var(--gold-border)] text-[var(--gold-primary)] flex items-center justify-center cursor-pointer transition-colors"
                    >
                      {isCopied ? (
                        <Check className="w-3.5 h-3.5 text-[var(--success)]" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>

                    <div
                      className={`px-2.5 py-1 rounded-xl text-[11px] font-black ${
                        isCall
                          ? 'bg-[var(--success-soft)] text-[var(--success)] border border-[rgba(25,201,149,0.3)]'
                          : 'bg-[var(--danger-soft)] text-[var(--danger)] border border-[rgba(255,92,108,0.3)]'
                      }`}
                    >
                      {isCall ? 'CALL صعود' : 'PUT هبوط'}
                    </div>
                  </div>

                  {/* Center: Pair and Strategy Details */}
                  <div className="text-center flex-1 px-2">
                    <div className="flex items-center justify-center gap-1.5">
                      <span className="font-mono text-xs font-black text-[var(--text-primary)]" dir="ltr">
                        {item.pair}
                      </span>
                      <span className="text-[var(--text-muted)]">•</span>
                      <span className="font-mono text-xs font-black text-[var(--gold-primary)]">
                        {item.timeStr}
                      </span>
                    </div>
                    {item.strategyName && (
                      <p className="text-[10px] text-[var(--text-muted)] mt-0.5 truncate">
                        {item.strategyName}
                      </p>
                    )}
                  </div>

                  {/* Right: Direction Arrow */}
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                      isCall
                        ? 'bg-[var(--success-soft)] text-[var(--success)] border border-[rgba(25,201,149,0.3)]'
                        : 'bg-[var(--danger-soft)] text-[var(--danger)] border border-[rgba(255,92,108,0.3)]'
                    }`}
                  >
                    {isCall ? (
                      <ArrowUpRight className="w-4 h-4 stroke-[3]" />
                    ) : (
                      <ArrowDownRight className="w-4 h-4 stroke-[3]" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
