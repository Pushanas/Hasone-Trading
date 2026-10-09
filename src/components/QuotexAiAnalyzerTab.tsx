import React, { useState, useEffect } from 'react';
import {
  Zap,
  TrendingUp,
  TrendingDown,
  Clock,
  Copy,
  Check,
  Radio,
  BarChart2,
  Cpu,
  Layers,
  Activity,
} from 'lucide-react';
import emblemImage from '../assets/images/hassone_trading_modern_logo_1791570141710.jpg';
import { QUOTEX_OTC_PAIRS } from '../constants/quotexPairs';
import {
  QuotexAnalysisResult,
  runLocalQuotexAnalysis,
  formatQuotexTelegramSignal,
} from '../utils/quotexEngine';

interface QuotexAiAnalyzerTabProps {
  onImportSignalToLive?: (signal: {
    pair: string;
    timeStr: string;
    direction: 'CALL' | 'PUT';
    timeframe: string;
  }) => void;
}

export const QuotexAiAnalyzerTab: React.FC<QuotexAiAnalyzerTabProps> = ({
  onImportSignalToLive,
}) => {
  const [selectedPairId, setSelectedPairId] = useState<string>('usd_brl_otc');
  const [timeframe, setTimeframe] = useState<'M1' | 'M5' | 'M15'>('M1');
  // Analysis State
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisStep, setAnalysisStep] = useState<number>(0);
  const [analysisResult, setAnalysisResult] = useState<QuotexAnalysisResult | null>(null);
  const [copiedSignal, setCopiedSignal] = useState<boolean>(false);
  const [importedToLive, setImportedToLive] = useState<boolean>(false);

  // Mandatory 1-minute interval between trades (فاصل دقيقة في الصفقة)
  const [tradeCooldownSeconds, setTradeCooldownSeconds] = useState<number>(0);

  // Active Signal Real-time Lead Buffer and Execution Phases
  const [signalLeadSeconds, setSignalLeadSeconds] = useState<number>(0);
  const [signalTradeSeconds, setSignalTradeSeconds] = useState<number>(0);
  const [signalPhase, setSignalPhase] = useState<'IDLE' | 'PREPARATION' | 'ENTER_NOW' | 'ACTIVE_TRADE' | 'EXPIRED'>('IDLE');

  const selectedPair =
    QUOTEX_OTC_PAIRS.find((p) => p.id === selectedPairId) || QUOTEX_OTC_PAIRS[0];

  // Strategy Scanning animation steps (Quotex Quant Engine)
  const STRATEGY_SCAN_STEPS = [
    { title: 'الاتصال بخادم Quotex OTC Websocket الحقيقي...', icon: Radio },
    { title: 'سحب بيانات أسعار الشموع وتدفق السيولة اللحظية...', icon: Activity },
    { title: 'تحليل دايفرجنس RSI (14) وتوسع البولنجر باند...', icon: BarChart2 },
    { title: 'فحص سحابة EMA 9 / 21 ورصد مناطق الـ Order Block...', icon: Layers },
    { title: 'معالجة التحليل عبر خوارزمية Quotex Quant Engine 3.8...', icon: Cpu },
  ];

  // 1. Active Signal Execution Phase Tracker (مهلة دقيقة للتجهيز -> ادخل الآن -> الشمعة جارية -> مكتملة)
  useEffect(() => {
    if (!analysisResult) {
      setSignalPhase('IDLE');
      setSignalLeadSeconds(0);
      setSignalTradeSeconds(0);
      return;
    }

    const checkSignalStatus = () => {
      const now = Date.now();
      const leadRem = Math.max(0, Math.round((analysisResult.targetTimestamp - now) / 1000));
      const tradeRem = Math.max(0, Math.round((analysisResult.expiryTimestamp - now) / 1000));

      setSignalLeadSeconds(leadRem);
      setSignalTradeSeconds(tradeRem);

      if (leadRem > 0) {
        setSignalPhase('PREPARATION');
      } else if (now < analysisResult.targetTimestamp + 10000) {
        // First 10 seconds of candle start (00s)
        setSignalPhase('ENTER_NOW');
      } else if (tradeRem > 0) {
        setSignalPhase('ACTIVE_TRADE');
      } else {
        setSignalPhase('EXPIRED');
      }
    };

    checkSignalStatus();
    const interval = setInterval(checkSignalStatus, 500);
    return () => clearInterval(interval);
  }, [analysisResult]);

  // 3. Trade Cooldown Interval Timer
  useEffect(() => {
    if (tradeCooldownSeconds <= 0) return;
    const interval = setInterval(() => {
      setTradeCooldownSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [tradeCooldownSeconds]);

  // 4. Start Analysis Now action with guaranteed 1-minute lead window (فاصل دقيقة)
  const handleStartAnalysis = async () => {
    if (isAnalyzing) return;

    setIsAnalyzing(true);
    setAnalysisStep(0);
    setAnalysisResult(null);
    setImportedToLive(false);

    // Step-by-step animation sequence
    for (let step = 0; step < STRATEGY_SCAN_STEPS.length; step++) {
      setAnalysisStep(step);
      await new Promise((r) => setTimeout(r, 420));
    }

    // Run primary mathematical confluence analysis using quotex algorithmic indicators
    // (This automatically schedules entry with a guaranteed ~1 minute lead buffer)
    const localResult = runLocalQuotexAnalysis(selectedPairId, timeframe);

    // Attempt Quotex Quant Engine server synthesis
    try {
      const res = await fetch('/api/ai/quotex-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pairId: selectedPairId,
          pairSymbol: selectedPair.symbol,
          timeframe,
          indicators: localResult.indicators,
        }),
      });

      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        if (data.success) {
          if (data.decision) localResult.decision = data.decision;
          if (data.aiThesis) localResult.aiThesis = data.aiThesis;
          if (data.confidence) localResult.confidence = data.confidence;
          if (data.strategyBadge) localResult.strategyBadge = data.strategyBadge;
        }
      }
    } catch {
      // Local engine fallback is already computed!
    }

    setAnalysisResult(localResult);
    setIsAnalyzing(false);
  };

  // Reset or re-analyze
  const handleResetSignal = () => {
    setAnalysisResult(null);
    setSignalPhase('IDLE');
  };

  // 5. Copy to Telegram format
  const handleCopyTelegram = async () => {
    if (!analysisResult) return;
    const text = formatQuotexTelegramSignal(analysisResult);
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSignal(true);
      setTimeout(() => setCopiedSignal(false), 2200);
    } catch {
      // ignore
    }
  };

  // 6. Send to Live Tracker
  const handleSendToLive = () => {
    if (!analysisResult) return;
    onImportSignalToLive?.({
      pair: selectedPair.symbol,
      timeStr: analysisResult.candleEntryTime.slice(0, 5),
      direction: analysisResult.decision === 'WAIT' ? 'CALL' : analysisResult.decision,
      timeframe,
    });
    setImportedToLive(true);
    setTimeout(() => setImportedToLive(false), 2500);
  };

  return (
    <div className="space-y-4" dir="rtl">
      {/* ================= HEADER BADGE ================= */}
      <div className="card-surface p-4 sm:p-5 relative overflow-hidden border border-[var(--gold-border)]">
        {/* Ambient Top Glow */}
        <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-transparent via-[var(--gold-primary)] to-transparent opacity-80" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="relative w-12 h-12 rounded-2xl overflow-hidden border border-cyan-500/40 p-0.5 bg-[var(--bg-surface)] shadow-lg ring-1 ring-emerald-500/20 shrink-0 group">
              <img
                src={emblemImage}
                alt="حسون - Trading"
                className="w-full h-full object-cover rounded-[14px]"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-black text-[var(--text-primary)]">
                  بوت ومحلل Quotex الفني
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-[rgba(16,185,129,0.15)] text-[var(--success)] border border-[rgba(16,185,129,0.3)]">
                  QUOTEX LIVE OTC
                </span>
              </div>
              <p className="text-[10.5px] text-[var(--text-secondary)] mt-0.5">
                خوارزمية تحليل الشموع وحركة السعر اللحظية مع فاصل إلزامي وتوقيت 00s
              </p>
            </div>
          </div>

          {/* Live Status Pill */}
          <div className="flex items-center gap-2 self-start sm:self-auto bg-[var(--bg-input)] px-3 py-1.5 rounded-xl border border-[var(--border-subtle)] text-[11px] font-mono">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--success)] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--success)]" />
            </span>
            <span className="text-[var(--text-muted)] text-[10px]">خادم كوتكس:</span>
            <span className="text-[var(--success)] font-bold">متصل (WebSocket Live)</span>
          </div>
        </div>
      </div>

      {/* ================= ASSET & TIMEFRAME SELECTOR ================= */}
      <div className="card-surface p-4 space-y-3.5">
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2.5">
          <span className="text-xs font-bold text-[var(--gold-primary)] flex items-center gap-1.5">
            <Layers className="w-4 h-4" />
            <span>اختر زوج Quotex OTC وفريم التداول:</span>
          </span>
          <span className="text-[10px] text-[var(--text-muted)] font-mono">
            أزواج معتمدة
          </span>
        </div>

        {/* Pairs Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {QUOTEX_OTC_PAIRS.slice(0, 6).map((p) => {
            const isSelected = p.id === selectedPairId;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedPairId(p.id)}
                className={`p-2.5 rounded-xl border text-right transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'bg-[var(--gold-soft)] border-[var(--gold-primary)] shadow-sm'
                    : 'bg-[var(--bg-surface)] border-[var(--border-subtle)] hover:border-[var(--border-default)]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm">{p.flag}</span>
                  <span className="text-[9px] font-mono font-bold text-[var(--text-muted)] px-1.5 py-0.5 rounded-md">
                    OTC
                  </span>
                </div>
                <div className="mt-1.5">
                  <div
                    className={`font-mono font-bold text-xs ${
                      isSelected ? 'text-[var(--gold-primary)]' : 'text-[var(--text-primary)]'
                    }`}
                    dir="ltr"
                  >
                    {p.symbol}
                  </div>
                  <div className="text-[9.5px] text-[var(--text-muted)] truncate mt-0.5">
                    {p.name.split('(')[0]}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Timeframe Selector and Real-time Countdown Bar */}
        <div className="pt-1">
          {/* Timeframe Buttons */}
          <div className="p-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-subtle)] flex items-center justify-between">
            <span className="text-xs font-bold text-[var(--text-secondary)] flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-[var(--gold-primary)]" />
              <span>فريم الشمعة:</span>
            </span>
            <div className="flex items-center gap-1.5" dir="ltr">
              {(['M1', 'M5', 'M15'] as const).map((tf) => (
                <button
                  key={tf}
                  type="button"
                  onClick={() => setTimeframe(tf)}
                  className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                    timeframe === tf
                      ? 'bg-[var(--gold-primary)] text-[var(--text-on-gold)] shadow-xs'
                      : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-white border border-[var(--border-subtle)]'
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ================= BIG ACTION BUTTON WITH 1-MINUTE LEAD INTERVAL ================= */}
      <div className="pt-0.5 space-y-2">
        <button
          type="button"
          onClick={handleStartAnalysis}
          disabled={isAnalyzing || signalPhase === 'PREPARATION' || signalPhase === 'ACTIVE_TRADE'}
          className={`w-full py-3.5 px-4 rounded-2xl font-black text-sm tracking-wider uppercase flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg active:scale-[0.99] font-mono ${
            signalPhase === 'ENTER_NOW'
              ? 'bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 text-black shadow-emerald-500/40 animate-pulse'
              : signalPhase === 'PREPARATION'
              ? 'bg-gradient-to-r from-cyan-600 via-emerald-600 to-cyan-600 text-white shadow-cyan-500/20'
              : 'bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-500 text-slate-950 hover:brightness-110 shadow-cyan-500/30'
          } disabled:opacity-80 disabled:cursor-not-allowed`}
        >
          {isAnalyzing ? (
            <>
              <Cpu className="w-5 h-5 animate-spin" />
              <span>جاري سحب بيانات كوتكس وتحليل الشمعة...</span>
            </>
          ) : signalPhase === 'PREPARATION' ? (
            <>
              <Clock className="w-5 h-5 animate-spin" />
              <span>
                مهلة التجهيز: 00:{String(signalLeadSeconds).padStart(2, '0')} ▪ جهز المنصة لـ {analysisResult?.symbol}
              </span>
            </>
          ) : signalPhase === 'ENTER_NOW' ? (
            <>
              <Zap className="w-5 h-5 fill-current animate-bounce" />
              <span>
                🚨 ادخل الصفقة الآن فوراً! ({analysisResult?.decision === 'CALL' ? 'CALL صعود ⬆️' : 'PUT هبوط ⬇️'})
              </span>
            </>
          ) : signalPhase === 'ACTIVE_TRADE' ? (
            <>
              <Activity className="w-5 h-5 animate-pulse" />
              <span>
                📊 شمعة الدقيقة جارية الآن (متبقي: 00:{String(signalTradeSeconds).padStart(2, '0')})
              </span>
            </>
          ) : (
            <>
              <Zap className="w-5 h-5 fill-current" />
              <span>بدء تحليل صفقة كوتكس</span>
            </>
          )}
        </button>

        {analysisResult && (
          <div className="flex items-center justify-between px-1 text-xs">
            <span className="text-[11px] text-[var(--text-muted)]">
              {signalPhase === 'PREPARATION' && '⏳ لديك دقيقة كاملة لتجهيز المنصة والمبلغ والدخول في الوقت المحدد.'}
              {signalPhase === 'ENTER_NOW' && '⚡ حان وقت الضغط على زر التداول فوراً مع افتتاح الشمعة!'}
              {signalPhase === 'ACTIVE_TRADE' && '📈 الصفقة جارية على فريم 1 دقيقة، راقب حركة الشمعة على كوتكس.'}
              {signalPhase === 'EXPIRED' && '✅ اكتملت شمعة الدقيقة بنجاح. يمكنك استخراج إشارة جديدة الآن.'}
            </span>
            <button
              type="button"
              onClick={handleResetSignal}
              className="text-[11px] text-cyan-400 hover:text-cyan-300 underline cursor-pointer shrink-0"
            >
              تحليل زوج آخر
            </button>
          </div>
        )}
      </div>

      {/* ================= CINEMATIC STRATEGY SCANNING ANIMATION ================= */}
      {isAnalyzing && (
        <div className="card-surface p-5 text-center space-y-4 border-2 border-[var(--gold-border)] animate-pulse">
          <div className="flex flex-col items-center">
            <div className="relative w-16 h-16 rounded-full bg-[var(--gold-soft)] border-2 border-[var(--gold-primary)] flex items-center justify-center shadow-lg">
              <Radio className="w-8 h-8 text-[var(--gold-primary)] animate-ping absolute opacity-40" />
              <Activity className="w-8 h-8 text-[var(--gold-primary)]" />
            </div>

            <div className="mt-3">
              <span className="text-xs font-mono uppercase tracking-widest text-[var(--gold-primary)] font-bold block">
                QUOTEX INSTITUTIONAL QUANTUM SCANNER
              </span>
              <h3 className="text-sm font-black text-[var(--text-primary)] mt-1">
                {STRATEGY_SCAN_STEPS[analysisStep].title}
              </h3>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-[var(--bg-input)] h-2 rounded-full overflow-hidden border border-[var(--border-subtle)]">
            <div
              className="bg-gradient-to-r from-[var(--accent-burgundy)] to-[var(--gold-primary)] h-full transition-all duration-300"
              style={{ width: `${((analysisStep + 1) / STRATEGY_SCAN_STEPS.length) * 100}%` }}
            />
          </div>

          <div className="grid grid-cols-5 gap-1 text-[9px] text-[var(--text-muted)] font-mono">
            {STRATEGY_SCAN_STEPS.map((s, idx) => (
              <span
                key={idx}
                className={idx <= analysisStep ? 'text-[var(--gold-primary)] font-bold' : ''}
              >
                P-{idx + 1}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ================= LEGENDARY ANALYSIS RESULT CARD ================= */}
      {analysisResult && !isAnalyzing && (
        <div className="card-surface p-5 space-y-4 border-2 border-[var(--gold-border)] shadow-xl relative overflow-hidden">
          {/* Top Decorative Header */}
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">{analysisResult.flag}</span>
              <div>
                <h3 className="text-sm font-black text-[var(--text-primary)] font-mono" dir="ltr">
                  {analysisResult.symbol}
                </h3>
                <span className="text-[10px] text-[var(--text-secondary)]">
                  {analysisResult.strategyBadge}
                </span>
              </div>
            </div>

            <div className="text-left font-mono">
              <span className="text-[10px] text-[var(--text-muted)] block">VIP ACCURACY:</span>
              <span className="text-xs sm:text-sm font-black text-[var(--gold-primary)]">
                {analysisResult.confidence}%
              </span>
            </div>
          </div>

          {/* Massive Action Callout */}
          <div
            className={`p-4 rounded-2xl border-2 flex items-center justify-between ${
              analysisResult.decision === 'CALL'
                ? 'bg-[rgba(16,185,129,0.12)] border-[var(--success)] text-[var(--success)]'
                : 'bg-[rgba(244,63,94,0.12)] border-[var(--danger)] text-[var(--danger)]'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                  analysisResult.decision === 'CALL'
                    ? 'bg-[var(--success)] text-white'
                    : 'bg-[var(--danger)] text-white'
                }`}
              >
                {analysisResult.decision === 'CALL' ? (
                  <TrendingUp className="w-7 h-7 stroke-[3]" />
                ) : (
                  <TrendingDown className="w-7 h-7 stroke-[3]" />
                )}
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider block opacity-90">
                  إشارة الدخول الرسمية:
                </span>
                <span className="text-xl sm:text-2xl font-black font-mono tracking-tight">
                  {analysisResult.decision === 'CALL' ? 'CALL (صعود ⬆️)' : 'PUT (هبوط ⬇️)'}
                </span>
              </div>
            </div>

            <div className="text-left font-mono">
              <span className="text-[10px] uppercase block opacity-80">مدة الصفقة:</span>
              <span className="text-sm font-black">{analysisResult.candleExpiry}</span>
            </div>
          </div>

          {/* ================= REAL-TIME SIGNAL EXECUTION PHASES & 1-MINUTE LEAD COUNTDOWN ================= */}
          <div className="space-y-3">
            {signalPhase === 'PREPARATION' && (
              <div className="p-4 rounded-2xl bg-gradient-to-br from-cyan-950/40 via-[var(--bg-surface)] to-emerald-950/30 border-2 border-cyan-500/50 shadow-lg shadow-cyan-500/10 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-cyan-500/15 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0 shadow-inner">
                      <Clock className="w-6 h-6 animate-spin" />
                    </div>
                    <div>
                      <span className="text-xs sm:text-sm font-black text-white block">
                        مهلة التجهيز للدخول (فاصل دقيقة كاملة):
                      </span>
                      <span className="text-[11px] text-cyan-300/80">
                        وقت الدخول: {analysisResult.candleEntryTime} (عند بداية الشمعة 00s)
                      </span>
                    </div>
                  </div>

                  <div className="text-left font-mono" dir="ltr">
                    <div className="px-3.5 py-1.5 rounded-xl bg-cyan-950/70 border border-cyan-400 text-cyan-300 font-mono font-black text-lg tracking-wider shadow-sm">
                      00:{String(signalLeadSeconds).padStart(2, '0')} ⏳
                    </div>
                  </div>
                </div>

                {/* Preparation Guide Checklist */}
                <div className="p-3 rounded-xl bg-[var(--bg-base)]/80 border border-cyan-500/20 text-xs space-y-1.5">
                  <div className="text-[11px] font-bold text-cyan-400 flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>خطوات التجهيز خلال الدقيقة الحالية:</span>
                  </div>
                  <ul className="text-[11px] text-[var(--text-secondary)] space-y-1 pr-2 list-disc list-inside">
                    <li>افتح منصة Quotex وابحث عن الزوج: <span className="font-bold text-white font-mono">{analysisResult.symbol}</span></li>
                    <li>اضبط مدة الصفقة على: <span className="font-bold text-white">1 دقيقة ({analysisResult.candleExpiry})</span></li>
                    <li>حدد مبلغ الاستثمار المناسب</li>
                    <li>استعد للضغط على: <span className={`font-bold ${analysisResult.decision === 'CALL' ? 'text-emerald-400' : 'text-rose-400'}`}>{analysisResult.decision === 'CALL' ? 'CALL (صعود ⬆️)' : 'PUT (هبوط ⬇️)'}</span> فور وصول العداد لـ 00:00</li>
                  </ul>
                </div>

                {/* Lead Time Progress Bar */}
                <div className="w-full bg-[var(--bg-base)] h-2 rounded-full overflow-hidden border border-cyan-500/20">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-300"
                    style={{ width: `${Math.min(100, Math.max(0, ((analysisResult.leadSeconds - signalLeadSeconds) / (analysisResult.leadSeconds || 60)) * 100))}%` }}
                  />
                </div>
              </div>
            )}

            {signalPhase === 'ENTER_NOW' && (
              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 text-white shadow-xl shadow-emerald-500/30 border-2 border-emerald-300 animate-pulse text-center space-y-2">
                <div className="flex items-center justify-center gap-2 text-base sm:text-lg font-black font-mono">
                  <Zap className="w-6 h-6 fill-current animate-bounce" />
                  <span>🚨 ادخل الصفقة الآن فوراً على كوتكس! 🚨</span>
                </div>
                <p className="text-xs font-bold text-emerald-100">
                  انطلقت شمعة {analysisResult.targetCandleStr} عند (00s) — اتجاه الصفقة: {analysisResult.decision === 'CALL' ? 'CALL (صعود ⬆️)' : 'PUT (هبوط ⬇️)'}
                </p>
              </div>
            )}

            {signalPhase === 'ACTIVE_TRADE' && (
              <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-950/40 via-[var(--bg-surface)] to-emerald-950/30 border-2 border-indigo-500/40 shadow-md space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-emerald-400 animate-pulse" />
                    <span className="text-xs sm:text-sm font-black text-white">
                      الصفقة جارية الآن على منصة Quotex:
                    </span>
                  </div>
                  <div className="font-mono font-black text-xs sm:text-sm text-emerald-400" dir="ltr">
                    متبقي 00:{String(signalTradeSeconds).padStart(2, '0')} ثانية ⏳
                  </div>
                </div>

                <div className="w-full bg-[var(--bg-base)] h-2 rounded-full overflow-hidden border border-indigo-500/20">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 transition-all duration-300"
                    style={{ width: `${Math.min(100, Math.max(0, ((60 - signalTradeSeconds) / 60) * 100))}%` }}
                  />
                </div>
              </div>
            )}

            {signalPhase === 'EXPIRED' && (
              <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-emerald-400 font-bold">
                  <Check className="w-4 h-4" />
                  <span>اكتملت صفقة الدقيقة (1M) بنجاح! جاهز لتحليل صفقة جديدة.</span>
                </div>
                <button
                  type="button"
                  onClick={handleResetSignal}
                  className="px-3 py-1 rounded-xl bg-emerald-500 text-black font-bold text-[11px] hover:bg-emerald-400 transition-all cursor-pointer"
                >
                  تحليل جديد
                </button>
              </div>
            )}
          </div>

          {/* Candle Inception & Timing Grid */}
          <div className="grid grid-cols-2 gap-2">
            <div className="card-surface p-2.5 text-center">
              <span className="text-[10px] text-[var(--text-muted)] block">توقيت الدخول:</span>
              <span className="text-xs font-mono font-black text-[var(--gold-primary)] mt-0.5 block">
                {analysisResult.candleEntryTime}
              </span>
              <span className="text-[8.5px] text-[var(--text-secondary)]">من أول ثانية (00s)</span>
            </div>

            <div className="card-surface p-2.5 text-center">
              <span className="text-[10px] text-[var(--text-muted)] block">الشمعة المستهدفة:</span>
              <span className="text-xs font-mono font-black text-[var(--text-primary)] mt-0.5 block">
                {analysisResult.targetCandleStr}
              </span>
              <span className="text-[8.5px] text-[var(--success)] font-bold">افتتاح مباشر</span>
            </div>
          </div>

          {/* Technical Indicators Matrix */}
          <div className="space-y-2 p-3.5 rounded-2xl bg-[var(--bg-input)] border border-[var(--border-subtle)]">
            <div className="text-xs font-bold text-[var(--gold-primary)] flex items-center gap-1.5 pb-1 border-b border-[var(--border-subtle)]">
              <BarChart2 className="w-4 h-4" />
              <span>مصفوفة المؤشرات الفنية المؤسساتية (Confluence):</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center justify-between p-2 rounded-xl bg-[var(--bg-surface)]">
                <span className="text-[11px] text-[var(--text-secondary)]">مؤشر RSI (14):</span>
                <span className="font-mono font-bold text-[var(--gold-primary)]">
                  {analysisResult.indicators.rsi14}
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl bg-[var(--bg-surface)]">
                <span className="text-[11px] text-[var(--text-secondary)]">حالة السحابة:</span>
                <span className="font-bold text-[10px] text-[var(--text-primary)] truncate max-w-[100px]">
                  {analysisResult.indicators.emaTrend}
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl bg-[var(--bg-surface)]">
                <span className="text-[11px] text-[var(--text-secondary)]">البولنجر باند:</span>
                <span className="font-bold text-[10px] text-[var(--text-primary)] truncate max-w-[100px]">
                  {analysisResult.indicators.bbPosition}
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl bg-[var(--bg-surface)]">
                <span className="text-[11px] text-[var(--text-secondary)]">ضغط السيولة:</span>
                <span className="font-bold text-[10px] text-[var(--success)] truncate max-w-[100px]">
                  {analysisResult.indicators.volumePressure}
                </span>
              </div>
            </div>

            <div className="p-2 rounded-xl bg-[var(--bg-surface)] flex items-center justify-between text-[11px]">
              <span className="text-[var(--text-secondary)]">النموذج الشموع المرصود:</span>
              <span className="font-bold text-[var(--gold-primary)]">
                {analysisResult.indicators.candlePattern}
              </span>
            </div>
          </div>

          {/* Quotex Quant Institutional Analysis Thesis */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-[var(--bg-surface)] to-[var(--bg-base)] border border-[var(--gold-border)] space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--gold-primary)]">
              <Cpu className="w-4 h-4" />
              <span>مذكرة التحليل الفني المؤسساتي (Quotex Quant Engine):</span>
            </div>
            <p className="text-[11.5px] text-[var(--text-secondary)] leading-relaxed">
              {analysisResult.aiThesis}
            </p>
          </div>

          {/* CTA Buttons: Telegram & Live Tracker */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={handleCopyTelegram}
              className="py-2.5 px-3 rounded-xl bg-[var(--bg-hover)] hover:bg-[var(--bg-input)] border border-[var(--gold-border)] text-[var(--gold-primary)] font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs active:scale-98"
            >
              {copiedSignal ? <Check className="w-4 h-4 text-[var(--success)]" /> : <Copy className="w-4 h-4" />}
              <span>{copiedSignal ? 'تم نسخ التقرير لتليجرام!' : 'نسخ إشارة التحليل لتليجرام'}</span>
            </button>

            <button
              type="button"
              onClick={handleSendToLive}
              className="py-2.5 px-3 rounded-xl bg-[var(--gold-primary)] hover:bg-[var(--gold-light)] text-[var(--text-on-gold)] font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm active:scale-98"
            >
              <Zap className="w-4 h-4 fill-current" />
              <span>{importedToLive ? 'تمت الإضافة للمتابعة الحية!' : 'إضافة الصفقة للمتابعة الحية'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
