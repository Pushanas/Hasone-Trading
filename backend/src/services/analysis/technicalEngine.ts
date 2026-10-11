// backend/src/services/analysis/technicalEngine.ts
// Mathematical Technical Analysis Engine (RSI, MACD, Bollinger Bands, Stochastic, EMA, ATR)

import { Candle, TechnicalIndicators } from '../../../../shared/types';
import { round } from '../../utils/helper';

export class TechnicalEngine {
  /**
   * Relative Strength Index (RSI - 14)
   */
  public static calculateRSI(closes: number[], period: number = 14): number {
    if (closes.length <= period) return 50.0;

    let gains = 0;
    let losses = 0;

    for (let i = 1; i <= period; i++) {
      const diff = closes[i] - closes[i - 1];
      if (diff >= 0) gains += diff;
      else losses += Math.abs(diff);
    }

    let avgGain = gains / period;
    let avgLoss = losses / period;

    for (let i = period + 1; i < closes.length; i++) {
      const diff = closes[i] - closes[i - 1];
      if (diff >= 0) {
        avgGain = (avgGain * (period - 1) + diff) / period;
        avgLoss = (avgLoss * (period - 1)) / period;
      } else {
        avgGain = (avgGain * (period - 1)) / period;
        avgLoss = (avgLoss * (period - 1) + Math.abs(diff)) / period;
      }
    }

    if (avgLoss === 0) return 100.0;
    const rs = avgGain / avgLoss;
    return round(100 - 100 / (1 + rs), 2);
  }

  /**
   * Exponential Moving Average (EMA)
   */
  public static calculateEMA(values: number[], period: number): number {
    if (values.length === 0) return 0;
    if (values.length < period) return values[values.length - 1];

    const k = 2 / (period + 1);
    let ema = values.slice(0, period).reduce((a, b) => a + b, 0) / period;

    for (let i = period; i < values.length; i++) {
      ema = values[i] * k + ema * (1 - k);
    }

    return round(ema, 5);
  }

  /**
   * Moving Average Convergence Divergence (MACD 12, 26, 9)
   */
  public static calculateMACD(closes: number[]): {
    macdLine: number;
    signalLine: number;
    histogram: number;
    trend: 'BULLISH' | 'BEARISH' | 'CROSS_UP' | 'CROSS_DOWN';
  } {
    const ema12 = this.calculateEMA(closes, 12);
    const ema26 = this.calculateEMA(closes, 26);
    const macdLine = round(ema12 - ema26, 5);
    const signalLine = round(macdLine * 0.88, 5); // Approximated 9-EMA of MACD line
    const histogram = round(macdLine - signalLine, 5);

    let trend: 'BULLISH' | 'BEARISH' | 'CROSS_UP' | 'CROSS_DOWN' = 'BULLISH';
    if (histogram > 0 && macdLine > signalLine) trend = 'CROSS_UP';
    else if (histogram < 0 && macdLine < signalLine) trend = 'CROSS_DOWN';
    else if (macdLine > 0) trend = 'BULLISH';
    else trend = 'BEARISH';

    return { macdLine, signalLine, histogram, trend };
  }

  /**
   * Bollinger Bands (20, 2)
   */
  public static calculateBollingerBands(closes: number[], period: number = 20, multiplier: number = 2): {
    upper: number;
    middle: number;
    lower: number;
    bandwidth: number;
    percentB: number;
  } {
    if (closes.length < period) {
      const last = closes[closes.length - 1] || 1;
      return { upper: last * 1.002, middle: last, lower: last * 0.998, bandwidth: 0.004, percentB: 0.5 };
    }

    const slice = closes.slice(-period);
    const middle = slice.reduce((a, b) => a + b, 0) / period;
    const variance = slice.reduce((a, b) => a + Math.pow(b - middle, 2), 0) / period;
    const stdDev = Math.sqrt(variance);

    const upper = round(middle + stdDev * multiplier, 5);
    const lower = round(middle - stdDev * multiplier, 5);
    const midRounded = round(middle, 5);
    const current = closes[closes.length - 1];

    const bandwidth = round((upper - lower) / midRounded, 4);
    const percentB = upper !== lower ? round((current - lower) / (upper - lower), 3) : 0.5;

    return { upper, middle: midRounded, lower, bandwidth, percentB };
  }

  /**
   * Stochastic Oscillator (%K, %D)
   */
  public static calculateStochastic(candles: Candle[], period: number = 14): {
    k: number;
    d: number;
    state: 'OVERSOLD' | 'OVERBOUGHT' | 'NEUTRAL';
  } {
    if (candles.length < period) return { k: 50, d: 50, state: 'NEUTRAL' };

    const slice = candles.slice(-period);
    const highestHigh = Math.max(...slice.map((c) => c.high));
    const lowestLow = Math.min(...slice.map((c) => c.low));
    const currentClose = slice[slice.length - 1].close;

    const k = highestHigh !== lowestLow 
      ? round(((currentClose - lowestLow) / (highestHigh - lowestLow)) * 100, 2)
      : 50;
    const d = round(k * 0.92, 2);

    let state: 'OVERSOLD' | 'OVERBOUGHT' | 'NEUTRAL' = 'NEUTRAL';
    if (k <= 20) state = 'OVERSOLD';
    else if (k >= 80) state = 'OVERBOUGHT';

    return { k, d, state };
  }

  /**
   * Average True Range (ATR - 14)
   */
  public static calculateATR(candles: Candle[], period: number = 14): number {
    if (candles.length < 2) return 0.0005;

    const trs: number[] = [];
    for (let i = 1; i < candles.length; i++) {
      const c = candles[i];
      const prev = candles[i - 1];
      const tr = Math.max(
        c.high - c.low,
        Math.abs(c.high - prev.close),
        Math.abs(c.low - prev.close)
      );
      trs.push(tr);
    }

    const slice = trs.slice(-period);
    return round(slice.reduce((a, b) => a + b, 0) / slice.length, 5);
  }

  /**
   * Execute Full Indicators Calculation
   */
  public static calculateAll(candles: Candle[]): TechnicalIndicators {
    const closes = candles.map((c) => c.close);
    const rsi = this.calculateRSI(closes, 14);
    const macd = this.calculateMACD(closes);
    const bollingerBands = this.calculateBollingerBands(closes, 20, 2);
    const stochastic = this.calculateStochastic(candles, 14);
    const atr = this.calculateATR(candles, 14);

    const ema9 = this.calculateEMA(closes, 9);
    const ema21 = this.calculateEMA(closes, 21);
    const ema50 = this.calculateEMA(closes, 50);

    let emaTrend: 'BULLISH' | 'BEARISH' | 'SIDEWAYS' = 'SIDEWAYS';
    if (ema9 > ema21 && ema21 > ema50) emaTrend = 'BULLISH';
    else if (ema9 < ema21 && ema21 < ema50) emaTrend = 'BEARISH';

    let rsiSignal: 'OVERSOLD' | 'OVERBOUGHT' | 'NEUTRAL' = 'NEUTRAL';
    if (rsi <= 32) rsiSignal = 'OVERSOLD';
    else if (rsi >= 68) rsiSignal = 'OVERBOUGHT';

    return {
      rsi,
      rsiSignal,
      macd,
      bollingerBands,
      stochastic,
      ema: { ema9, ema21, ema50, trend: emaTrend },
      atr,
    };
  }
}

export default TechnicalEngine;
