// backend/src/server.ts
// Standalone backend entry point for Hasone Trading Services

import 'dotenv/config';
import express from 'express';
import pairsRouter from './routes/pairs';
import analyzeRouter from './routes/analyze';
import statsRouter from './routes/stats';
import apiProxyRouter from './middleware/apiProxy.js';
import tradesRouter from './routes/tradesRouter.js';
import { databaseService } from '../config/database';
import { createLogger } from './utils/logger';

const logger = createLogger('BackendServer');
const app = express();
const PORT = process.env.PORT || 3001;

app.use((_req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  next();
});
app.use(express.json());

// Mount modular enterprise routes
app.use('/api/v2/pairs', pairsRouter);
app.use('/api/v2/analyze', analyzeRouter);
app.use('/api/v2/stats', statsRouter);
app.use('/api/proxy/twelvedata', apiProxyRouter);
app.use('/api/trades', tradesRouter);

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'Hasone Trading Modular Backend',
    database: databaseService.getStatus(),
    timestamp: Date.now(),
  });
});

if (process.env.STANDALONE_BACKEND === 'true') {
  app.listen(PORT, () => {
    logger.info(`Standalone backend running on port ${PORT}`);
  });
}

export default app;
