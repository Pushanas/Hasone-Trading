// shared/types.ts
// Unified TypeScript type definitions shared across Hasone Trading Backend & Frontend

export type MartingaleType = 'NON MTG' | 'MTG 1' | 'MTG 2';
export type TimeFrame = 'M1' | 'M5' | 'M15' | 'M30' | 'H1';
export type IntervalType = '1min' | '5min' | '15min' | '30min' | '1h' | '1day';
export type MarketCategory = 'forex' | 'otc' | 'crypto' | 'commodities';
export type SignalDirection = 'CALL' | 'PUT' | 'NEUTRAL';
export type SignalResult = 'pending' | 'win_direct' | 'win_mtg1' | 'win_mtg2' | 'loss';

export interface MarketPair {
  id: string;
  name: string;
  base: string;
  quote: string;
  category: MarketCategory;
  isOtc: boolean;
  payout: number;
  twelveDataSymbol?: string;
  isActive: boolean;
  decimalPlaces: number;
}

export interface Candle {
  datetime: string;
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface TechnicalIndicators {
  rsi: number;
  rsiSignal: 'OVERSOLD' | 'OVERBOUGHT' | 'NEUTRAL';
  macd: {
    macdLine: number;
    signalLine: number;
    histogram: number;
    trend: 'BULLISH' | 'BEARISH' | 'CROSS_UP' | 'CROSS_DOWN';
  };
  bollingerBands: {
    upper: number;
    middle: number;
    lower: number;
    bandwidth: number;
    percentB: number;
  };
  stochastic: {
    k: number;
    d: number;
    state: 'OVERSOLD' | 'OVERBOUGHT' | 'NEUTRAL';
  };
  ema: {
    ema9: number;
    ema21: number;
    ema50: number;
    trend: 'BULLISH' | 'BEARISH' | 'SIDEWAYS';
  };
  atr: number;
}

export interface CandlePattern {
  name: string;
  arabicName: string;
  type: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  reliability: 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
}

export interface GeminiAnalysisResult {
  score: number; // 0-100
  sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  confidence: number;
  rationale: string;
  recommendation: 'CALL' | 'PUT' | 'HOLD';
  recommendedExpiry: string;
  keyLevels: {
    support: number[];
    resistance: number[];
  };
  riskRating: 'LOW' | 'MEDIUM' | 'HIGH';
  generatedAt: string;
}

export interface FullAnalysisReport {
  pair: MarketPair;
  timeframe: string;
  currentPrice: number;
  dataSource: 'TWELVE_DATA_API' | 'QUOTEX_OTC_GATEWAY' | 'AGGREGATED_STREAM';
  isRealApi: boolean;
  candles: Candle[];
  indicators: TechnicalIndicators;
  detectedPatterns: CandlePattern[];
  geminiAi?: GeminiAnalysisResult;
  signal: {
    direction: SignalDirection;
    confidence: number;
    confluenceCount: number;
    totalChecked: number;
    recommendedDuration: string;
    targetPrice?: number;
    stopLoss?: number;
  };
  meta: {
    timestamp: number;
    latencyMs: number;
    engineVersion: string;
  };
}

export interface SignalHistoryRecord {
  id: string;
  pairId: string;
  pairName: string;
  isOtc: boolean;
  time: string;
  timestamp: number;
  direction: 'CALL' | 'PUT';
  timeframe: TimeFrame;
  entryPrice: number;
  closePrice?: number;
  martingale: MartingaleType;
  result: SignalResult;
  profitRatio?: number;
  strategyName: string;
  aiConfidence?: number;
  verifiedAt?: string;
}

export interface MarketScannerItem {
  pair: MarketPair;
  currentPrice: number;
  change24h: number;
  rsi: number;
  signal: SignalDirection;
  confidence: number;
  payout: number;
  volatility: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'HOT' | 'STABLE' | 'RISKY';
  lastUpdated: number;
}
