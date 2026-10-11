// Hasone Trading - High-Precision Quantitative Technical Indicators & Price Action Engine

export interface Candle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface IndicatorSnapshot {
  rsi14: number;
  macd: {
    macdLine: number;
    signalLine: number;
    histogram: number;
    isBullishCross: boolean;
    isBearishCross: boolean;
  };
  ema: {
    ema9: number;
    ema21: number;
    ema50: number;
    ema100: number;
    isBullishStack: boolean; // ema9 > ema21 > ema50
    isBearishStack: boolean; // ema9 < ema21 < ema50
  };
  sma: {
    sma7: number;
    sma14: number;
    sma50: number;
  };
  bollinger: {
    upper: number;
    middle: number;
    lower: number;
    percentB: number;
    bandwidth: number;
    isOverbought: boolean;
    isOversold: boolean;
  };
  stochastic: {
    k: number;
    d: number;
    isOverbought: boolean;
    isOversold: boolean;
    isBullishCross: boolean;
    isBearishCross: boolean;
  };
  atr14: number;
  adx14: {
    adx: number;
    plusDI: number;
    minusDI: number;
    isStrongTrend: boolean; // adx >= 25
    isChoppy: boolean;      // adx < 20
  };
  cci20: number;
  williamsR14: number;
  priceAction: {
    nearestSupport: number;
    nearestResistance: number;
    distToSupportPips: number;
    distToResistancePips: number;
    isBouncingSupport: boolean;
    isRejectingResistance: boolean;
    isConsolidating: boolean;
  };
  candlestickPattern: {
    patternName: string;
    bias: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    reliability: 'HIGH' | 'MEDIUM' | 'LOW';
  };
}

// 1. Calculate Simple Moving Average (SMA)
export function calculateSMA(data: number[], period: number): number {
  if (data.length < period) return data[data.length - 1] || 0;
  const slice = data.slice(-period);
  const sum = slice.reduce((a, b) => a + b, 0);
  return sum / period;
}

// 2. Calculate Exponential Moving Average (EMA)
export function calculateEMA(data: number[], period: number): number {
  if (data.length === 0) return 0;
  if (data.length < period) return calculateSMA(data, data.length);

  const k = 2 / (period + 1);
  let ema = calculateSMA(data.slice(0, period), period);
  for (let i = period; i < data.length; i++) {
    ema = data[i] * k + ema * (1 - k);
  }
  return ema;
}

// 3. Calculate Relative Strength Index (RSI 14)
export function calculateRSI(closes: number[], period: number = 14): number {
  if (closes.length < period + 1) return 50;

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

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return Math.round((100 - 100 / (1 + rs)) * 100) / 100;
}

// 4. Calculate MACD (12, 26, 9)
export function calculateMACD(closes: number[]) {
  if (closes.length < 35) {
    return { macdLine: 0, signalLine: 0, histogram: 0, isBullishCross: false, isBearishCross: false };
  }

  const ema12 = calculateEMA(closes, 12);
  const ema26 = calculateEMA(closes, 26);
  const macdLine = ema12 - ema26;

  // Signal line is 9 EMA of MACD
  const macdHistory: number[] = [];
  const k12 = 2 / (12 + 1);
  const k26 = 2 / (26 + 1);
  let curEma12 = calculateSMA(closes.slice(0, 12), 12);
  let curEma26 = calculateSMA(closes.slice(0, 26), 26);

  for (let i = 26; i < closes.length; i++) {
    curEma12 = closes[i] * k12 + curEma12 * (1 - k12);
    curEma26 = closes[i] * k26 + curEma26 * (1 - k26);
    macdHistory.push(curEma12 - curEma26);
  }

  const signalLine = calculateEMA(macdHistory, 9);
  const histogram = macdLine - signalLine;

  const prevMacd = macdHistory.length > 2 ? macdHistory[macdHistory.length - 2] : macdLine;
  const isBullishCross = prevMacd <= signalLine && macdLine > signalLine;
  const isBearishCross = prevMacd >= signalLine && macdLine < signalLine;

  return {
    macdLine: Math.round(macdLine * 100000) / 100000,
    signalLine: Math.round(signalLine * 100000) / 100000,
    histogram: Math.round(histogram * 100000) / 100000,
    isBullishCross,
    isBearishCross,
  };
}

// 5. Calculate Bollinger Bands (20, 2)
export function calculateBollingerBands(closes: number[], period: number = 20, multiplier: number = 2) {
  if (closes.length < period) {
    const p = closes[closes.length - 1] || 1;
    return { upper: p, middle: p, lower: p, percentB: 0.5, bandwidth: 0, isOverbought: false, isOversold: false };
  }

  const middle = calculateSMA(closes, period);
  const slice = closes.slice(-period);
  const variance = slice.reduce((sum, val) => sum + Math.pow(val - middle, 2), 0) / period;
  const stdDev = Math.sqrt(variance);

  const upper = middle + multiplier * stdDev;
  const lower = middle - multiplier * stdDev;
  const lastClose = closes[closes.length - 1];
  const percentB = upper !== lower ? (lastClose - lower) / (upper - lower) : 0.5;
  const bandwidth = middle !== 0 ? (upper - lower) / middle : 0;

  return {
    upper: Math.round(upper * 100000) / 100000,
    middle: Math.round(middle * 100000) / 100000,
    lower: Math.round(lower * 100000) / 100000,
    percentB: Math.round(percentB * 100) / 100,
    bandwidth: Math.round(bandwidth * 10000) / 10000,
    isOverbought: percentB >= 0.95,
    isOversold: percentB <= 0.05,
  };
}

// 6. Calculate Stochastic Oscillator (14, 3, 3)
export function calculateStochastic(candles: Candle[], kPeriod: number = 14, dPeriod: number = 3) {
  if (candles.length < kPeriod + dPeriod) {
    return { k: 50, d: 50, isOverbought: false, isOversold: false, isBullishCross: false, isBearishCross: false };
  }

  const kValues: number[] = [];
  for (let i = kPeriod; i <= candles.length; i++) {
    const slice = candles.slice(i - kPeriod, i);
    const highestHigh = Math.max(...slice.map((c) => c.high));
    const lowestLow = Math.min(...slice.map((c) => c.low));
    const currentClose = slice[slice.length - 1].close;

    const rawK = highestHigh !== lowestLow ? ((currentClose - lowestLow) / (highestHigh - lowestLow)) * 100 : 50;
    kValues.push(rawK);
  }

  const k = calculateSMA(kValues, 3);
  const d = calculateSMA(kValues, dPeriod);
  const prevK = kValues.length > 2 ? kValues[kValues.length - 2] : k;

  return {
    k: Math.round(k * 10) / 10,
    d: Math.round(d * 10) / 10,
    isOverbought: k >= 80,
    isOversold: k <= 20,
    isBullishCross: prevK <= d && k > d && k < 40,
    isBearishCross: prevK >= d && k < d && k > 60,
  };
}

// 7. Calculate Average True Range (ATR 14)
export function calculateATR(candles: Candle[], period: number = 14): number {
  if (candles.length < 2) return 0.0005;

  const trValues: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const current = candles[i];
    const prev = candles[i - 1];
    const tr = Math.max(
      current.high - current.low,
      Math.abs(current.high - prev.close),
      Math.abs(current.low - prev.close)
    );
    trValues.push(tr);
  }

  return calculateSMA(trValues, Math.min(period, trValues.length));
}

// 8. Calculate Average Directional Index (ADX 14)
export function calculateADX(candles: Candle[], period: number = 14) {
  if (candles.length < period * 2) {
    return { adx: 24, plusDI: 20, minusDI: 20, isStrongTrend: false, isChoppy: true };
  }

  let plusDM = 0;
  let minusDM = 0;
  let trSum = 0;

  for (let i = 1; i <= period; i++) {
    const curr = candles[i];
    const prev = candles[i - 1];
    const highDiff = curr.high - prev.high;
    const lowDiff = prev.low - curr.low;

    if (highDiff > lowDiff && highDiff > 0) plusDM += highDiff;
    if (lowDiff > highDiff && lowDiff > 0) minusDM += lowDiff;

    trSum += Math.max(
      curr.high - curr.low,
      Math.abs(curr.high - prev.close),
      Math.abs(curr.low - prev.close)
    );
  }

  const plusDI = trSum !== 0 ? (plusDM / trSum) * 100 : 20;
  const minusDI = trSum !== 0 ? (minusDM / trSum) * 100 : 20;
  const dx = plusDI + minusDI !== 0 ? (Math.abs(plusDI - minusDI) / (plusDI + minusDI)) * 100 : 20;
  const adx = Math.round(dx * 10) / 10;

  return {
    adx,
    plusDI: Math.round(plusDI * 10) / 10,
    minusDI: Math.round(minusDI * 10) / 10,
    isStrongTrend: adx >= 25,
    isChoppy: adx < 20,
  };
}

// 9. Calculate Commodity Channel Index (CCI 20)
export function calculateCCI(candles: Candle[], period: number = 20): number {
  if (candles.length < period) return 0;
  const typicalPrices = candles.slice(-period).map((c) => (c.high + c.low + c.close) / 3);
  const smaTP = typicalPrices.reduce((a, b) => a + b, 0) / period;
  const meanDeviation = typicalPrices.reduce((acc, tp) => acc + Math.abs(tp - smaTP), 0) / period;

  if (meanDeviation === 0) return 0;
  const currentTP = typicalPrices[typicalPrices.length - 1];
  return Math.round(((currentTP - smaTP) / (0.015 * meanDeviation)) * 10) / 10;
}

// 10. Calculate Williams %R (14)
export function calculateWilliamsR(candles: Candle[], period: number = 14): number {
  if (candles.length < period) return -50;
  const slice = candles.slice(-period);
  const highestHigh = Math.max(...slice.map((c) => c.high));
  const lowestLow = Math.min(...slice.map((c) => c.low));
  const close = slice[slice.length - 1].close;

  if (highestHigh === lowestLow) return -50;
  return Math.round((((highestHigh - close) / (highestHigh - lowestLow)) * -100) * 10) / 10;
}

// 11. Support, Resistance, Supply & Demand Zones
export function calculateSupportResistance(candles: Candle[], currentPrice: number, pipDecimals: number) {
  if (candles.length < 20) {
    return {
      nearestSupport: currentPrice * 0.998,
      nearestResistance: currentPrice * 1.002,
      distToSupportPips: 20,
      distToResistancePips: 20,
      isBouncingSupport: false,
      isRejectingResistance: false,
      isConsolidating: false,
    };
  }

  const swingLows: number[] = [];
  const swingHighs: number[] = [];

  for (let i = 2; i < candles.length - 2; i++) {
    const c = candles[i];
    // Swing low
    if (
      c.low < candles[i - 1].low &&
      c.low < candles[i - 2].low &&
      c.low < candles[i + 1].low &&
      c.low < candles[i + 2].low
    ) {
      swingLows.push(c.low);
    }
    // Swing high
    if (
      c.high > candles[i - 1].high &&
      c.high > candles[i - 2].high &&
      c.high > candles[i + 1].high &&
      c.high > candles[i + 2].high
    ) {
      swingHighs.push(c.high);
    }
  }

  const supportsBelow = swingLows.filter((p) => p < currentPrice).sort((a, b) => b - a);
  const resistancesAbove = swingHighs.filter((p) => p > currentPrice).sort((a, b) => a - b);

  const nearestSupport = supportsBelow[0] || Math.min(...candles.slice(-20).map((c) => c.low));
  const nearestResistance = resistancesAbove[0] || Math.max(...candles.slice(-20).map((c) => c.high));

  const pipScale = Math.pow(10, pipDecimals === 3 || pipDecimals === 2 ? 2 : 4);
  const distToSupportPips = Math.round(Math.abs(currentPrice - nearestSupport) * pipScale);
  const distToResistancePips = Math.round(Math.abs(nearestResistance - currentPrice) * pipScale);

  const lastCandle = candles[candles.length - 1];
  const isBouncingSupport = distToSupportPips <= 6 && lastCandle.close > lastCandle.open;
  const isRejectingResistance = distToResistancePips <= 6 && lastCandle.close < lastCandle.open;
  const isConsolidating = distToSupportPips + distToResistancePips < 15;

  return {
    nearestSupport,
    nearestResistance,
    distToSupportPips,
    distToResistancePips,
    isBouncingSupport,
    isRejectingResistance,
    isConsolidating,
  };
}

// 12. Candlestick Patterns Detection
export function detectCandlestickPattern(candles: Candle[]): {
  patternName: string;
  bias: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  reliability: 'HIGH' | 'MEDIUM' | 'LOW';
} {
  if (candles.length < 3) {
    return { patternName: 'شموع عادية', bias: 'NEUTRAL', reliability: 'LOW' };
  }

  const cur = candles[candles.length - 1];
  const prev = candles[candles.length - 2];
  const prev2 = candles[candles.length - 3];

  const curBody = Math.abs(cur.close - cur.open);
  const curRange = cur.high - cur.low;
  const prevBody = Math.abs(prev.close - prev.open);

  const curUpperWick = cur.high - Math.max(cur.open, cur.close);
  const curLowerWick = Math.min(cur.open, cur.close) - cur.low;

  // 1. Bullish Engulfing
  if (prev.close < prev.open && cur.close > cur.open && cur.open <= prev.close && cur.close >= prev.open && curBody > prevBody) {
    return { patternName: 'ابتلاعية صاعدة (Bullish Engulfing)', bias: 'BULLISH', reliability: 'HIGH' };
  }

  // 2. Bearish Engulfing
  if (prev.close > prev.open && cur.close < cur.open && cur.open >= prev.close && cur.close <= prev.open && curBody > prevBody) {
    return { patternName: 'ابتلاعية هابطة (Bearish Engulfing)', bias: 'BEARISH', reliability: 'HIGH' };
  }

  // 3. Hammer (مطرقة صاعدة)
  if (curLowerWick >= curBody * 2 && curUpperWick <= curBody * 0.5 && curBody > 0) {
    return { patternName: 'مطرقة صاعدة (Hammer / Rejection)', bias: 'BULLISH', reliability: 'HIGH' };
  }

  // 4. Shooting Star (نجم شهاب هابط)
  if (curUpperWick >= curBody * 2 && curLowerWick <= curBody * 0.5 && curBody > 0) {
    return { patternName: 'نجم الشهاب الهابط (Shooting Star)', bias: 'BEARISH', reliability: 'HIGH' };
  }

  // 5. Pin Bar
  if (curLowerWick >= curRange * 0.65) {
    return { patternName: 'شمعة بن بار رفض شرائي (Bullish Pin Bar)', bias: 'BULLISH', reliability: 'HIGH' };
  }
  if (curUpperWick >= curRange * 0.65) {
    return { patternName: 'شمعة بن بار رفض بيعي (Bearish Pin Bar)', bias: 'BEARISH', reliability: 'HIGH' };
  }

  // 6. Morning Star (نجمة الصباح)
  if (prev2.close < prev2.open && prevBody < curBody * 0.4 && cur.close > cur.open && cur.close > (prev2.open + prev2.close) / 2) {
    return { patternName: 'نجمة الصباح الثلاثية (Morning Star)', bias: 'BULLISH', reliability: 'HIGH' };
  }

  // 7. Evening Star (نجمة المساء)
  if (prev2.close > prev2.open && prevBody < curBody * 0.4 && cur.close < cur.open && cur.close < (prev2.open + prev2.close) / 2) {
    return { patternName: 'نجمة المساء الثلاثية (Evening Star)', bias: 'BEARISH', reliability: 'HIGH' };
  }

  // 8. Marubozu (ماروبوزو زخم قوي)
  if (curBody >= curRange * 0.85 && curRange > 0) {
    if (cur.close > cur.open) {
      return { patternName: 'ماروبوزو صاعد قوي (Strong Bullish Momentum)', bias: 'BULLISH', reliability: 'HIGH' };
    } else {
      return { patternName: 'ماروبوزو هابط قوي (Strong Bearish Momentum)', bias: 'BEARISH', reliability: 'HIGH' };
    }
  }

  // 9. Doji (دوجي حيرة)
  if (curBody <= curRange * 0.1 && curRange > 0) {
    return { patternName: 'شمعة دوجي تردد (Doji Indecision)', bias: 'NEUTRAL', reliability: 'MEDIUM' };
  }

  // Standard strong candle
  if (cur.close > cur.open) {
    return { patternName: 'شمعة صاعدة متوازنة', bias: 'BULLISH', reliability: 'MEDIUM' };
  } else {
    return { patternName: 'شمعة هابطة متوازنة', bias: 'BEARISH', reliability: 'MEDIUM' };
  }
}

// 13. Full Analysis Snapshot Builder
export function buildIndicatorSnapshot(candles: Candle[], pipDecimals: number = 5): IndicatorSnapshot {
  const closes = candles.map((c) => c.close);
  const currentPrice = closes[closes.length - 1] || 1;

  const rsi14 = calculateRSI(closes, 14);
  const macd = calculateMACD(closes);

  const ema9 = calculateEMA(closes, 9);
  const ema21 = calculateEMA(closes, 21);
  const ema50 = calculateEMA(closes, 50);
  const ema100 = calculateEMA(closes, 100);

  const isBullishStack = ema9 > ema21 && ema21 > ema50;
  const isBearishStack = ema9 < ema21 && ema21 < ema50;

  const sma7 = calculateSMA(closes, 7);
  const sma14 = calculateSMA(closes, 14);
  const sma50 = calculateSMA(closes, 50);

  const bollinger = calculateBollingerBands(closes, 20, 2);
  const stochastic = calculateStochastic(candles, 14, 3);
  const atr14 = calculateATR(candles, 14);
  const adx14 = calculateADX(candles, 14);
  const cci20 = calculateCCI(candles, 20);
  const williamsR14 = calculateWilliamsR(candles, 14);
  const priceAction = calculateSupportResistance(candles, currentPrice, pipDecimals);
  const candlestickPattern = detectCandlestickPattern(candles);

  return {
    rsi14,
    macd,
    ema: {
      ema9: Math.round(ema9 * 100000) / 100000,
      ema21: Math.round(ema21 * 100000) / 100000,
      ema50: Math.round(ema50 * 100000) / 100000,
      ema100: Math.round(ema100 * 100000) / 100000,
      isBullishStack,
      isBearishStack,
    },
    sma: {
      sma7: Math.round(sma7 * 100000) / 100000,
      sma14: Math.round(sma14 * 100000) / 100000,
      sma50: Math.round(sma50 * 100000) / 100000,
    },
    bollinger,
    stochastic,
    atr14: Math.round(atr14 * 100000) / 100000,
    adx14,
    cci20,
    williamsR14,
    priceAction,
    candlestickPattern,
  };
}
