// backend/config/quixex-scraper.ts
// Configuration for Quotex OTC WebSocket streams & rate fetching

export interface QuotexGatewayConfig {
  wsUrls: string[];
  httpFallbacks: string[];
  reconnectIntervalMs: number;
  maxReconnectAttempts: number;
  heartbeatIntervalMs: number;
  userAgent: string;
  defaultPairs: string[];
  streamTimeoutMs: number;
}

export const quotexGatewayConfig: QuotexGatewayConfig = {
  wsUrls: [
    'wss://ws2.quotex.com/socket.io/?EIO=3&transport=websocket',
    'wss://stream.quotex-market.com/rates',
    'wss://otc-gateway.hasone-trading.com/stream',
  ],
  httpFallbacks: [
    'https://quotex.com/api/v1/cabin/profile',
    'https://qxbroker.com/api/v1/market/prices',
  ],
  reconnectIntervalMs: 3000,
  maxReconnectAttempts: 10,
  heartbeatIntervalMs: 15000,
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  defaultPairs: [
    'EUR/USD OTC',
    'GBP/USD OTC',
    'USD/JPY OTC',
    'AUD/CAD OTC',
    'USD/BRL OTC',
    'USD/MXN OTC',
    'USD/INR OTC',
    'USD/ARS OTC',
  ],
  streamTimeoutMs: 5000,
};

export default quotexGatewayConfig;
