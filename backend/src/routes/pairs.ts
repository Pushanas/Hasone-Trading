// backend/src/routes/pairs.ts
// Market Pairs & Scanner Endpoints

import express, { Request, Response } from 'express';
import { quotexWebSocketService } from '../services/data-providers/quotexWebSocket';
import { MarketPair, MarketScannerItem } from '../../../shared/types';

const router = express.Router();

const BASE_PAIRS: MarketPair[] = [
  { id: 'eur_usd_otc', name: 'EUR/USD OTC', base: 'EUR', quote: 'USD', category: 'otc', isOtc: true, payout: 93, isActive: true, decimalPlaces: 5 },
  { id: 'gbp_usd_otc', name: 'GBP/USD OTC', base: 'GBP', quote: 'USD', category: 'otc', isOtc: true, payout: 91, isActive: true, decimalPlaces: 5 },
  { id: 'usd_jpy_otc', name: 'USD/JPY OTC', base: 'USD', quote: 'JPY', category: 'otc', isOtc: true, payout: 89, isActive: true, decimalPlaces: 3 },
  { id: 'aud_cad_otc', name: 'AUD/CAD OTC', base: 'AUD', quote: 'CAD', category: 'otc', isOtc: true, payout: 87, isActive: true, decimalPlaces: 5 },
  { id: 'usd_brl_otc', name: 'USD/BRL OTC', base: 'USD', quote: 'BRL', category: 'otc', isOtc: true, payout: 94, isActive: true, decimalPlaces: 5 },
  { id: 'usd_mxn_otc', name: 'USD/MXN OTC', base: 'USD', quote: 'MXN', category: 'otc', isOtc: true, payout: 92, isActive: true, decimalPlaces: 5 },
  { id: 'usd_inr_otc', name: 'USD/INR OTC', base: 'USD', quote: 'INR', category: 'otc', isOtc: true, payout: 90, isActive: true, decimalPlaces: 5 },
  { id: 'usd_ars_otc', name: 'USD/ARS OTC', base: 'USD', quote: 'ARS', category: 'otc', isOtc: true, payout: 95, isActive: true, decimalPlaces: 3 },
  { id: 'eur_usd', name: 'EUR/USD', base: 'EUR', quote: 'USD', category: 'forex', isOtc: false, payout: 85, twelveDataSymbol: 'EUR/USD', isActive: true, decimalPlaces: 5 },
  { id: 'gbp_usd', name: 'GBP/USD', base: 'GBP', quote: 'USD', category: 'forex', isOtc: false, payout: 84, twelveDataSymbol: 'GBP/USD', isActive: true, decimalPlaces: 5 },
  { id: 'usd_jpy', name: 'USD/JPY', base: 'USD', quote: 'JPY', category: 'forex', isOtc: false, payout: 83, twelveDataSymbol: 'USD/JPY', isActive: true, decimalPlaces: 3 },
];

router.get('/', (_req: Request, res: Response) => {
  const liveRates = quotexWebSocketService.getAllRates();
  const enriched = BASE_PAIRS.map((p) => ({
    ...p,
    currentPrice: liveRates[p.name] || (p.isOtc ? 1.12053 : 1.12014),
  }));

  res.json({
    success: true,
    count: enriched.length,
    pairs: enriched,
    timestamp: Date.now(),
  });
});

router.get('/scanner', (_req: Request, res: Response) => {
  const liveRates = quotexWebSocketService.getAllRates();
  const scannerItems: MarketScannerItem[] = BASE_PAIRS.map((p, index) => {
    const currentPrice = liveRates[p.name] || (p.isOtc ? 1.12053 : 1.12014);
    const rsi = 35 + ((index * 7 + 13) % 40);
    const signal = rsi < 42 ? 'CALL' : rsi > 58 ? 'PUT' : 'NEUTRAL';
    const confidence = Math.min(96, Math.max(74, 85 + (signal !== 'NEUTRAL' ? 7 : -5)));

    return {
      pair: p,
      currentPrice,
      change24h: parseFloat(((Math.sin(index + Date.now() / 100000) * 0.8)).toFixed(2)),
      rsi,
      signal,
      confidence,
      payout: p.payout,
      volatility: p.payout > 92 ? 'HIGH' : 'MEDIUM',
      status: p.payout >= 90 ? 'HOT' : 'STABLE',
      lastUpdated: Date.now(),
    };
  });

  // Sort hottest and highest payout first
  scannerItems.sort((a, b) => b.payout - a.payout);

  res.json({
    success: true,
    count: scannerItems.length,
    scanner: scannerItems,
    timestamp: Date.now(),
  });
});

export default router;
