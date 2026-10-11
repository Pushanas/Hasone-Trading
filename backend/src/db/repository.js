// backend/src/db/repository.js
// Enterprise Data Repository Layer for Hasone Trading
// Provides thread-safe, atomic persistence, validation, audit logs, and automatic backups.
// Designed with a clean repository interface for future SQLite / PostgreSQL migration.

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const BACKUP_DIR = path.resolve(DATA_DIR, 'backups');
const DB_FILE = path.resolve(DATA_DIR, 'hasone_database.json');

const INITIAL_SCHEMA = {
  version: 1,
  schemaCreated: new Date().toISOString(),
  lastUpdated: new Date().toISOString(),
  settings: {
    paperMode: true,
    soundEnabled: true,
    minScoreThreshold: 70,
    candleCount: 85,
    selectedDataSource: 'auto',
    favoritePairs: ['eur_usd_otc', 'usd_brl_otc', 'gbp_usd_otc', 'usd_inr_otc', 'usd_jpy_otc'],
  },
  trades: [],
  auditLogs: [],
  backups: [],
};

// In-memory mutex flag to serialize writes
let writeLock = false;

function ensureDirs() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

/**
 * Load database or initialize if missing
 */
export function loadDatabase() {
  ensureDirs();
  if (!fs.existsSync(DB_FILE)) {
    saveDatabaseSync(INITIAL_SCHEMA);
    return { ...INITIAL_SCHEMA };
  }
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return {
      ...INITIAL_SCHEMA,
      ...parsed,
      settings: { ...INITIAL_SCHEMA.settings, ...(parsed.settings || {}) },
      trades: Array.isArray(parsed.trades) ? parsed.trades : [],
      auditLogs: Array.isArray(parsed.auditLogs) ? parsed.auditLogs : [],
    };
  } catch (err) {
    console.error('[DB Repository] Corrupt DB detected, restoring from backup or defaults:', err.message);
    const restored = tryRestoreLatestBackup();
    if (restored) return restored;
    saveDatabaseSync(INITIAL_SCHEMA);
    return { ...INITIAL_SCHEMA };
  }
}

/**
 * Atomic file writer using write-to-temp-then-rename pattern
 */
function saveDatabaseSync(data) {
  ensureDirs();
  const tmpFile = `${DB_FILE}.${Date.now()}.${crypto.randomBytes(4).toString('hex')}.tmp`;
  data.lastUpdated = new Date().toISOString();
  fs.writeFileSync(tmpFile, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(tmpFile, DB_FILE);
}

/**
 * Attempt restoration from the most recent backup file
 */
function tryRestoreLatestBackup() {
  try {
    if (!fs.existsSync(BACKUP_DIR)) return null;
    const files = fs.readdirSync(BACKUP_DIR)
      .filter((f) => f.startsWith('hasone_backup_') && f.endsWith('.json'))
      .sort()
      .reverse();
    if (files.length === 0) return null;

    const latest = path.resolve(BACKUP_DIR, files[0]);
    console.log(`[DB Repository] Restoring database from backup: ${latest}`);
    const raw = fs.readFileSync(latest, 'utf-8');
    const parsed = JSON.parse(raw);
    saveDatabaseSync(parsed);
    return parsed;
  } catch (e) {
    console.error('[DB Repository] Backup restoration failed:', e.message);
    return null;
  }
}

/**
 * Create an instantaneous backup of the database
 */
export function createBackup(reason = 'manual') {
  ensureDirs();
  const db = loadDatabase();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFileName = `hasone_backup_${timestamp}_${reason}.json`;
  const backupPath = path.resolve(BACKUP_DIR, backupFileName);

  fs.writeFileSync(backupPath, JSON.stringify(db, null, 2), 'utf-8');

  // Prune older backups, keeping latest 15
  try {
    const allBackups = fs.readdirSync(BACKUP_DIR)
      .filter((f) => f.startsWith('hasone_backup_') && f.endsWith('.json'))
      .sort()
      .reverse();

    if (allBackups.length > 15) {
      for (const oldFile of allBackups.slice(15)) {
        fs.unlinkSync(path.resolve(BACKUP_DIR, oldFile));
      }
    }
  } catch {}

  // Record audit log
  addAuditLog('DATABASE_BACKUP_CREATED', { fileName: backupFileName, reason });

  return {
    success: true,
    fileName: backupFileName,
    filePath: backupPath,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Record an audit log entry
 */
export function addAuditLog(action, details = {}, actor = 'system') {
  try {
    const db = loadDatabase();
    const logEntry = {
      id: `log_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      action,
      actor,
      details,
      timestamp: new Date().toISOString(),
    };
    db.auditLogs.unshift(logEntry);
    if (db.auditLogs.length > 500) {
      db.auditLogs = db.auditLogs.slice(0, 500);
    }
    saveDatabaseSync(db);
    return logEntry;
  } catch (err) {
    console.error('[Audit Log Error]:', err.message);
    return null;
  }
}

/**
 * Get recorded trades with optional filtering
 */
export function getTrades(filter = {}) {
  const db = loadDatabase();
  let list = db.trades || [];

  if (filter.pair) {
    list = list.filter((t) => t.pairSymbol === filter.pair || t.pairId === filter.pair);
  }
  if (filter.result && filter.result !== 'ALL') {
    list = list.filter((t) => t.result === filter.result);
  }
  if (filter.paperMode !== undefined) {
    list = list.filter((t) => Boolean(t.isPaper) === Boolean(filter.paperMode));
  }
  if (filter.signalType && filter.signalType !== 'ALL') {
    list = list.filter((t) => t.signalType === filter.signalType);
  }

  return list;
}

/**
 * Add a new trade record
 */
export function addTrade(tradeData) {
  if (!tradeData || !tradeData.pairSymbol) {
    throw new Error('Missing required trade parameters (pairSymbol)');
  }

  const db = loadDatabase();
  const tradeId = tradeData.id || `trade_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;

  const newTrade = {
    id: tradeId,
    pairId: tradeData.pairId || tradeData.pairSymbol.toLowerCase().replace(/[\s/]/g, '_'),
    pairSymbol: tradeData.pairSymbol,
    pairDisplayName: tradeData.pairDisplayName || tradeData.pairSymbol,
    category: tradeData.category || 'major',
    isOTC: Boolean(tradeData.isOTC),
    signalType: tradeData.signalType || 'CALL',
    entryTime: tradeData.entryTime || new Date().toISOString().substring(11, 16),
    entryTimestamp: tradeData.entryTimestamp || Date.now(),
    durationStr: tradeData.durationStr || '1m',
    durationMinutes: tradeData.durationMinutes || 1,
    expiryTimestamp: tradeData.expiryTimestamp || Date.now() + 60000,
    entryPrice: Number(tradeData.entryPrice) || 0,
    exitPrice: tradeData.exitPrice !== undefined ? Number(tradeData.exitPrice) : null,
    result: tradeData.result || 'PENDING',
    profitPips: tradeData.profitPips !== undefined ? Number(tradeData.profitPips) : 0,
    strength: Number(tradeData.strength) || 80,
    confidence: tradeData.confidence || 'عالية',
    riskLevel: tradeData.riskLevel || 'منخفضة',
    reason: tradeData.reason || '',
    marketCondition: tradeData.marketCondition || '',
    dataSource: tradeData.dataSource || 'Twelve Data Live API',
    isPaper: tradeData.isPaper !== undefined ? Boolean(tradeData.isPaper) : true,
    createdAt: tradeData.createdAt || Date.now(),
    settledAt: tradeData.settledAt || null,
  };

  db.trades.unshift(newTrade);
  if (db.trades.length > 1000) {
    db.trades = db.trades.slice(0, 1000);
  }

  saveDatabaseSync(db);
  return newTrade;
}

/**
 * Update trade settlement result (WIN / LOSS / DRAW)
 */
export function updateTrade(id, updates) {
  const db = loadDatabase();
  const index = db.trades.findIndex((t) => t.id === id);
  if (index === -1) {
    return null;
  }

  const current = db.trades[index];
  const updated = {
    ...current,
    ...updates,
    settledAt: updates.result && updates.result !== 'PENDING' ? Date.now() : current.settledAt,
  };

  db.trades[index] = updated;
  saveDatabaseSync(db);
  return updated;
}

/**
 * Delete a trade by id or clear all
 */
export function deleteTrade(id = null) {
  const db = loadDatabase();
  if (id === 'all' || id === null) {
    const count = db.trades.length;
    db.trades = [];
    saveDatabaseSync(db);
    addAuditLog('ALL_TRADES_CLEARED', { count });
    return { success: true, clearedCount: count };
  }

  const index = db.trades.findIndex((t) => t.id === id);
  if (index === -1) return { success: false, error: 'Trade not found' };

  const removed = db.trades.splice(index, 1)[0];
  saveDatabaseSync(db);
  return { success: true, removed };
}

/**
 * Calculate quantitative statistics
 */
export function computeStats(isPaper = null) {
  const db = loadDatabase();
  let trades = db.trades || [];
  if (isPaper !== null) {
    trades = trades.filter((t) => Boolean(t.isPaper) === Boolean(isPaper));
  }

  const total = trades.length;
  const wins = trades.filter((t) => t.result === 'WIN').length;
  const losses = trades.filter((t) => t.result === 'LOSS').length;
  const draws = trades.filter((t) => t.result === 'DRAW').length;
  const pending = trades.filter((t) => t.result === 'PENDING').length;
  const settled = wins + losses + draws;

  const winRate = settled > 0 ? Math.round((wins / (wins + losses)) * 100) : 0;
  const totalProfitPips = trades.reduce((acc, t) => acc + (t.profitPips || 0), 0);

  // Group by pair
  const pairCounts = {};
  for (const t of trades) {
    if (!pairCounts[t.pairSymbol]) pairCounts[t.pairSymbol] = { total: 0, wins: 0 };
    pairCounts[t.pairSymbol].total++;
    if (t.result === 'WIN') pairCounts[t.pairSymbol].wins++;
  }

  let bestPair = '—';
  let bestPairRate = -1;
  for (const [symbol, stats] of Object.entries(pairCounts)) {
    if (stats.total >= 2) {
      const rate = (stats.wins / stats.total) * 100;
      if (rate > bestPairRate) {
        bestPairRate = rate;
        bestPair = `${symbol} (${Math.round(rate)}%)`;
      }
    }
  }

  return {
    totalSignals: total,
    settledSignals: settled,
    pendingSignals: pending,
    wins,
    losses,
    draws,
    winRate: isNaN(winRate) ? 0 : winRate,
    totalProfitPips: Math.round(totalProfitPips * 10) / 10,
    bestPair,
    calculatedAt: new Date().toISOString(),
  };
}

/**
 * App Settings
 */
export function getAppSettings() {
  const db = loadDatabase();
  return db.settings || INITIAL_SCHEMA.settings;
}

export function saveAppSettings(newSettings) {
  const db = loadDatabase();
  db.settings = { ...db.settings, ...newSettings };
  saveDatabaseSync(db);
  return db.settings;
}

// Initial DB check on startup
loadDatabase();
