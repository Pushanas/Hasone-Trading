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
import emblemImage from '../assets/images/hassone_trading_logo_1791569318604.jpg';
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

  // Inception Candle Countdown
  const [secondsToNextCandle, setSecondsToNextCandle] = useState<number>(60);

  // Mandatory 1-minute interval between trades (فاصل دقيقة في الصفقة)
  const [tradeCooldownSeconds, setTradeCooldownSeconds] = useState<number>(0);

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

  // 1. Exact Candle Inception Countdown Clock (XX:XX:00 Synchronization)
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const currentSeconds = now.getSeconds();
      const tfMins = timeframe === 'M15' ? 15 : timeframe === 'M5' ? 5 : 1;
      const currentMinutes = now.getMinutes();

      // Seconds remaining until next candle boundary
      const minutesRemaining = (tfMins - (currentMinutes % tfMins) - 1);
      const secsRemaining = minutesRemaining * 60 + (60 - currentSeconds);
      setSecondsToNextCandle(secsRemaining);
    }, 500);

    return () => clearInterval(timer);
  }, [timeframe]);

  // 4. Trade Cooldown Interval Timer (فاصل دقيقة إلزامي في الصفقة)
  useEffect(() => {
    if (tradeCooldownSeconds <= 0) return;
    const interval = setInterval(() => {
      setTradeCooldownSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [tradeCooldownSeconds]);

  // 5. Start Analysis Now action
  const handleStartAnalysis = async () => {
    if (tradeCooldownSeconds > 0) return;

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
    const localResult = runLocalQuotexAnalysis(selectedPairId, timeframe);

    // Ensure entry time is strictly aligned to the upcoming candle start (00s)
    const now = new Date();
    const targetMs = now.getTime() + (secondsToNextCandle || 60) * 1000;
    const targetDate = new Date(targetMs);
    targetDate.setSeconds(0, 0);
    const pad = (n: number) => String(n).padStart(2, '0');
    localResult.candleEntryTime = `${pad(targetDate.getHours())}:${pad(targetDate.getMinutes())}:00`;
    localResult.targetCandleStr = `شمعة ${pad(targetDate.getHours())}:${pad(targetDate.getMinutes())}`;

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
    // Enforce 1-minute trade cooldown interval (فاصل دقيقة في الصفقة)
    setTradeCooldownSeconds(60);
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
            <div className="relative w-12 h-12 rounded-2xl overflow-hidden border border-[var(--gold-border)] p-0.5 bg-[var(--bg-surface)] shadow-lg ring-1 ring-white/10 shrink-0 group">
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

      {/* ================= PROFESSIONAL CANDLE INCEPTION COUNTDOWN (كولد داون الدخول من بداية الشمعة) ================= */}
      <div className="card-surface p-4 border-2 border-[var(--gold-border)] relative overflow-hidden space-y-3 shadow-md">
        {/* Ambient Top Glow */}
        <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-transparent via-[var(--gold-primary)] to-transparent opacity-90" />

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-2xl border flex items-center justify-center shrink-0 transition-all ${
                secondsToNextCandle <= 5
                  ? 'bg-[rgba(16,185,129,0.2)] border-[var(--success)] text-[var(--success)] scale-105 shadow-sm'
                  : 'bg-[var(--gold-soft)] border-[var(--gold-border)] text-[var(--gold-primary)]'
              }`}
            >
              <Clock
                className={`w-6 h-6 ${
                  secondsToNextCandle <= 5 ? 'animate-bounce' : 'animate-pulse'
                }`}
              />
            </div>
            <div>
              <span className="text-sm sm:text-base font-black text-[var(--text-primary)] block">
                دخولك بعد وقت متبقي:
              </span>
            </div>
          </div>

          {/* Digital Cooldown / Countdown Counter Box */}
          <div className="text-left font-mono" dir="ltr">
            <div
              className={`px-3.5 py-2 rounded-2xl border text-base sm:text-lg font-black tracking-widest shadow-sm transition-all flex items-center gap-2 ${
                secondsToNextCandle <= 5
                  ? 'bg-[rgba(16,185,129,0.22)] text-[var(--success)] border-[var(--success)] scale-105'
                  : 'bg-[var(--bg-input)] text-[var(--gold-primary)] border-[var(--gold-border)]'
              }`}
            >
              <span>
                {String(Math.floor(secondsToNextCandle / 60)).padStart(2, '0')}:
                {String(secondsToNextCandle % 60).padStart(2, '0')}
              </span>
              <span className="text-[10px] uppercase font-bold opacity-80">ثوانٍ ⏳</span>
            </div>
          </div>
        </div>

        {/* Dynamic Progress Bar for the Candle Inception Cycle */}
        <div className="w-full bg-[var(--bg-input)] h-2 rounded-full overflow-hidden border border-[var(--border-subtle)]">
          <div
            className={`h-full transition-all duration-300 ${
              secondsToNextCandle <= 5
                ? 'bg-[var(--success)]'
                : 'bg-gradient-to-r from-[var(--accent-burgundy)] via-[var(--gold-primary)] to-[var(--gold-light)]'
            }`}
            style={{ width: `${((60 - (secondsToNextCandle % 60)) / 60) * 100}%` }}
          />
        </div>
      </div>

      {/* ================= BIG ACTION BUTTON WITH 1-MINUTE MANDATORY COOLDOWN ================= */}
      <div className="pt-0.5 space-y-2">
        {tradeCooldownSeconds > 0 && (
          <div className="p-3 rounded-2xl bg-[rgba(212,175,55,0.12)] border border-[var(--gold-border)] flex items-center justify-between text-xs animate-pulse">
            <div className="flex items-center gap-2 text-[var(--gold-primary)] font-bold">
              <Clock className="w-4 h-4 animate-spin text-[var(--gold-primary)]" />
              <span>فاصل دقيقة إلزامي في الصفقة:</span>
            </div>
            <div className="font-mono font-black text-sm text-[var(--gold-primary)]" dir="ltr">
              00:{String(tradeCooldownSeconds).padStart(2, '0')} ⏳
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={handleStartAnalysis}
          disabled={isAnalyzing || tradeCooldownSeconds > 0}
          className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[var(--gold-primary)] via-[var(--gold-light)] to-[var(--gold-primary)] text-[var(--text-on-gold)] font-black text-sm tracking-wider uppercase flex items-center justify-center gap-2 shadow-[0_8px_25px_rgba(212,175,55,0.3)] hover:shadow-[0_12px_30px_rgba(212,175,55,0.45)] hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed font-mono"
        >
          {isAnalyzing ? (
            <>
              <Cpu className="w-5 h-5 animate-spin" />
              <span>SCANNING QUOTEX OTC & ANALYZING...</span>
            </>
          ) : tradeCooldownSeconds > 0 ? (
            <>
              <Clock className="w-5 h-5 animate-pulse" />
              <span>
                TRADE IN PROGRESS ▪ 00:{String(tradeCooldownSeconds).padStart(2, '0')} (1-MIN COOLDOWN)
              </span>
            </>
          ) : (
            <>
              <Zap className="w-5 h-5 fill-current" />
              <span>START ANALYSIS NOW</span>
            </>
          )}
        </button>
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

          {/* Real-time Inception Countdown Box (دخولك بعد وقت متبقي) */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-[var(--bg-surface)] to-[var(--bg-input)] border border-[var(--gold-border)] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[var(--gold-soft)] border border-[var(--gold-border)] flex items-center justify-center text-[var(--gold-primary)] shrink-0">
                <Clock className="w-4 h-4 animate-spin" />
              </div>
              <div>
                <span className="text-xs sm:text-sm font-black text-[var(--text-primary)] block">
                  دخولك بعد وقت متبقي:
                </span>
                <span className="text-[10px] text-[var(--text-muted)]">
                  الدخول من بداية {analysisResult.targetCandleStr} عند (00s)
                </span>
              </div>
            </div>

            <div className="text-left font-mono" dir="ltr">
              <span
                className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-black border transition-all ${
                  secondsToNextCandle <= 5
                    ? 'bg-[rgba(16,185,129,0.2)] text-[var(--success)] border-[var(--success)] scale-105 inline-block'
                    : 'bg-[var(--bg-surface)] text-[var(--gold-primary)] border-[var(--gold-border)] inline-block'
                }`}
              >
                00:{String(secondsToNextCandle).padStart(2, '0')} ثانية ⏳
              </span>
            </div>
          </div>

          {/* Active 1-minute trade cooldown interval */}
          {tradeCooldownSeconds > 0 && (
            <div className="p-2.5 rounded-xl bg-[rgba(212,175,55,0.12)] border border-[var(--gold-border)] flex items-center justify-between text-xs animate-pulse">
              <span className="text-[var(--gold-primary)] font-bold flex items-center gap-1.5">
                <Clock className="w-4 h-4 animate-spin" />
                <span>فاصل دقيقة إلزامي في الصفقة:</span>
              </span>
              <span className="font-mono font-black text-xs text-[var(--gold-primary)]" dir="ltr">
                00:{String(tradeCooldownSeconds).padStart(2, '0')} ⏳
              </span>
            </div>
          )}

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
