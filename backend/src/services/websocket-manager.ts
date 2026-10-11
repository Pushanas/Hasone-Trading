// backend/src/services/websocket-manager.ts
// Real-time WebSocket & Event Stream Manager for Hasone Trading Frontend

import { quotexWebSocketService } from './data-providers/quotexWebSocket';
import { createLogger } from '../utils/logger';

const logger = createLogger('WebSocketManager');

export interface ClientConnection {
  id: string;
  connectedAt: number;
  send: (payload: any) => void;
}

class WebSocketManager {
  private clients: Map<string, ClientConnection> = new Map();

  constructor() {
    this.bindProviderEvents();
  }

  private bindProviderEvents() {
    // Listen to Quotex tick updates and broadcast to active frontend subscribers
    quotexWebSocketService.subscribe((update) => {
      this.broadcast('TICK', update);
    });
  }

  public registerClient(id: string, sendFn: (payload: any) => void): () => void {
    this.clients.set(id, {
      id,
      connectedAt: Date.now(),
      send: sendFn,
    });
    logger.info(`Client registered: ${id}. Total active clients: ${this.clients.size}`);

    // Send initial snapshot
    sendFn({
      event: 'SNAPSHOT',
      rates: quotexWebSocketService.getAllRates(),
      timestamp: Date.now(),
    });

    return () => {
      this.clients.delete(id);
      logger.info(`Client disconnected: ${id}. Remaining: ${this.clients.size}`);
    };
  }

  public broadcast(event: string, data: any) {
    if (this.clients.size === 0) return;
    const message = { event, data, timestamp: Date.now() };
    for (const client of this.clients.values()) {
      try {
        client.send(message);
      } catch (err) {
        logger.error(`Failed to push message to client ${client.id}`, err);
      }
    }
  }

  public getStats() {
    return {
      connectedClients: this.clients.size,
      quotexGatewayStatus: quotexWebSocketService.getStatus(),
    };
  }
}

export const webSocketManager = new WebSocketManager();
export default webSocketManager;
