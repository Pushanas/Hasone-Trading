// backend/src/routes/analyze.ts
// Comprehensive Multi-Factor Analysis Route (Technical + Patterns + Gemini AI)

import express, { Request, Response } from 'express';
import { DataMerger } from '../services/data-providers/dataMerger';
import { TechnicalEngine } from '../services/analysis/technicalEngine';
import { CandlePatternEngine } from '../services/analysis/candlePatternEngine';
import { GeminiAnalyzer } from '../services/analysis/geminiAnalyzer';
import { FullAnalysisReport, MarketPair, SignalDirection } from '../../../shared/types';
import { createLogger } from '../utils/logger';

const router = express.Router();
const logger = createLogger('AnalyzeRoute');

router.get('/', async (req: Request, res: Response) => {
  const pairName = String(req.query.pair || 'EUR/USD OTC').trim();
  const interval = String(req.query.interval || '1min').trim();
  const outputsize = Math.min(100, Math.max(15, parseInt(String(req.query.outputsize || '30'), 10)));

  const t0 = Date.now();
  logger.info(`Analysis requested for ${pairName} (${interval})`);

  try {
    // 1. Fetch market data via intelligent merger
    const marketData = await DataMerger.getPairData(pairName, interval, outputsize);

    // 2. Compute technical indicators
    const indicators = TechnicalEngine.calculateAll(marketData.candles);

    // 3. Detect candlestick patterns
    const patterns = CandlePatternEngine.detectPatterns(marketData.candles);

    // 4. Run Gemini AI Financial Analysis
    const geminiAi = await GeminiAnalyzer.analyzeMarket(
      pairName,
      interval,
      marketData.currentPrice,
      marketData.candles,
      indicators,
      patterns
    );

    // 5. Calculate multi-indicator confluence score
    let callVotes = 0;
    let putVotes = 0;
    let totalChecked = 6;

    if (indicators.rsiSignal === 'OVERSOLD') callVotes++;
    if (indicators.rsiSignal === 'OVERBOUGHT') putVotes++;

    if (indicators.macd.trend === 'CROSS_UP' || indicators.macd.trend === 'BULLISH') callVotes++;
    if (indicators.macd.trend === 'CROSS_DOWN' || indicators.macd.trend === 'BEARISH') putVotes++;

    if (indicators.bollingerBands.percentB <= 0.15) callVotes++;
    if (indicators.bollingerBands.percentB >= 0.85) putVotes++;

    if (indicators.ema.trend === 'BULLISH') callVotes++;
    if (indicators.ema.trend === 'BEARISH') putVotes++;

    const hasBullishPattern = patterns.some((p) => p.type === 'BULLISH');
    const hasBearishPattern = patterns.some((p) => p.type === 'BEARISH');
    if (hasBullishPattern) callVotes++;
    if (hasBearishPattern) putVotes++;

    if (geminiAi.recommendation === 'CALL') callVotes++;
    if (geminiAi.recommendation === 'PUT') putVotes++;

    let direction: SignalDirection = 'NEUTRAL';
    let confluenceCount = 0;
    let confidence = 75;

    if (callVotes > putVotes && callVotes >= 3) {
      direction = 'CALL';
      confluenceCount = callVotes;
      confidence = Math.min(97, Math.max(76, 75 + confluenceCount * 4));
    } else if (putVotes > callVotes && putVotes >= 3) {
      direction = 'PUT';
      confluenceCount = putVotes;
      confidence = Math.min(97, Math.max(76, 75 + confluenceCount * 4));
    } else {
      direction = 'NEUTRAL';
      confluenceCount = Math.max(callVotes, putVotes);
      confidence = 65;
    }

    const pairObj: MarketPair = {
      id: pairName.toLowerCase().replace(/[^a-z0-9]/g, '_'),
      name: pairName,
      base: pairName.split('/')[0] || 'EUR',
      quote: (pairName.split('/')[1] || 'USD').replace(' OTC', ''),
      category: marketData.isOtc ? 'otc' : 'forex',
      isOtc: marketData.isOtc,
      payout: marketData.isOtc ? 92 : 85,
      isActive: true,
      decimalPlaces: pairName.includes('JPY') || pairName.includes('ARS') ? 3 : 5,
    };

    const report: FullAnalysisReport = {
      pair: pairObj,
      timeframe: interval,
      currentPrice: marketData.currentPrice,
      dataSource: marketData.dataSource,
      isRealApi: marketData.isRealApi,
      candles: marketData.candles,
      indicators,
      detectedPatterns: patterns,
      geminiAi,
      signal: {
        direction,
        confidence,
        confluenceCount,
        totalChecked,
        recommendedDuration: interval === '1min' ? '1 دقيقة (شمعة واحدة)' : '5 دقائق',
      },
      meta: {
        timestamp: Date.now(),
        latencyMs: Date.now() - t0,
        engineVersion: 'Hasone Ultra Hybrid v3.5',
      },
    };

    return res.json({
      success: true,
      report,
    });
  } catch (err: any) {
    logger.error('Analysis pipeline failure', err);
    return res.status(500).json({
      success: false,
      error: `Analysis failed: ${err.message}`,
    });
  }
});

export default router;
