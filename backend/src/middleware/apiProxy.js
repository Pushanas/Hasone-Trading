// backend/src/middleware/apiProxy.js
// Express proxy route & middleware for sanitizing outgoing Twelve Data requests
// with strict API key verification, parameter validation, and standardized error responses.

import express from 'express';

/**
 * Standardized error generator for frontend consistency.
 * @param {string} code - Machine-readable error code
 * @param {string} message - Human-readable explanation
 * @param {number} httpStatus - Associated HTTP status code
 * @param {any} [details=null] - Optional technical context or upstream payload
 */
export function createStandardizedError(code, message, httpStatus = 500, details = null) {
  return {
    success: false,
    error: {
      code,
      message,
      httpStatus,
      details,
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * Supported Twelve Data intervals
 */
const ALLOWED_INTERVALS = new Set([
  '1min',
  '5min',
  '15min',
  '30min',
  '45min',
  '1h',
  '2h',
  '4h',
  '8h',
  '1day',
  '1week',
  '1month',
]);

/**
 * Interval normalization dictionary
 */
const INTERVAL_MAP = {
  '1m': '1min',
  '5m': '5min',
  '15m': '15min',
  '30m': '30min',
  '45m': '45min',
  '60m': '1h',
  '1d': '1day',
  '1w': '1week',
};

/**
 * Allowed Twelve Data endpoint paths
 */
const ALLOWED_ENDPOINTS = new Set(['time_series', 'price', 'quote', 'api_usage']);

/**
 * In-memory server cache to protect the 8-credit/min free tier quota
 */
const proxyCache = new Map();
const CACHE_TTL_MS = 20000; // 20 seconds TTL

/**
 * Middleware: Verify presence of TWELVE_DATA_API_KEY in server environment
 */
export function verifyApiKey(req, res, next) {
  const apiKey = process.env.TWELVE_DATA_API_KEY;

  if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length === 0) {
    const errorObj = createStandardizedError(
      'API_KEY_MISSING',
      'Twelve Data API key is not configured in server environment variables (TWELVE_DATA_API_KEY).',
      500
    );
    console.error('[API Proxy] Error: TWELVE_DATA_API_KEY is missing from environment.');
    return res.status(500).json(errorObj);
  }

  // Attach verified key to request context for downstream handlers
  req.twelveDataApiKey = apiKey.trim();
  next();
}

/**
 * Middleware: Sanitize and validate incoming query parameters
 */
export function sanitizeTwelveDataRequest(req, res, next) {
  try {
    const rawEndpoint = String(req.query.endpoint || 'time_series').trim().toLowerCase();
    const endpoint = ALLOWED_ENDPOINTS.has(rawEndpoint) ? rawEndpoint : 'time_series';

    // 1. Sanitize symbol
    const rawSymbol = String(req.query.symbol || 'EUR/USD').trim();
    // Strip HTML/script injection and clean whitespace
    let sanitizedSymbol = rawSymbol
      .replace(/<[^>]*>?/gm, '')
      .replace(/[^\w/:\-.]/g, '')
      .toUpperCase();

    // Clean OTC suffix if sent by client
    if (sanitizedSymbol.endsWith('OTC')) {
      sanitizedSymbol = sanitizedSymbol.replace(/OTC$/, '').trim();
    }

    if (!sanitizedSymbol || sanitizedSymbol.length < 3 || sanitizedSymbol.length > 20) {
      return res.status(400).json(
        createStandardizedError(
          'INVALID_SYMBOL',
          `Invalid or unsupported market symbol format: "${rawSymbol}". Expected format like "EUR/USD".`,
          400,
          { provided: rawSymbol }
        )
      );
    }

    // 2. Sanitize interval
    let rawInterval = String(req.query.interval || '1min').trim().toLowerCase();
    const normalizedInterval = INTERVAL_MAP[rawInterval] || rawInterval;

    if (!ALLOWED_INTERVALS.has(normalizedInterval)) {
      return res.status(400).json(
        createStandardizedError(
          'INVALID_INTERVAL',
          `Invalid interval: "${rawInterval}". Supported intervals are: ${Array.from(ALLOWED_INTERVALS).join(', ')}`,
          400,
          { provided: rawInterval, allowed: Array.from(ALLOWED_INTERVALS) }
        )
      );
    }

    // 3. Sanitize outputsize (number of candles)
    let outputsize = parseInt(String(req.query.outputsize || '30'), 10);
    if (isNaN(outputsize) || outputsize < 1) {
      outputsize = 30;
    } else if (outputsize > 500) {
      // Clamp to maximum 500 to prevent payload exhaustion
      outputsize = 500;
    }

    // Attach sanitized parameters to request
    req.sanitizedParams = {
      endpoint,
      symbol: sanitizedSymbol,
      interval: normalizedInterval,
      outputsize,
    };

    next();
  } catch (err) {
    return res.status(400).json(
      createStandardizedError(
        'SANITIZATION_FAILED',
        `Failed to sanitize request parameters: ${err.message}`,
        400
      )
    );
  }
}

/**
 * Controller: Execute sanitized request to Twelve Data with caching & error handling
 */
export async function handleTwelveDataProxy(req, res) {
  const { endpoint, symbol, interval, outputsize } = req.sanitizedParams;
  const apiKey = req.twelveDataApiKey;

  // Build cache key
  const cacheKey = `${endpoint}:${symbol}:${interval}:${outputsize}`;
  const cachedEntry = proxyCache.get(cacheKey);

  if (cachedEntry && Date.now() - cachedEntry.timestamp < CACHE_TTL_MS) {
    return res.status(200).json({
      success: true,
      cached: true,
      data: cachedEntry.data,
      meta: {
        symbol,
        interval,
        cachedAt: new Date(cachedEntry.timestamp).toISOString(),
        creditsLeft: cachedEntry.creditsLeft,
      },
    });
  }

  // Construct target URL
  let targetUrl = `https://api.twelvedata.com/${endpoint}?symbol=${encodeURIComponent(
    symbol
  )}&apikey=${apiKey}`;

  if (endpoint === 'time_series') {
    targetUrl += `&interval=${interval}&outputsize=${outputsize}`;
  }

  const startTime = Date.now();
  console.log(`[API Proxy] Outgoing request to Twelve Data -> ${endpoint} [symbol=${symbol}, interval=${interval}, outputsize=${outputsize}]`);

  try {
    const upstreamRes = await fetch(targetUrl, { signal: AbortSignal.timeout(7500) });
    const latencyMs = Date.now() - startTime;
    const httpStatus = upstreamRes.status;

    const creditsLeftHeader = upstreamRes.headers.get('api-credits-left');
    const creditsUsedHeader = upstreamRes.headers.get('api-credits-used');
    const creditsLeft = creditsLeftHeader !== null ? parseInt(creditsLeftHeader, 10) : null;
    const creditsUsed = creditsUsedHeader !== null ? parseInt(creditsUsedHeader, 10) : null;

    let payload;
    try {
      payload = await upstreamRes.json();
    } catch {
      payload = null;
    }

    // 1. Upstream Rate Limit Exceeded (HTTP 429)
    if (httpStatus === 429 || (payload && payload.code === 429)) {
      const errorMsg =
        payload?.message ||
        'Twelve Data API credit limit exceeded for the current minute (8 requests/min). Please try again shortly.';
      console.warn(`[API Proxy] Rate Limit 429: ${errorMsg}`);

      return res.status(429).json(
        createStandardizedError('RATE_LIMIT_EXCEEDED', errorMsg, 429, {
          creditsLeft: 0,
          retryAfterSeconds: 60,
          upstream: payload,
        })
      );
    }

    // 2. Upstream Error or Bad Request (HTTP 400-499)
    if (!upstreamRes.ok || (payload && payload.status === 'error')) {
      const errorMsg = payload?.message || `Upstream Twelve Data error (HTTP ${httpStatus})`;
      const errorCode = httpStatus === 401 || httpStatus === 403 ? 'AUTHENTICATION_FAILED' : 'UPSTREAM_CLIENT_ERROR';

      console.error(`[API Proxy] Upstream Error (HTTP ${httpStatus}): ${errorMsg}`);
      return res.status(httpStatus >= 400 && httpStatus < 500 ? httpStatus : 502).json(
        createStandardizedError(errorCode, errorMsg, httpStatus, {
          upstream: payload,
          latencyMs,
        })
      );
    }

    // 3. Upstream Success (HTTP 200 with status: ok or valid price)
    if (payload) {
      // Store in memory cache
      proxyCache.set(cacheKey, {
        data: payload,
        timestamp: Date.now(),
        creditsLeft,
      });

      return res.status(200).json({
        success: true,
        cached: false,
        data: payload,
        meta: {
          symbol,
          interval,
          latencyMs,
          creditsLeft,
          creditsUsed,
        },
      });
    }

    return res.status(502).json(
      createStandardizedError(
        'EMPTY_UPSTREAM_RESPONSE',
        'Received empty or invalid JSON payload from Twelve Data.',
        502
      )
    );
  } catch (networkErr) {
    const isTimeout = networkErr.name === 'TimeoutError' || networkErr.message.includes('timeout');
    const statusCode = isTimeout ? 504 : 502;
    const errorCode = isTimeout ? 'GATEWAY_TIMEOUT' : 'NETWORK_CONNECTION_ERROR';
    const message = isTimeout
      ? 'Request to Twelve Data timed out after 7.5 seconds.'
      : `Network connection error contacting Twelve Data: ${networkErr.message}`;

    console.error(`[API Proxy] Exception during request:`, networkErr);

    return res.status(statusCode).json(
      createStandardizedError(errorCode, message, statusCode, {
        originalError: networkErr.message,
      })
    );
  }
}

// Create Express Router for easy mounting
const apiProxyRouter = express.Router();

// Mount verifyApiKey and sanitizeTwelveDataRequest middlewares
apiProxyRouter.use(verifyApiKey);
apiProxyRouter.use(sanitizeTwelveDataRequest);
apiProxyRouter.get('/', handleTwelveDataProxy);
apiProxyRouter.get('/time_series', handleTwelveDataProxy);
apiProxyRouter.get('/price', handleTwelveDataProxy);
apiProxyRouter.get('/quote', handleTwelveDataProxy);

export default apiProxyRouter;
