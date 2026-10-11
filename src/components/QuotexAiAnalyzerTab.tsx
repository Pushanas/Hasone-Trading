// src/components/QuotexAiAnalyzerTab.tsx
// Hasone Trading - Flagship Quantitative Manual Analysis Workstation
// Orchestrates pair selection, quantitative confluence execution, live tracking, and diagnostics

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Sparkles,
  Zap,
  TrendingUp,
  Clock,
  Radio,
  BarChart2,
  Cpu,
  Layers,
  Activity,
  ShieldCheck,
  SlidersHorizontal,
  Volume2,
  VolumeX,
  Play,
  RotateCcw,
  CheckCircle2,
  Wifi,
  RefreshCw,
  Info,
  Database,
} from 'lucide-react';
import emblemImage from '../assets/images/hassone_trading_modern_logo_1791570141710.jpg';
import {
  CurrencyPair,
  HASONE_CURRENCY_PAIRS,
  DURATION_OPTIONS,
} from '../constants/hasonePairs';
import {
  HasoneAnalysisResult,
  runHasoneAnalysis,
  SignalType,
} from '../utils/hasoneEngine';
import {
  hasoneWsEngine,
  WebSocketConnectionStatus,
} from '../utils/hasoneWebSocket';
import {
  RecordedTrade,
  TradingStats,
  getHasoneSettings,
  saveHasoneSettings,
  getTradeHistory,
  recordSignalTrade,
  settleTradeResult,
  computeTradingStats,
  HasoneUserSettings,
  triggerServerBackup,
} from '../utils/hasoneTracker';

import { HasonePairDirectory } from './hasone/HasonePairDirectory';
import { HasoneAnalysisCard } from './hasone/HasoneAnalysisCard';
import { HasoneActiveTradeTracker } from './hasone/HasoneActiveTradeTracker';
import { HasoneTradeHistoryTable } from './hasone/HasoneTradeHistoryTable';
import { HasonePerformanceDashboard } from './hasone/HasonePerformanceDashboard';
import { HasoneDiagnosticsModal } from './hasone/HasoneDiagnosticsModal';

interface QuotexAiAnalyzerTabProps {
  onImportSignalToLive?: (signal: {
    pair: string;
    timeStr: string;
    direction: 'CALL' | 'PUT';
    timeframe: string;
  }) => void;
}

type ActiveSubTab = 'analysis' | 'tracker' | 'history' | 'stats' | 'settings';

export const QuotexAiAnalyzerTab: React.FC<QuotexAiAnalyzerTabProps> = ({
  onImportSignalToLive,
}) => {
  // Navigation & Settings State
  const [activeSubTab, setActiveSubTab] = useState<ActiveSubTab>('analysis');
  const [settings, setSettings] = useState<HasoneUserSettings>(() => getHasoneSettings());

  // Pair & Duration Selection
  const [selectedPairId, setSelectedPairId] = useState<string>('eur_usd_otc');
  const [selectedDuration, setSelectedDuration] = useState<string>('1m');

  // Analysis State
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisStepIndex, setAnalysisStepIndex] = useState<number>(0);
  const [analysisResult, setAnalysisResult] = useState<HasoneAnalysisResult | null>(null);
  const [copiedSignal, setCopiedSignal] = useState<boolean>(false);
  const [importedToLive, setImportedToLive] = useState<boolean>(false);

  // Active Trade Tracking & Database
  const [activeTrade, setActiveTrade] = useState<RecordedTrade | null>(null);
  const [tradeHistory, setTradeHistory] = useState<RecordedTrade[]>(() => getTradeHistory());
  const [stats, setStats] = useState<TradingStats>(() => computeTradingStats(getTradeHistory()));

  // WebSocket Real-time Ticker & Status
  const [wsStatus, setWsStatus] = useState<WebSocketConnectionStatus>('CONNECTING');
  const [liveWsPrice, setLiveWsPrice] = useState<number | null>(null);

  // Diagnostics Modal State
  const [isDiagnosticOpen, setIsDiagnosticOpen] = useState<boolean>(false);
  const [diagnosticData, setDiagnosticData] = useState<any>(null);
  const [liveTestResult, setLiveTestResult] = useState<any>(null);
  const [isTestingConnection, setIsTestingConnection] = useState<boolean>(false);

  // Audio Context
  const audioContextRef = useRef<AudioContext | null>(null);

  const selectedPair = useMemo(() => {
    return HASONE_CURRENCY_PAIRS.find((p) => p.id === selectedPairId) || HASONE_CURRENCY_PAIRS[0];
  }, [selectedPairId]);

  // Connect and subscribe to selected pair on WebSocket engine
  useEffect(() => {
    hasoneWsEngine.connect();
    hasoneWsEngine.subscribe(selectedPair.symbol);

    const unsubStatus = hasoneWsEngine.onStatusChange((status) => {
      setWsStatus(status);
    });

    const unsubTick = hasoneWsEngine.onTick((tick) => {
      const cleanTarget = selectedPair.symbol.replace(' OTC', '').toUpperCase();
      const cleanTick = tick.pair.replace(' OTC', '').toUpperCase();
      if (cleanTick === cleanTarget) {
        setLiveWsPrice(tick.price);
      }
    });

    return () => {
      unsubStatus();
      unsubTick();
      hasoneWsEngine.unsubscribe(selectedPair.symbol);
    };
  }, [selectedPair.symbol]);

  // Initial diagnostics load
  const fetchDiagnostics = async () => {
    setIsTestingConnection(true);
    try {
      const [connRes, testRes] = await Promise.allSettled([
        fetch('/api/market/verify-connections'),
        fetch('/api/market/twelvedata-test'),
      ]);

      if (connRes.status === 'fulfilled' && connRes.value.ok) {
        const data = await connRes.value.json();
        setDiagnosticData(data);
      }
      if (testRes.status === 'fulfilled' && testRes.value.ok) {
        const testData = await testRes.value.json();
        setLiveTestResult(testData);
      }
    } catch (err) {
      console.warn('Diagnostics fetch error:', err);
    } finally {
      setIsTestingConnection(false);
    }
  };

  // Audio Signal Beep
  const playSignalSound = (type: SignalType) => {
    if (!settings.soundEnabled) return;
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      const freq = type === 'CALL' ? 880 : type === 'PUT' ? 440 : 550;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);

      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch {}
  };

  // Toggle Favorite Pair
  const toggleFavorite = (pairId: string) => {
    const isFav = settings.favoritePairs.includes(pairId);
    const updated = isFav
      ? settings.favoritePairs.filter((id) => id !== pairId)
      : [...settings.favoritePairs, pairId];
    const newSettings = { ...settings, favoritePairs: updated };
    setSettings(newSettings);
    saveHasoneSettings(newSettings);
  };

  // 9 Stages of Scanning Pipeline
  const SCAN_PIPELINE_STEPS = [
    { title: 'Hasone Trading يقوم بجلب بيانات الزوج من Twelve Data...', icon: Radio },
    { title: 'فحص جودة الشموع واستقرار الاتصال المباشر...', icon: Activity },
    { title: 'تحليل الاتجاه العام (Trend Analyzer) وحركة السيولة...', icon: TrendingUp },
    { title: 'حساب المؤشرات الفنية (RSI, MACD, EMA 9/21/50, Bollinger)...', icon: BarChart2 },
    { title: 'تحليل نماذج الشموع اليابانية وموجات البرايس أكشن...', icon: Layers },
    { title: 'رصد مناطق الدعم والمقاومة وجدران السيولة السعرية...', icon: Cpu },
    { title: 'حساب القوة الرقمية وتحديد دقة الإشارة (Signal Score)...', icon: Zap },
    { title: 'تشغيل درع الحماية Hasone Royal Guard لكبح المخاطر...', icon: ShieldCheck },
    { title: 'تجهيز القرار الفني وشرح الذكاء الاصطناعي بالعربية...', icon: Sparkles },
  ];

  // Execute Manual Analysis
  const handleExecuteAnalysis = async () => {
    if (isAnalyzing) return;
    setIsAnalyzing(true);
    setAnalysisStepIndex(0);
    setAnalysisResult(null);
    setCopiedSignal(false);
    setImportedToLive(false);

    // Progressive step animation
    const stepInterval = setInterval(() => {
      setAnalysisStepIndex((prev) => {
        if (prev < SCAN_PIPELINE_STEPS.length - 1) return prev + 1;
        return prev;
      });
    }, 280);

    try {
      const result = await runHasoneAnalysis(selectedPairId, selectedDuration, settings.minScoreThreshold);
      clearInterval(stepInterval);
      setAnalysisStepIndex(SCAN_PIPELINE_STEPS.length - 1);

      setTimeout(() => {
        setAnalysisResult(result);
        setIsAnalyzing(false);
        playSignalSound(result.signalType);

        // Record trade in history & tracker
        if (result.signalType !== 'NONE') {
          const recorded = recordSignalTrade(result, settings.paperMode);
          setActiveTrade(recorded);
          const updatedHistory = getTradeHistory();
          setTradeHistory(updatedHistory);
          setStats(computeTradingStats(updatedHistory));
        }
      }, 400);
    } catch {
      clearInterval(stepInterval);
      setIsAnalyzing(false);
    }
  };

  // Settle active trade
  const handleSettleActiveTrade = (
    tradeId: string,
    currentPrice: number,
    manualResult?: 'WIN' | 'LOSS' | 'DRAW'
  ) => {
    const settled = settleTradeResult(tradeId, currentPrice);
    if (settled) {
      if (manualResult) {
        settled.result = manualResult;
      }
      setActiveTrade(null);
      const updatedHistory = getTradeHistory();
      setTradeHistory(updatedHistory);
      setStats(computeTradingStats(updatedHistory));
    }
  };

  // Copy Telegram Signal Format
  const handleCopyTelegram = () => {
    if (!analysisResult) return;
    const durOpt = DURATION_OPTIONS.find((d) => d.value === analysisResult.duration) || DURATION_OPTIONS[0];
    const text = `👑 HASONE TRADING ▪ إشارة خيارات ثنائية مؤكدة 👑
━━━━━━━━━━━━━━━━━━
📊 الزوج: ${analysisResult.pair.symbol}
⏰ وقت الدخول: ${analysisResult.entryTime} (بالدقيقة)
⏱️ المدة: ${durOpt.label}
🎯 الاتجاه: ${analysisResult.signalType === 'CALL' ? '🟢 صعود (CALL)' : '🔴 هبوط (PUT)'}
⚡ قوة الإشارة: ${analysisResult.strength}% (${analysisResult.confidence})
🛡️ درع الحماية: Hasone Royal Guard مفعّل
━━━━━━━━━━━━━━━━━━
💡 التحليل:
${analysisResult.reason}
━━━━━━━━━━━━━━━━━━
🤖 بوت Hasone Trading | تحليل يدوي ذكي لإشارات أدق`;

    navigator.clipboard.writeText(text);
    setCopiedSignal(true);
    setTimeout(() => setCopiedSignal(false), 2500);
  };

  // Import to live tracker callback
  const handleImportSignal = () => {
    if (!analysisResult || !onImportSignalToLive || analysisResult.signalType === 'NONE') return;
    onImportSignalToLive({
      pair: analysisResult.pair.symbol,
      timeStr: analysisResult.entryTime,
      direction: analysisResult.signalType as 'CALL' | 'PUT',
      timeframe: analysisResult.duration.toUpperCase(),
    });
    setImportedToLive(true);
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-4 pb-20 text-right" dir="rtl">
      {/* 1. Header Identity & Real-time Connectivity Status */}
      <div className="card-surface p-4 sm:p-5 rounded-3xl relative overflow-hidden border border-[var(--border-subtle)] shadow-xl">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Logo & Slogan */}
          <div className="flex items-center gap-3.5 text-right w-full sm:w-auto">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden border-2 border-cyan-400/40 shadow-xl bg-[var(--bg-canvas)] shrink-0 ring-2 ring-[var(--gold-primary)]/30">
              <img
                src={emblemImage}
                alt="Hasone Trading"
                className="w-full h-full object-cover rounded-2xl"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black text-[var(--text-primary)] tracking-tight">
                  Hasone Trading
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-mono">
                  PRO VIP
                </span>
              </div>
              <p className="text-xs sm:text-sm font-bold text-[var(--gold-primary)] mt-0.5">
                تحليل يدوي ذكي لإشارات أدق
              </p>
              <div className="flex flex-wrap items-center gap-2 text-[10px] text-[var(--text-muted)] mt-1 font-mono">
                <span className={`flex items-center gap-1 ${wsStatus === 'CONNECTED' ? 'text-emerald-400' : 'text-amber-400'}`}>
                  <span className={`w-2 h-2 rounded-full ${wsStatus === 'CONNECTED' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                  {wsStatus === 'CONNECTED' ? 'متصل بالبث اللحظي WebSocket' : 'جاري الاتصال بمصدر البيانات...'}
                </span>
                <span>•</span>
                <span>Twelve Data API + Quotex OTC</span>
                {liveWsPrice && (
                  <>
                    <span>•</span>
                    <span className="text-cyan-300 font-bold">
                      سعر البث: {liveWsPrice.toFixed(selectedPair.pipDecimals)}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Quick Diagnostics & Paper Mode Switch */}
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={() => {
                setIsDiagnosticOpen(true);
                fetchDiagnostics();
              }}
              className="px-3 py-1.5 rounded-xl border border-cyan-500/40 bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
              title="فحص الاتصال المباشر بمصادر البيانات"
            >
              <Wifi className="w-3.5 h-3.5 text-cyan-400" />
              <span>فحص الاتصال الفعلي (100%)</span>
            </button>

            <button
              onClick={() => {
                const next = !settings.paperMode;
                const newSet = { ...settings, paperMode: next };
                setSettings(newSet);
                saveHasoneSettings(newSet);
              }}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm ${
                settings.paperMode
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                  : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${settings.paperMode ? 'bg-amber-400' : 'bg-emerald-400'}`} />
              <span>{settings.paperMode ? 'الوضع التجريبي (Paper Mode)' : 'الوضع الحقيقي (Live Mode)'}</span>
            </button>
          </div>
        </div>

        {/* Paper Mode Notice */}
        {settings.paperMode && (
          <div className="mt-3.5 p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs text-amber-200">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-amber-400 shrink-0" />
              <span>أنت الآن في الوضع التجريبي (Paper Mode) — يتم اختبار وتتبع الصفقات دون أي مخاطرة مالية.</span>
            </div>
            <span className="text-[10px] font-mono text-amber-300/80 hidden sm:inline">محاكاة دقيقة 100%</span>
          </div>
        )}

        {/* Sub-Tabs Navigation */}
        <div className="mt-4 pt-3 border-t border-[var(--border-subtle)] flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {[
            { id: 'analysis', label: 'محلل Hasone اليدوي', icon: Sparkles },
            { id: 'tracker', label: 'متابعة الصفقات', icon: Activity, badge: activeTrade && activeTrade.result === 'PENDING' ? '1' : undefined },
            { id: 'history', label: 'سجل الإشارات', icon: Clock, count: tradeHistory.length },
            { id: 'stats', label: 'الإحصائيات والأداء', icon: BarChart2 },
            { id: 'settings', label: 'الإعدادات وقاعدة البيانات', icon: SlidersHorizontal },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id as ActiveSubTab)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-[var(--gold-primary)] to-amber-500 text-[var(--text-on-gold)] shadow-md shadow-[var(--gold-primary)]/20'
                    : 'bg-[var(--bg-input)] text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-hover)] border border-[var(--border-subtle)]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-red-500 text-white font-mono animate-pulse">
                    {tab.badge}
                  </span>
                )}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className="text-[10px] opacity-70 font-mono">({tab.count})</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ================= SUB-TAB 1: MANUAL ANALYSIS ================= */}
      {activeSubTab === 'analysis' && (
        <div className="space-y-4">
          {/* Pair Directory & Duration Card */}
          <div className="card-surface p-4 sm:p-5 rounded-3xl border border-[var(--border-subtle)] space-y-4 shadow-lg">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-[var(--border-subtle)] pb-3">
              <div>
                <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                  <span>1. اختر زوج العملات ومدة الصفقة</span>
                  <span className="text-[10px] text-cyan-400 font-mono font-normal">
                    (أزواج العملات للخيارات الثنائية فقط)
                  </span>
                </h3>
                <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                  البوت يدوي 100%؛ يحلل السوق عند ضغطك على «تحليل الآن» فقط ثم يتوقف تماماً.
                </p>
              </div>

              {/* Selected Pair Quick Badge */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)]">
                <span className="text-lg">{selectedPair.flag}</span>
                <span className="font-mono font-black text-sm text-[var(--gold-primary)]">{selectedPair.symbol}</span>
                {liveWsPrice ? (
                  <span className="text-[11px] font-mono text-cyan-300 font-bold px-1.5 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20">
                    {liveWsPrice.toFixed(selectedPair.pipDecimals)}
                  </span>
                ) : (
                  <span className="text-[11px] font-mono text-[var(--text-muted)] font-medium">
                    {selectedPair.basePrice.toFixed(selectedPair.pipDecimals)}
                  </span>
                )}
              </div>
            </div>

            {/* Pair Directory Component */}
            <HasonePairDirectory
              pairs={HASONE_CURRENCY_PAIRS}
              selectedPairId={selectedPairId}
              onSelectPair={setSelectedPairId}
              favoritePairs={settings.favoritePairs}
              onToggleFavorite={toggleFavorite}
              liveWsPrice={liveWsPrice}
              liveWsSymbol={selectedPair.symbol}
            />

            {/* Duration Selector */}
            <div className="pt-2 border-t border-[var(--border-subtle)] space-y-2">
              <span className="text-xs font-bold text-[var(--text-primary)] block">
                2. اختر مدة الصفقة (وقت الدخول سيكون بالدقيقة HH:MM):
              </span>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {DURATION_OPTIONS.map((dur) => {
                  const isSel = selectedDuration === dur.value;
                  return (
                    <button
                      key={dur.value}
                      onClick={() => setSelectedDuration(dur.value)}
                      className={`h-11 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer flex flex-col items-center justify-center ${
                        isSel
                          ? 'bg-[var(--gold-primary)] text-[var(--text-on-gold)] shadow-md font-black'
                          : 'bg-[var(--bg-input)] text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-hover)] border border-[var(--border-subtle)]'
                      }`}
                    >
                      <span>{dur.label}</span>
                      <span className="text-[9px] opacity-75">{dur.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Prominent Primary Action Button */}
            <div className="pt-3">
              <button
                onClick={handleExecuteAnalysis}
                disabled={isAnalyzing}
                className="btn-primary w-full h-14 rounded-2xl text-sm sm:text-base font-black text-[var(--text-on-gold)] flex items-center justify-center gap-3 cursor-pointer shadow-xl disabled:opacity-50"
              >
                {isAnalyzing ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>جاري جلب البيانات وتحليل المؤشرات الكمية...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5 fill-current" />
                    <span>تحليل الآن ({selectedPair.symbol})</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Analysis Progress Animation */}
          {isAnalyzing && (
            <div className="card-surface p-5 rounded-3xl border border-cyan-500/40 space-y-3 shadow-xl">
              <div className="flex items-center justify-between text-xs text-cyan-300 font-bold">
                <span className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-cyan-400 animate-spin" />
                  <span>محرك التحليل الرياضي يعمل الآن (المرحلة {analysisStepIndex + 1} من 9)...</span>
                </span>
                <span className="font-mono text-[var(--gold-primary)]">
                  {Math.round(((analysisStepIndex + 1) / SCAN_PIPELINE_STEPS.length) * 100)}%
                </span>
              </div>

              <div className="w-full h-2 rounded-full bg-[var(--bg-input)] overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 via-[var(--gold-primary)] to-emerald-400 transition-all duration-300"
                  style={{
                    width: `${((analysisStepIndex + 1) / SCAN_PIPELINE_STEPS.length) * 100}%`,
                  }}
                />
              </div>

              <p className="text-xs text-[var(--text-secondary)] font-mono animate-pulse">
                {SCAN_PIPELINE_STEPS[analysisStepIndex].title}
              </p>
            </div>
          )}

          {/* Analysis Result Card */}
          {analysisResult && !isAnalyzing && (
            <HasoneAnalysisCard
              result={analysisResult}
              copied={copiedSignal}
              onCopy={handleCopyTelegram}
              imported={importedToLive}
              onImportToLive={handleImportSignal}
            />
          )}
        </div>
      )}

      {/* ================= SUB-TAB 2: ACTIVE TRADE TRACKER ================= */}
      {activeSubTab === 'tracker' && (
        <HasoneActiveTradeTracker
          activeTrade={activeTrade}
          livePrice={liveWsPrice}
          onSettleTrade={handleSettleActiveTrade}
        />
      )}

      {/* ================= SUB-TAB 3: TRADE HISTORY ================= */}
      {activeSubTab === 'history' && (
        <HasoneTradeHistoryTable
          trades={tradeHistory}
          onRefreshHistory={() => {
            const fresh = getTradeHistory();
            setTradeHistory(fresh);
            setStats(computeTradingStats(fresh));
          }}
        />
      )}

      {/* ================= SUB-TAB 4: PERFORMANCE & STATS ================= */}
      {activeSubTab === 'stats' && (
        <HasonePerformanceDashboard stats={stats} isPaperMode={settings.paperMode} />
      )}

      {/* ================= SUB-TAB 5: SETTINGS & DATABASE ================= */}
      {activeSubTab === 'settings' && (
        <div className="card-surface p-5 sm:p-6 rounded-3xl border border-[var(--border-subtle)] space-y-5 shadow-lg">
          <div className="border-b border-[var(--border-subtle)] pb-3">
            <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
              <SlidersHorizontal className="w-5 h-5 text-[var(--gold-primary)]" />
              <span>إعدادات النظام وقاعدة البيانات</span>
            </h3>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              تخصيص حساسية المحلل وإدارة النسخ الاحتياطي في قاعدة البيانات المحلية.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {/* Audio Toggle */}
            <div className="p-4 rounded-2xl bg-[var(--bg-input)] border border-[var(--border-subtle)] flex items-center justify-between">
              <div>
                <span className="font-bold text-white block">التنبيهات الصوتية</span>
                <span className="text-[11px] text-[var(--text-muted)] block mt-0.5">
                  تشغيل رنة إشارة عند اكتمال التحليل
                </span>
              </div>
              <button
                onClick={() => {
                  const next = { ...settings, soundEnabled: !settings.soundEnabled };
                  setSettings(next);
                  saveHasoneSettings(next);
                }}
                className={`p-2 rounded-xl transition-colors cursor-pointer ${
                  settings.soundEnabled
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-slate-700 text-slate-400'
                }`}
              >
                {settings.soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              </button>
            </div>

            {/* Minimum Score Threshold */}
            <div className="p-4 rounded-2xl bg-[var(--bg-input)] border border-[var(--border-subtle)] space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white">الحد الأدنى لقوة الإشارة (Score Threshold)</span>
                <span className="font-mono font-bold text-[var(--gold-primary)]">
                  {settings.minScoreThreshold}%
                </span>
              </div>
              <input
                type="range"
                min="60"
                max="90"
                step="5"
                value={settings.minScoreThreshold}
                onChange={(e) => {
                  const next = { ...settings, minScoreThreshold: parseInt(e.target.value, 10) };
                  setSettings(next);
                  saveHasoneSettings(next);
                }}
                className="w-full accent-[var(--gold-primary)] cursor-pointer"
              />
              <span className="text-[10px] text-[var(--text-muted)] block">
                تصفية الإشارات التي يقل توافقها الفني عن {settings.minScoreThreshold}%.
              </span>
            </div>

            {/* Database Instant Backup */}
            <div className="p-4 rounded-2xl bg-[var(--bg-input)] border border-[var(--border-subtle)] space-y-2 sm:col-span-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <Database className="w-4 h-4 text-cyan-400" />
                    <span>إدارة قاعدة البيانات والنسخ الاحتياطي الذاتي</span>
                  </span>
                  <span className="text-[11px] text-[var(--text-muted)] block mt-0.5">
                    حفظ نسخة كاملة من سجل الصفقات والإعدادات في مجلد النسخ الاحتياطي على الخادم (data/backups).
                  </span>
                </div>
                <button
                  onClick={async () => {
                    const res = await triggerServerBackup('settings_manual_backup');
                    alert(res.success ? `تم إنشاء النسخة الاحتياطية بنجاح: ${res.fileName}` : `فشل النسخ: ${res.error}`);
                  }}
                  className="btn-primary h-10 px-4 text-xs text-[var(--text-on-gold)] font-bold rounded-xl cursor-pointer"
                >
                  نسخ احتياطي فوري
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Diagnostics Modal */}
      <HasoneDiagnosticsModal
        isOpen={isDiagnosticOpen}
        onClose={() => setIsDiagnosticOpen(false)}
        diagnosticData={diagnosticData}
        liveTestResult={liveTestResult}
        isTestingConnection={isTestingConnection}
        onRefreshDiagnostics={fetchDiagnostics}
        wsStatus={wsStatus}
        selectedPairSymbol={selectedPair.symbol}
        liveWsPrice={liveWsPrice}
        pipDecimals={selectedPair.pipDecimals}
      />
    </div>
  );
};
