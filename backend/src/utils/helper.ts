// backend/src/utils/helper.ts
// Mathematical, time, and formatting helpers for Hasone Trading Engine

export function round(value: number, decimals: number = 5): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

export function formatPrice(price: number, decimals: number = 5): string {
  return Number(price).toFixed(decimals);
}

export function calculatePercentageChange(open: number, close: number): number {
  if (open === 0) return 0;
  return round(((close - open) / open) * 100, 2);
}

export function normalizeInterval(rawInterval: string): string {
  const map: Record<string, string> = {
    '1m': '1min',
    'm1': '1min',
    '5m': '5min',
    'm5': '5min',
    '15m': '15min',
    'm15': '15min',
    '30m': '30min',
    'm30': '30min',
    '1h': '1h',
    'h1': '1h',
    '1d': '1day',
    'd1': '1day',
  };
  const key = rawInterval.toLowerCase().trim();
  return map[key] || rawInterval;
}

export function intervalToMinutes(interval: string): number {
  const clean = normalizeInterval(interval);
  switch (clean) {
    case '1min': return 1;
    case '5min': return 5;
    case '15min': return 15;
    case '30min': return 30;
    case '1h': return 60;
    case '1day': return 1440;
    default: return 1;
  }
}

export function safeJsonParse<T>(data: string, fallback: T): T {
  try {
    return JSON.parse(data);
  } catch {
    return fallback;
  }
}
