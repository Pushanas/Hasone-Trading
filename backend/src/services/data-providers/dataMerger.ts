// backend/src/services/data-providers/dataMerger.ts
// Intelligent Data Merger combining Twelve Data Forex APIs and Quotex OTC WebSocket Feeds

import { twelveDataService } from './twelveDataService';
import { quotexWebSocketService } from './quotexWebSocket';
import { Candle } from '../../../../shared/types';
import { createLogger } from '../../utils/logger';

const logger = createLogger('DataMerger');

export interface MergedMarketData {
  pair: string;
  isOtc: boolean;
  dataSource: 'TWELVE_DATA_API' | 'QUOTEX_OTC_GATEWAY' | 'AGGREGATED_STREAM';
  isRealApi: boolean;
  candles: Candle[];
  currentPrice: number;
  latencyMs: number;
  creditsLeft?: number;
  error?: string;
}

export class DataMerger {
  public static async getPairData(
    pairName: string,
    interval: string = '1min',
    outputsize: number = 30
  ): Promise<MergedMarketData> {
    const isOtc = pairName.toUpperCase().includes('OTC');
    const cleanPair = pairName.trim();

    // 1. OTC pairs -> Route to Quotex OTC Gateway
    if (isOtc) {
      const liveRate = quotexWebSocketService.getRate(cleanPair) || 1.12053;
      const candles = quotexWebSocketService.generateAggregatedCandles(cleanPair, outputsize, 1);

      return {
        pair: cleanPair,
        isOtc: true,
        dataSource: 'QUOTEX_OTC_GATEWAY',
        isRealApi: false, // Transparent disclosure: OTC broker-modeled
        candles,
        currentPrice: liveRate,
        latencyMs: 15,
      };
    }

    // 2. Real Forex pairs -> Route to Twelve Data Service
    const twelveSymbol = cleanPair.replace(/_/g, '/').replace(/-/g, '/').toUpperCase();
    const result = await twelveDataService.getCandles(twelveSymbol, interval, outputsize);

    if (result.success && result.candles.length > 0) {
      const currentPrice = result.candles[result.candles.length - 1].close;
      return {
        pair: cleanPair,
        isOtc: false,
        dataSource: 'TWELVE_DATA_API',
        isRealApi: true,
        candles: result.candles,
        currentPrice,
        latencyMs: result.latencyMs,
        creditsLeft: result.creditsLeft,
      };
    }

    // 3. Fallback if Twelve Data quota is exhausted
    logger.warn(`Twelve Data unavailable for ${cleanPair} (${result.error}), falling back to resilient stream`);
    const fallbackCandles = quotexWebSocketService.generateAggregatedCandles(cleanPair, outputsize, 1);
    const currentPrice = fallbackCandles[fallbackCandles.length - 1].close;

    return {
      pair: cleanPair,
      isOtc: false,
      dataSource: 'AGGREGATED_STREAM',
      isRealApi: false,
      candles: fallbackCandles,
      currentPrice,
      latencyMs: result.latencyMs,
      creditsLeft: result.creditsLeft,
      error: result.error,
    };
  }
}

export default DataMerger;
