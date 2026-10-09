export type MartingaleType = 'NON MTG' | 'MTG 1' | 'MTG 2';

export type TimeFrame = 'M1' | 'M5' | 'M15';

export type FormatStyle = 'vip' | 'standard' | 'minimal';

export type SignalResult = 'pending' | 'win_direct' | 'win_mtg1' | 'win_mtg2' | 'loss';

export interface SignalItem {
  id: string;
  pair: string;
  time: Date;
  timeStr: string;
  direction: 'CALL' | 'PUT';
  timeframe: TimeFrame;
  martingale: MartingaleType;
  done: boolean;
  result: SignalResult;
  strategyName?: string;
}

export interface GeneratorConfig {
  tradeCount: number;
  gapMinutes: number;
  martingale: MartingaleType;
  timeframe: TimeFrame;
  formatStyle: FormatStyle;
  selectedPairs: string[];
}
