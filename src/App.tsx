import React, { useState, useEffect, useRef } from 'react';
import { Zap, SlidersHorizontal, ListFilter, Calculator, Send, Timer } from 'lucide-react';
import { LoginView } from './components/LoginView';
import { Header } from './components/Header';
import { GeneratorPanel } from './components/GeneratorPanel';
import { AreenCollectionTab } from './components/AreenCollectionTab';
import { ActiveSignalCard } from './components/ActiveSignalCard';
import { SignalsTable } from './components/SignalsTable';
import { RiskCalculatorView } from './components/RiskCalculatorView';
import { TelegramExportModal } from './components/TelegramExportModal';
import { ChangePinModal } from './components/ChangePinModal';
import { AdminAuthModal } from './components/AdminAuthModal';
import { AdminManagementModal } from './components/AdminManagementModal';
import { MagicNavigationBar, NavTabType } from './components/MagicNavigationBar';
import { DEFAULT_PAIRS } from './constants/pairs';
import { GeneratorConfig, SignalItem, SignalResult } from './types';
import { playCountdownBeep, playEntryFanfare } from './utils/audio';
import { checkSessionValidity } from './utils/crypto';
import { formatSingleSignalMono } from './utils/formatter';

const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000; // 15 mins

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('areen_session_auth') === 'true';
  });

  const [kickoutAlert, setKickoutAlert] = useState<string | null>(null);

  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    return localStorage.getItem('areen_sound_enabled') !== 'false';
  });

  // Navigation Tabs: 'live' | 'generator' | 'collection' | 'table' | 'calculator'
  const [activeTab, setActiveTab] = useState<'live' | 'generator' | 'collection' | 'table' | 'calculator'>('live');

  const [availablePairs, setAvailablePairs] = useState<string[]>(() => {
    const saved = localStorage.getItem('areen_custom_pairs');
    return saved ? JSON.parse(saved) : DEFAULT_PAIRS;
  });

  const [config, setConfig] = useState<GeneratorConfig>({
    tradeCount: 9,
    gapMinutes: 5,
    martingale: 'NON MTG',
    timeframe: 'M1',
    formatStyle: 'vip',
    selectedPairs: DEFAULT_PAIRS.slice(0, 10),
  });

  const [signals, setSignals] = useState<SignalItem[]>([]);
  const [countdownText, setCountdownText] = useState<string>('00:00');
  const [isTradeActive, setIsTradeActive] = useState<boolean>(false);
  const [currentSignalIndex, setCurrentSignalIndex] = useState<number>(-1);

  // Modals
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [isPinModalOpen, setIsPinModalOpen] = useState<boolean>(false);
  const [isAdminAuthOpen, setIsAdminAuthOpen] = useState<boolean>(false);
  const [isAdminManagementOpen, setIsAdminManagementOpen] = useState<boolean>(false);
  const [adminToken, setAdminToken] = useState<string>('');

  const lastBeepSecond = useRef<number>(-1);
  const lastActivityTime = useRef<number>(Date.now());

  // Handle Authentication cleanup
  useEffect(() => {
    localStorage.removeItem('areen_custom_pin');
  }, []);

  const handleForcedKickout = (msg?: string) => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('areen_session_auth');
    sessionStorage.removeItem('areen_session_version');
    localStorage.removeItem('areen_session_auth');
    setSignals([]);
    setKickoutAlert(
      msg || 'تم تحديث جلسة أمان Hasone Trading. يرجى تسجيل الدخول لمتابعة الاستخدام.'
    );
  };

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
    setKickoutAlert(null);
    sessionStorage.setItem('areen_session_auth', 'true');
    lastActivityTime.current = Date.now();
  };

  const handleLockSession = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('areen_session_auth');
  };

  // Cross-device and background-tab session check
  useEffect(() => {
    if (!isAuthenticated) return;

    const verifyActiveSession = async () => {
      const currentVersion = sessionStorage.getItem('areen_session_version');
      if (!currentVersion) {
        handleForcedKickout();
        return;
      }
      const isValid = await checkSessionValidity(currentVersion);
      if (!isValid) {
        handleForcedKickout();
      }
    };

    verifyActiveSession();
    const checkInterval = setInterval(verifyActiveSession, 2000);

    const onVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible' || document.hasFocus()) {
        verifyActiveSession();
      }
    };

    document.addEventListener('visibilitychange', onVisibilityOrFocus);
    window.addEventListener('focus', onVisibilityOrFocus);
    window.addEventListener('pageshow', onVisibilityOrFocus);

    const onStorageChange = (e: StorageEvent) => {
      if (e.key === 'areen_auth_epoch' || e.key === 'areen_auth_hash') {
        verifyActiveSession();
      }
    };
    window.addEventListener('storage', onStorageChange);

    return () => {
      clearInterval(checkInterval);
      document.removeEventListener('visibilitychange', onVisibilityOrFocus);
      window.removeEventListener('focus', onVisibilityOrFocus);
      window.removeEventListener('pageshow', onVisibilityOrFocus);
      window.removeEventListener('storage', onStorageChange);
    };
  }, [isAuthenticated]);

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    localStorage.setItem('areen_sound_enabled', String(next));
  };

  // Inactivity guard
  useEffect(() => {
    if (!isAuthenticated) return;

    const onActivity = () => {
      lastActivityTime.current = Date.now();
    };

    window.addEventListener('mousemove', onActivity, { passive: true });
    window.addEventListener('keydown', onActivity, { passive: true });
    window.addEventListener('touchstart', onActivity, { passive: true });

    const checker = setInterval(() => {
      if (Date.now() - lastActivityTime.current > INACTIVITY_TIMEOUT_MS) {
        handleLockSession();
      }
    }, 10000);

    return () => {
      window.removeEventListener('mousemove', onActivity);
      window.removeEventListener('keydown', onActivity);
      window.removeEventListener('touchstart', onActivity);
      clearInterval(checker);
    };
  }, [isAuthenticated]);

  // Add custom pair
  const handleAddCustomPair = (pairName: string) => {
    if (availablePairs.includes(pairName)) return;
    const updated = [pairName, ...availablePairs];
    setAvailablePairs(updated);
    localStorage.setItem('areen_custom_pairs', JSON.stringify(updated));
    setConfig((prev) => ({
      ...prev,
      selectedPairs: [pairName, ...prev.selectedPairs],
    }));
  };

  // Import collection signals directly into live tracker
  const handleImportCollectionSignals = async (importedSignals: SignalItem[]) => {
    const currentVersion = sessionStorage.getItem('areen_session_version');
    const isValid = await checkSessionValidity(currentVersion);
    if (!isValid) {
      handleForcedKickout();
      return;
    }
    setSignals(importedSignals);
    setActiveTab('live');
  };

  // Direction generation algorithm
  const generateDirection = (pair: string, time: Date, index: number): 'CALL' | 'PUT' => {
    const seed = `${pair}_${time.getHours()}_${time.getMinutes()}_${index}_AREEN`;
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = (hash << 5) - hash + seed.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash) % 2 === 0 ? 'CALL' : 'PUT';
  };

  // Generate schedule
  const handleGenerate = async () => {
    const currentVersion = sessionStorage.getItem('areen_session_version');
    const isValid = await checkSessionValidity(currentVersion);
    if (!isValid) {
      handleForcedKickout();
      return;
    }

    if (config.selectedPairs.length === 0) {
      return;
    }

    const now = new Date();
    const start = new Date(now);
    start.setSeconds(0, 0);
    start.setMinutes(start.getMinutes() + 1);

    const pad = (n: number) => String(n).padStart(2, '0');
    const newSignals: SignalItem[] = [];

    for (let i = 0; i < config.tradeCount; i++) {
      const tradeTime = new Date(start.getTime() + i * config.gapMinutes * 60 * 1000);
      const pair = config.selectedPairs[i % config.selectedPairs.length];
      const dir = generateDirection(pair, tradeTime, i);

      newSignals.push({
        id: `areen_${tradeTime.getTime()}_${i}`,
        pair,
        time: tradeTime,
        timeStr: `${pad(tradeTime.getHours())}:${pad(tradeTime.getMinutes())}`,
        direction: dir,
        timeframe: config.timeframe,
        martingale: config.martingale,
        done: false,
        result: 'pending',
      });
    }

    setSignals(newSignals);
    setActiveTab('live');
  };

  // Timer loop for active trade detection & countdown
  useEffect(() => {
    if (signals.length === 0) {
      setCountdownText('00:00');
      setIsTradeActive(false);
      setCurrentSignalIndex(-1);
      return;
    }

    const interval = setInterval(() => {
      const now = Date.now();
      const pad = (n: number) => String(n).padStart(2, '0');

      setSignals((prev) =>
        prev.map((s) => {
          const isDone = now >= s.time.getTime() + 60 * 1000;
          if (isDone !== s.done) {
            return { ...s, done: isDone };
          }
          return s;
        })
      );

      const idx = signals.findIndex((s) => !s.done && s.time.getTime() + 60 * 1000 > now);

      if (idx === -1) {
        setCountdownText('00:00');
        setIsTradeActive(false);
        setCurrentSignalIndex(-1);
        return;
      }

      setCurrentSignalIndex(idx);
      const activeSig = signals[idx];
      const timeDiffMs = activeSig.time.getTime() - now;

      if (timeDiffMs > 0) {
        setIsTradeActive(false);
        const totalSec = Math.ceil(timeDiffMs / 1000);
        const mins = Math.floor(totalSec / 60);
        const secs = totalSec % 60;
        setCountdownText(`${pad(mins)}:${pad(secs)}`);

        if (soundEnabled && totalSec <= 3 && totalSec > 0 && lastBeepSecond.current !== totalSec) {
          lastBeepSecond.current = totalSec;
          playCountdownBeep(totalSec === 1);
        }
      } else {
        setIsTradeActive(true);
        const candleRemainingMs = activeSig.time.getTime() + 60 * 1000 - now;
        const totalSec = Math.max(0, Math.ceil(candleRemainingMs / 1000));
        setCountdownText(`00:${pad(totalSec)}`);

        if (soundEnabled && totalSec === 60 && lastBeepSecond.current !== 60) {
          lastBeepSecond.current = 60;
          playEntryFanfare();
        }
      }
    }, 500);

    return () => clearInterval(interval);
  }, [signals, soundEnabled]);

  // Mark result
  const handleMarkResult = (id: string, result: SignalResult) => {
    setSignals((prev) =>
      prev.map((s) => (s.id === id ? { ...s, result } : s))
    );
  };

  // Copy single signal
  const handleCopySingle = async (item: SignalItem) => {
    const text = formatSingleSignalMono(item);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // ignore
    }
  };

  // Reset signals
  const handleResetSignals = () => {
    setSignals([]);
  };

  // Render Login if not authenticated
  if (!isAuthenticated) {
    return (
      <>
        <LoginView
          onSuccess={handleLoginSuccess}
          kickoutMessage={kickoutAlert}
          onSecretTrigger={() => setIsAdminAuthOpen(true)}
        />
        <AdminAuthModal
          isOpen={isAdminAuthOpen}
          onClose={() => setIsAdminAuthOpen(false)}
          onSuccess={(token) => {
            setAdminToken(token);
            setIsAdminAuthOpen(false);
            setIsAdminManagementOpen(true);
          }}
        />
        <AdminManagementModal
          isOpen={isAdminManagementOpen}
          onClose={() => setIsAdminManagementOpen(false)}
          adminToken={adminToken}
        />
      </>
    );
  }

  const currentSignal = currentSignalIndex >= 0 ? signals[currentSignalIndex] : null;

  // Stats calculation
  const winsCount = signals.filter(
    (s) => s.result === 'win_direct' || s.result === 'win_mtg1' || s.result === 'win_mtg2'
  ).length;
  const lossCount = signals.filter((s) => s.result === 'loss').length;
  const gradedCount = winsCount + lossCount;
  const winRate = gradedCount > 0 ? Math.round((winsCount / gradedCount) * 100) : 0;
  const remainingCount = signals.filter((s) => !s.done).length;

  // Next 3 signals preview
  const upcomingSignals = signals
    .filter((s, idx) => idx > currentSignalIndex && !s.done)
    .slice(0, 3);

  return (
    <div className="min-h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)] flex justify-center selection:bg-[var(--gold-primary)]/25 selection:text-[var(--gold-light)]">
      {/* Container Frame matching phone ergonomics with responsive padding */}
      <div className="w-full max-w-[490px] sm:max-w-xl min-h-screen bg-[var(--bg-base)] border-x border-[var(--border-subtle)] shadow-[0_0_90px_rgba(0,0,0,0.85)] flex flex-col relative pb-20 sm:pb-24">
        {/* Top Header with logo on Right and controls on Left */}
        <Header
          soundEnabled={soundEnabled}
          onToggleSound={toggleSound}
          onLockSession={handleLockSession}
          onSecretTrigger={() => setIsAdminAuthOpen(true)}
        />

        {/* Content Container */}
        <main className="flex-1 p-2.5 sm:p-4 space-y-3 sm:space-y-4 overflow-y-auto" dir="rtl">
          {/* TAB 1: LIVE ACTIVE SIGNAL */}
          {activeTab === 'live' && (
            <div className="space-y-3 sm:space-y-3.5">
              {/* Focal Live Trade Card */}
              <ActiveSignalCard
                currentSignal={currentSignal}
                countdownText={countdownText}
                isTradeActive={isTradeActive}
                onMarkResult={handleMarkResult}
                totalSignals={signals.length}
                remainingSignals={remainingCount}
                onNavigateToGenerator={() => setActiveTab('generator')}
                lastSessionStats={
                  gradedCount > 0 ? { total: signals.length, wins: winsCount, winRate } : null
                }
              />

              {/* Quick Metrics Bar */}
              <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
                <div className="card-surface p-2 sm:p-2.5 text-center">
                  <div className="text-[9.5px] sm:text-[10px] text-[var(--text-muted)] font-bold">إجمالي</div>
                  <div className="text-sm sm:text-base font-black font-mono text-[var(--gold-primary)] mt-0.5 tabular-nums">{signals.length}</div>
                </div>
                <div className="card-surface p-2 sm:p-2.5 text-center border-[rgba(32,180,134,0.35)]">
                  <div className="text-[9.5px] sm:text-[10px] text-[var(--success)] font-bold">رابحة</div>
                  <div className="text-sm sm:text-base font-black font-mono text-[var(--success)] mt-0.5 tabular-nums">{winsCount}</div>
                </div>
                <div className="card-surface p-2 sm:p-2.5 text-center border-[rgba(228,93,107,0.35)]">
                  <div className="text-[9.5px] sm:text-[10px] text-[var(--danger)] font-bold">خاسرة</div>
                  <div className="text-sm sm:text-base font-black font-mono text-[var(--danger)] mt-0.5 tabular-nums">{lossCount}</div>
                </div>
                <div className="card-surface p-2 sm:p-2.5 text-center border-[var(--gold-border)]">
                  <div className="text-[9.5px] sm:text-[10px] text-[var(--gold-primary)] font-bold">النسبة</div>
                  <div className="text-sm sm:text-base font-black font-mono text-[var(--text-primary)] mt-0.5 tabular-nums">
                    {gradedCount > 0 ? `${winRate}%` : '—'}
                  </div>
                </div>
              </div>

              {/* Quick Action Buttons */}
              <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
                <button
                  onClick={() => setIsExportModalOpen(true)}
                  disabled={signals.length === 0}
                  className="btn-secondary py-2.5 sm:py-3 px-3 rounded-2xl text-xs sm:text-sm font-bold disabled:opacity-35 shadow-xs"
                >
                  <Send className="w-3.5 h-3.5 text-[var(--gold-primary)]" />
                  <span>تصدير للتيليجرام</span>
                </button>

                <button
                  onClick={() => setActiveTab('generator')}
                  className="btn-primary py-2.5 sm:py-3 px-3 rounded-2xl text-xs sm:text-sm font-bold shadow-md"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-[var(--text-on-burgundy)]" />
                  <span>{signals.length === 0 ? 'إنشاء جدول صفقات' : 'تعديل الصفقات'}</span>
                </button>
              </div>

              {/* Upcoming Signals Stream */}
              {upcomingSignals.length > 0 && (
                <div className="card-surface p-3 sm:p-3.5 space-y-2.5 shadow-xl">
                  <div className="flex items-center justify-between text-xs border-b border-[var(--border-subtle)] pb-2">
                    <span className="font-black text-[var(--gold-primary)] text-xs">
                      الصفقات التالية في Hasone Trading:
                    </span>
                    <button
                      onClick={() => setActiveTab('table')}
                      className="text-xs text-[var(--text-secondary)] hover:text-[var(--gold-primary)] font-bold hover:underline cursor-pointer transition-colors"
                    >
                      عرض الجدول الكامل ({signals.length}) ←
                    </button>
                  </div>

                  <div className="space-y-2">
                    {upcomingSignals.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-[var(--bg-input)] border border-[var(--border-subtle)] text-xs hover:bg-[var(--bg-hover)] transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              item.direction === 'CALL' ? 'bg-[var(--success)] shadow-[0_0_8px_var(--success)]' : 'bg-[var(--danger)] shadow-[0_0_8px_var(--danger)]'
                            }`}
                          />
                          <span
                            className="font-mono font-bold text-[var(--text-primary)] text-xs px-2 py-0.5 rounded-md bg-[var(--bg-surface)] border border-[var(--gold-border)] min-w-[76px] sm:min-w-[80px] text-center tracking-tight shrink-0 shadow-xs"
                            dir="ltr"
                          >
                            <bdi>{item.pair}</bdi>
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-[var(--gold-primary)] font-mono font-bold">
                            {item.timeStr}
                          </span>
                          <span
                            className={`text-xs font-bold ${
                              item.direction === 'CALL' ? 'text-[var(--success)]' : 'text-[var(--danger)]'
                            }`}
                          >
                            {item.direction === 'CALL' ? 'صعود CALL' : 'هبوط PUT'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: GENERATOR */}
          {activeTab === 'generator' && (
            <GeneratorPanel
              config={config}
              onChangeConfig={setConfig}
              availablePairs={availablePairs}
              onAddCustomPair={handleAddCustomPair}
              onGenerate={handleGenerate}
              onOpenExportModal={() => setIsExportModalOpen(true)}
              hasSchedule={signals.length > 0}
            />
          )}

          {/* TAB 3: STRATEGY */}
          {activeTab === 'collection' && (
            <AreenCollectionTab onImportToLiveTracker={handleImportCollectionSignals} />
          )}

          {/* TAB 4: TABLE */}
          {activeTab === 'table' && (
            <SignalsTable
              signals={signals}
              onMarkResult={handleMarkResult}
              onResetSignals={handleResetSignals}
              onCopySingleSignal={handleCopySingle}
            />
          )}

          {/* TAB 5: CALCULATOR */}
          {activeTab === 'calculator' && <RiskCalculatorView />}
        </main>

        {/* Magic Floating Cutout Navigation Bar matching uploaded image code */}
        <MagicNavigationBar activeTab={activeTab} onChangeTab={setActiveTab} />

        {/* Modals */}
        <TelegramExportModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          signals={signals}
          martingale={config.martingale}
        />

        <ChangePinModal
          isOpen={isPinModalOpen}
          onClose={() => setIsPinModalOpen(false)}
        />

        <AdminAuthModal
          isOpen={isAdminAuthOpen}
          onClose={() => setIsAdminAuthOpen(false)}
          onSuccess={(token) => {
            setAdminToken(token);
            setIsAdminAuthOpen(false);
            setIsAdminManagementOpen(true);
          }}
        />

        <AdminManagementModal
          isOpen={isAdminManagementOpen}
          onClose={() => setIsAdminManagementOpen(false)}
          adminToken={adminToken}
        />
      </div>
    </div>
  );
}
