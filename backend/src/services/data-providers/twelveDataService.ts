// backend/src/services/data-providers/twelveDataService.ts
// Official Rate-Limited Client for Twelve Data Global Forex & Market Feeds

import { createLogger } from '../../utils/logger';
import { normalizeInterval } from '../../utils/helper';
import { Candle } from '../../../../shared/types';

const logger = createLogger('TwelveDataService');

export interface TwelveDataResponse {
  success: boolean;
  candles: Candle[];
  symbol: string;
  interval: string;
  cached: boolean;
  creditsLeft?: number;
  creditsUsed?: number;
  latencyMs: number;
  error?: string;
}

class TwelveDataService {
  private cache = new Map<string, { candles: Candle[]; timestamp: number; creditsLeft?: number }>();
  private readonly CACHE_TTL_MS = 20000; // 20s cache window to protect 8-request/min quota

  private getApiKey(): string {
    return process.env.TWELVE_DATA_API_KEY || '50afb2495f3e4384a3fea5960a7a202e';
  }

  public async getCandles(
    symbol: string = 'EUR/USD',
    interval: string = '1min',
    outputsize: number = 30
  ): Promise<TwelveDataResponse> {
    const cleanInterval = normalizeInterval(interval);
    const cleanSymbol = symbol.trim().toUpperCase();
    const cacheKey = `${cleanSymbol}:${cleanInterval}:${outputsize}`;

    // 1. Check in-memory cache
    const cachedEntry = this.cache.get(cacheKey);
    if (cachedEntry && Date.now() - cachedEntry.timestamp < this.CACHE_TTL_MS) {
      return {
        success: true,
        candles: cachedEntry.candles,
        symbol: cleanSymbol,
        interval: cleanInterval,
        cached: true,
        creditsLeft: cachedEntry.creditsLeft,
        latencyMs: 5,
      };
    }

    const apiKey = this.getApiKey();
    const url = `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(
      cleanSymbol
    )}&interval=${cleanInterval}&outputsize=${outputsize}&apikey=${apiKey}`;

    const startTime = Date.now();
    logger.info(`Fetching candles for ${cleanSymbol} (${cleanInterval}, size: ${outputsize})`);

    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(7000) });
      const latencyMs = Date.now() - startTime;
      const creditsLeft = response.headers.get('api-credits-left') ? parseInt(response.headers.get('api-credits-left')!, 10) : undefined;
      const creditsUsed = response.headers.get('api-credits-used') ? parseInt(response.headers.get('api-credits-used')!, 10) : undefined;

      const data = await response.json();

      if (!response.ok || data.status === 'error' || data.code === 429) {
        const errorMsg = data.message || `HTTP ${response.status} Error`;
        logger.warn(`Twelve Data request failed: ${errorMsg}`);
        return {
          success: false,
          candles: [],
          symbol: cleanSymbol,
          interval: cleanInterval,
          cached: false,
          creditsLeft: 0,
          latencyMs,
          error: errorMsg,
        };
      }

      if (Array.isArray(data.values) && data.values.length > 0) {
        const candles: Candle[] = data.values.map((v: any) => ({
          datetime: v.datetime,
          timestamp: new Date(v.datetime).getTime(),
          open: parseFloat(v.open),
          high: parseFloat(v.high),
          low: parseFloat(v.low),
          close: parseFloat(v.close),
          volume: v.volume ? parseFloat(v.volume) : undefined,
        }));

        // Sort ascending by time
        candles.sort((a, b) => a.timestamp - b.timestamp);

        // Cache result
        this.cache.set(cacheKey, {
          candles,
          timestamp: Date.now(),
          creditsLeft,
        });

        return {
          success: true,
          candles,
          symbol: cleanSymbol,
          interval: cleanInterval,
          cached: false,
          creditsLeft,
          creditsUsed,
          latencyMs,
        };
      }

      return {
        success: false,
        candles: [],
        symbol: cleanSymbol,
        interval: cleanInterval,
        cached: false,
        latencyMs,
        error: 'No values array in upstream response',
      };
    } catch (err: any) {
      const latencyMs = Date.now() - startTime;
      logger.error(`Twelve Data request exception: ${err.message}`);
      return {
        success: false,
        candles: [],
        symbol: cleanSymbol,
        interval: cleanInterval,
        cached: false,
        latencyMs,
        error: err.message,
      };
    }
  }

  public async getLivePrice(symbol: string = 'EUR/USD'): Promise<{ price: number | null; latencyMs: number; error?: string }> {
    const res = await this.getCandles(symbol, '1min', 1);
    if (res.success && res.candles.length > 0) {
      return {
        price: res.candles[res.candles.length - 1].close,
        latencyMs: res.latencyMs,
      };
    }
    return {
      price: null,
      latencyMs: res.latencyMs,
      error: res.error,
    };
  }
}

export const twelveDataService = new TwelveDataService();
export default twelveDataService;
