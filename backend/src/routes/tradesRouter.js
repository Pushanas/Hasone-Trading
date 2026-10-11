// backend/src/routes/tradesRouter.js
// Express API Router for Hasone Trading database operations, trade tracking, and backups

import express from 'express';
import {
  getTrades,
  addTrade,
  updateTrade,
  deleteTrade,
  computeStats,
  createBackup,
  getAppSettings,
  saveAppSettings,
} from '../db/repository.js';

const tradesRouter = express.Router();

/**
 * GET /api/trades - List recorded trades with optional filters
 */
tradesRouter.get('/', (req, res) => {
  try {
    const filter = {
      pair: req.query.pair ? String(req.query.pair) : undefined,
      result: req.query.result ? String(req.query.result) : undefined,
      signalType: req.query.signalType ? String(req.query.signalType) : undefined,
      paperMode: req.query.paperMode !== undefined ? req.query.paperMode === 'true' : undefined,
    };
    const trades = getTrades(filter);
    return res.json({
      success: true,
      count: trades.length,
      trades,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/trades - Record a new trade
 */
tradesRouter.post('/', (req, res) => {
  try {
    const trade = addTrade(req.body);
    return res.status(201).json({
      success: true,
      trade,
    });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * PUT /api/trades/:id - Settle or update trade result
 */
tradesRouter.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const updated = updateTrade(id, req.body);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Trade not found' });
    }
    return res.json({
      success: true,
      trade: updated,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * DELETE /api/trades/:id - Delete single trade or clear all
 */
tradesRouter.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const result = deleteTrade(id);
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/trades/stats - Aggregate stats
 */
tradesRouter.get('/stats', (req, res) => {
  try {
    const isPaper = req.query.paperMode !== undefined ? req.query.paperMode === 'true' : null;
    const stats = computeStats(isPaper);
    return res.json({
      success: true,
      stats,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/trades/backup - Trigger instant backup
 */
tradesRouter.post('/backup', (req, res) => {
  try {
    const reason = req.body?.reason || 'user_requested';
    const backup = createBackup(reason);
    return res.json(backup);
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/trades/export - Export trades as CSV
 */
tradesRouter.get('/export', (req, res) => {
  try {
    const trades = getTrades();
    const headers = ['ID', 'Pair', 'Direction', 'EntryTime', 'Duration', 'EntryPrice', 'ExitPrice', 'Result', 'ProfitPips', 'Strength', 'DataSource', 'PaperMode', 'Date'];
    const rows = trades.map((t) => [
      t.id,
      t.pairSymbol,
      t.signalType,
      t.entryTime,
      t.durationStr,
      t.entryPrice,
      t.exitPrice ?? '',
      t.result,
      t.profitPips ?? 0,
      t.strength,
      `"${t.dataSource.replace(/"/g, '""')}"`,
      t.isPaper ? 'YES' : 'NO',
      new Date(t.createdAt).toISOString(),
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=hasone_trades_${Date.now()}.csv`);
    return res.send(csvContent);
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET & POST /api/settings - Settings synchronization
 */
tradesRouter.get('/settings', (_req, res) => {
  return res.json({ success: true, settings: getAppSettings() });
});

tradesRouter.post('/settings', (req, res) => {
  try {
    const saved = saveAppSettings(req.body);
    return res.json({ success: true, settings: saved });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

export default tradesRouter;
