// Hasone Trading - Trade Tracker, Signal History & Analytics Manager

import { HasoneAnalysisResult, SignalType } from './hasoneEngine';

export type TradeResult = 'WIN' | 'LOSS' | 'DRAW' | 'PENDING';

export interface RecordedTrade {
  id: string;
  pairSymbol: string;
  pairDisplayName: string;
  category: string;
  isOTC: boolean;
  signalType: SignalType;
  entryTime: string;          // HH:MM
  entryTimestamp: number;
  durationStr: string;
  durationMinutes: number;
  expiryTimestamp: number;
  entryPrice: number;
  exitPrice?: number;
  result: TradeResult;
  profitPips?: number;
  strength: number;
  confidence: string;
  riskLevel: string;
  reason: string;
  marketCondition: string;
  dataSource: string;
  isPaper: boolean;
  createdAt: number;
  settledAt?: number;
}

export interface TradingStats {
  totalSignals: number;
  todaySignals: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;            // percentage, e.g. 84.5%
  avgStrength: number;
  bestPair: string;
  worstPair: string;
  bestDuration: string;
  bestCategory: string;
}

const STORAGE_KEY_TRADES = 'hasone_trading_history_v1';
const STORAGE_KEY_SETTINGS = 'hasone_trading_settings_v1';

export interface HasoneUserSettings {
  paperMode: boolean;
  soundEnabled: boolean;
  minScoreThreshold: number;
  candleCount: number;
  selectedDataSource: 'twelve_data' | 'otc_stream' | 'auto';
  favoritePairs: string[];
}

export const DEFAULT_SETTINGS: HasoneUserSettings = {
  paperMode: true,
  soundEnabled: true,
  minScoreThreshold: 70,
  candleCount: 85,
  selectedDataSource: 'auto',
  favoritePairs: ['eur_usd_otc', 'usd_brl_otc', 'gbp_usd_otc', 'usd_inr_otc', 'usd_jpy_otc'],
};

// 1. Get Settings
export function getHasoneSettings(): HasoneUserSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SETTINGS);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {}
  return DEFAULT_SETTINGS;
}

// 2. Save Settings
export function saveHasoneSettings(settings: HasoneUserSettings) {
  try {
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
  } catch {}
}

// 3. Get Trade History
export function getTradeHistory(): RecordedTrade[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TRADES);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

// 4. Save Trade History
export function saveTradeHistory(trades: RecordedTrade[]) {
  try {
    localStorage.setItem(STORAGE_KEY_TRADES, JSON.stringify(trades.slice(0, 300))); // keep latest 300
  } catch {}
}

// 5. Record a New Analysis Signal
export function recordSignalTrade(
  analysis: HasoneAnalysisResult,
  isPaper: boolean
): RecordedTrade {
  const trade: RecordedTrade = {
    id: analysis.id,
    pairSymbol: analysis.pair.symbol,
    pairDisplayName: analysis.pair.displayName,
    category: analysis.pair.category,
    isOTC: analysis.pair.isOTC,
    signalType: analysis.signalType,
    entryTime: analysis.entryTime,
    entryTimestamp: analysis.entryTimestamp,
    durationStr: analysis.duration,
    durationMinutes: analysis.durationMinutes,
    expiryTimestamp: analysis.expiryTimestamp,
    entryPrice: analysis.entryPrice,
    result: 'PENDING',
    strength: analysis.strength,
    confidence: analysis.confidence,
    riskLevel: analysis.riskLevel,
    reason: analysis.reason,
    marketCondition: analysis.marketCondition,
    dataSource: analysis.dataSource,
    isPaper,
    createdAt: analysis.createdAt,
  };

  const history = getTradeHistory();
  history.unshift(trade);
  saveTradeHistory(history);

  // Asynchronous background sync to enterprise database repository
  if (typeof fetch !== 'undefined') {
    fetch('/api/trades', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(trade),
    }).catch((err) => console.warn('[Trade Tracker] Server sync deferred:', err.message));
  }

  return trade;
}

// 6. Settle a Trade Result
export function settleTradeResult(tradeId: string, currentPrice: number): RecordedTrade | null {
  const history = getTradeHistory();
  const idx = history.findIndex((t) => t.id === tradeId);
  if (idx === -1) return null;

  const trade = history[idx];
  if (trade.result !== 'PENDING') return trade;

  const diff = currentPrice - trade.entryPrice;
  let result: TradeResult = 'DRAW';

  if (trade.signalType === 'CALL') {
    if (diff > 0.000001) result = 'WIN';
    else if (diff < -0.000001) result = 'LOSS';
    else result = 'DRAW';
  } else if (trade.signalType === 'PUT') {
    if (diff < -0.000001) result = 'WIN';
    else if (diff > 0.000001) result = 'LOSS';
    else result = 'DRAW';
  }

  trade.exitPrice = currentPrice;
  trade.result = result;
  trade.profitPips = Math.round(diff * 10000 * 10) / 10;
  trade.settledAt = Date.now();

  history[idx] = trade;
  saveTradeHistory(history);

  // Background sync settlement update to server
  if (typeof fetch !== 'undefined') {
    fetch(`/api/trades/${encodeURIComponent(tradeId)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        result: trade.result,
        exitPrice: trade.exitPrice,
        profitPips: trade.profitPips,
        settledAt: trade.settledAt,
      }),
    }).catch((err) => console.warn('[Trade Tracker] Settlement sync deferred:', err.message));
  }

  return trade;
}

// 7. Calculate Statistics
export function computeTradingStats(trades: RecordedTrade[]): TradingStats {
  const validTrades = trades.filter((t) => t.signalType !== 'NONE' && t.result !== 'PENDING');
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  const todayTrades = validTrades.filter((t) => t.createdAt >= startOfDay);
  const wins = validTrades.filter((t) => t.result === 'WIN').length;
  const losses = validTrades.filter((t) => t.result === 'LOSS').length;
  const draws = validTrades.filter((t) => t.result === 'DRAW').length;
  const total = validTrades.length;

  const winRate = total > 0 ? Math.round((wins / total) * 1000) / 10 : 0;
  const avgStrength = total > 0 ? Math.round(validTrades.reduce((acc, t) => acc + t.strength, 0) / total) : 0;

  // Best pair
  const pairWins = new Map<string, { wins: number; total: number }>();
  trades.forEach((t) => {
    if (t.result === 'WIN' || t.result === 'LOSS') {
      const cur = pairWins.get(t.pairSymbol) || { wins: 0, total: 0 };
      if (t.result === 'WIN') cur.wins++;
      cur.total++;
      pairWins.set(t.pairSymbol, cur);
    }
  });

  let bestPair = 'EUR/USD OTC';
  let bestRate = -1;
  let worstPair = 'USD/BRL OTC';
  let worstRate = 101;

  pairWins.forEach((stats, pair) => {
    if (stats.total >= 1) {
      const rate = (stats.wins / stats.total) * 100;
      if (rate > bestRate) {
        bestRate = rate;
        bestPair = pair;
      }
      if (rate < worstRate) {
        worstRate = rate;
        worstPair = pair;
      }
    }
  });

  // Best duration
  const durWins = new Map<string, { wins: number; total: number }>();
  trades.forEach((t) => {
    if (t.result === 'WIN' || t.result === 'LOSS') {
      const cur = durWins.get(t.durationStr) || { wins: 0, total: 0 };
      if (t.result === 'WIN') cur.wins++;
      cur.total++;
      durWins.set(t.durationStr, cur);
    }
  });

  let bestDuration = '1m';
  let maxDurRate = -1;
  durWins.forEach((st, dur) => {
    const r = (st.wins / st.total) * 100;
    if (r > maxDurRate) {
      maxDurRate = r;
      bestDuration = dur;
    }
  });

  return {
    totalSignals: total,
    todaySignals: todayTrades.length,
    wins,
    losses,
    draws,
    winRate,
    avgStrength,
    bestPair,
    worstPair: worstPair !== bestPair ? worstPair : 'USD/JPY',
    bestDuration,
    bestCategory: 'أزواج OTC',
  };
}

// 8. Export to CSV
export function exportTradesToCSV(trades: RecordedTrade[]): void {
  const headers = [
    'المعرف',
    'الزوج',
    'نوع السوق',
    'الإشارة',
    'وقت الدخول',
    'المدة',
    'سعر الدخول',
    'سعر الخروج',
    'النتيجة',
    'القوة',
    'المخاطرة',
    'السبب',
    'الوضع',
    'التاريخ',
  ];

  const rows = trades.map((t) => [
    t.id,
    t.pairSymbol,
    t.isOTC ? 'OTC' : 'Forex Standard',
    t.signalType,
    t.entryTime,
    t.durationStr,
    t.entryPrice,
    t.exitPrice || '',
    t.result,
    `${t.strength}%`,
    t.riskLevel,
    `"${(t.reason || '').replace(/"/g, '""')}"`,
    t.isPaper ? 'تجريبي' : 'حقيقي',
    new Date(t.createdAt).toLocaleString('ar-SA'),
  ]);

  const csvContent =
    '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `Hasone_Trading_Signals_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// 9. Clear All History
export function clearTradeHistory(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_TRADES);
    if (typeof fetch !== 'undefined') {
      fetch('/api/trades/all', { method: 'DELETE' }).catch(() => {});
    }
  } catch {}
}

// 10. Database Backup Trigger
export async function triggerServerBackup(reason = 'ui_backup'): Promise<{ success: boolean; fileName?: string; error?: string }> {
  try {
    const res = await fetch('/api/trades/backup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
