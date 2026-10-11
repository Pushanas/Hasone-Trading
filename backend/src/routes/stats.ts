// backend/src/routes/stats.ts
// Trading Performance Stats & Signal History Routes

import express, { Request, Response } from 'express';
import { signalHistoryService } from '../services/signal-history';

const router = express.Router();

router.get('/summary', (_req: Request, res: Response) => {
  const stats = signalHistoryService.getStats();
  res.json({
    success: true,
    stats,
    timestamp: Date.now(),
  });
});

router.get('/history', (req: Request, res: Response) => {
  const limit = parseInt(String(req.query.limit || '50'), 10);
  const signals = signalHistoryService.getSignals(limit);
  const stats = signalHistoryService.getStats();

  res.json({
    success: true,
    count: signals.length,
    signals,
    stats,
    timestamp: Date.now(),
  });
});

export default router;
