// Hasone Trading - WebSocket Engine
// Provides real-time streaming, subscribe/unsubscribe, heartbeat, ping/pong, and onTick callbacks

export type WebSocketConnectionStatus = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'RECONNECTING' | 'ERROR';

export interface PriceTick {
  pair: string;
  price: number;
  bid?: number;
  ask?: number;
  timestamp: number;
  source: 'TwelveData_WS' | 'Hasone_LiveStream' | 'OTC_Simulated';
}

type TickListener = (tick: PriceTick) => void;
type StatusListener = (status: WebSocketConnectionStatus) => void;

class HasoneWebSocketEngine {
  private ws: WebSocket | null = null;
  private status: WebSocketConnectionStatus = 'DISCONNECTED';
  private subscribedPairs: Set<string> = new Set();
  private tickListeners: Set<TickListener> = new Set();
  private statusListeners: Set<StatusListener> = new Set();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimer: any = null;
  private heartbeatInterval: any = null;
  private pingInterval: any = null;
  private simulatedStreamTimer: any = null;
  private apiKey = '50afb2495f3e4384a3fea5960a7a202e';

  constructor() {
    this.status = 'DISCONNECTED';
  }

  public getStatus(): WebSocketConnectionStatus {
    return this.status;
  }

  public getSubscribedPairs(): string[] {
    return Array.from(this.subscribedPairs);
  }

  private setStatus(newStatus: WebSocketConnectionStatus) {
    this.status = newStatus;
    this.statusListeners.forEach((listener) => {
      try {
        listener(newStatus);
      } catch (err) {
        console.error('Error in status listener:', err);
      }
    });
  }

  /**
   * Connect to WebSocket server or Twelve Data streaming endpoint
   */
  public connect(customUrl?: string) {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.setStatus('CONNECTING');

    const defaultUrl = `wss://ws.twelvedata.com/v1/quotes/price?apikey=${this.apiKey}`;
    const targetUrl = customUrl || defaultUrl;

    try {
      this.ws = new WebSocket(targetUrl);

      this.ws.onopen = () => {
        this.setStatus('CONNECTED');
        this.reconnectAttempts = 0;
        this.startHeartbeat();
        this.startPingPong();

        // Resubscribe to active pairs
        if (this.subscribedPairs.size > 0) {
          const symbols = Array.from(this.subscribedPairs).join(',');
          this.sendRaw({
            action: 'subscribe',
            params: { symbols },
          });
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleIncomingMessage(data);
        } catch {
          // Non-JSON message or raw ping
        }
      };

      this.ws.onerror = () => {
        this.setStatus('ERROR');
      };

      this.ws.onclose = () => {
        this.setStatus('DISCONNECTED');
        this.stopHeartbeat();
        this.stopPingPong();
        this.scheduleReconnect();
      };
    } catch {
      this.setStatus('ERROR');
      this.fallbackToSimulatedStream();
    }
  }

  /**
   * Disconnect and clear heartbeat timers
   */
  public disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.stopHeartbeat();
    this.stopPingPong();
    this.stopSimulatedStream();

    if (this.ws) {
      try {
        this.ws.close();
      } catch {}
      this.ws = null;
    }
    this.setStatus('DISCONNECTED');
  }

  /**
   * Subscribe to a currency pair
   */
  public subscribe(pair: string) {
    const cleanPair = pair.trim();
    if (!cleanPair) return;
    this.subscribedPairs.add(cleanPair);

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.sendRaw({
        action: 'subscribe',
        params: {
          symbols: cleanPair.replace(' OTC', ''),
        },
      });
    }

    // Ensure fallback simulated stream is running if offline
    if (this.status !== 'CONNECTED' && !this.simulatedStreamTimer) {
      this.fallbackToSimulatedStream();
    }
  }

  /**
   * Unsubscribe from a currency pair
   */
  public unsubscribe(pair: string) {
    const cleanPair = pair.trim();
    this.subscribedPairs.delete(cleanPair);

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.sendRaw({
        action: 'unsubscribe',
        params: {
          symbols: cleanPair.replace(' OTC', ''),
        },
      });
    }
  }

  /**
   * Immediate reconnect
   */
  public reconnect() {
    this.disconnect();
    this.setStatus('RECONNECTING');
    setTimeout(() => {
      this.connect();
    }, 1000);
  }

  /**
   * Send heartbeat message to keep connection alive
   */
  public heartbeat() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.sendRaw({
        action: 'heartbeat',
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Ping / Pong mechanism
   */
  public ping() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.sendRaw({
        action: 'ping',
        timestamp: Date.now(),
      });
    }
  }

  public pong() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.sendRaw({
        action: 'pong',
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Register onTick callback
   */
  public onTick(listener: TickListener): () => void {
    this.tickListeners.add(listener);
    return () => {
      this.tickListeners.delete(listener);
    };
  }

  /**
   * Register onStatusChange callback
   */
  public onStatusChange(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    listener(this.status);
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  private sendRaw(payload: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(payload));
      } catch (err) {
        console.warn('Failed to send WS message:', err);
      }
    }
  }

  private handleIncomingMessage(data: any) {
    if (data.event === 'price' && data.symbol && data.price) {
      const tick: PriceTick = {
        pair: data.symbol,
        price: parseFloat(data.price),
        bid: data.bid ? parseFloat(data.bid) : undefined,
        ask: data.ask ? parseFloat(data.ask) : undefined,
        timestamp: data.timestamp ? data.timestamp * 1000 : Date.now(),
        source: 'TwelveData_WS',
      };
      this.dispatchTick(tick);
    } else if (data.event === 'ping') {
      this.pong();
    } else if (data.event === 'heartbeat') {
      // Server acknowledged heartbeat
    }
  }

  private dispatchTick(tick: PriceTick) {
    this.tickListeners.forEach((listener) => {
      try {
        listener(tick);
      } catch (err) {
        console.error('Error dispatching tick:', err);
      }
    });
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      this.heartbeat();
    }, 15000);
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private startPingPong() {
    this.stopPingPong();
    this.pingInterval = setInterval(() => {
      this.ping();
    }, 30000);
  }

  private stopPingPong() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.fallbackToSimulatedStream();
      return;
    }
    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 15000);
    this.setStatus('RECONNECTING');
    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  private fallbackToSimulatedStream() {
    if (this.simulatedStreamTimer) return;
    this.simulatedStreamTimer = setInterval(() => {
      if (this.subscribedPairs.size === 0) return;
      this.subscribedPairs.forEach((pair) => {
        const tick: PriceTick = {
          pair,
          price: 1.0 + (Math.random() - 0.5) * 0.002,
          timestamp: Date.now(),
          source: 'OTC_Simulated',
        };
        this.dispatchTick(tick);
      });
    }, 1500);
  }

  private stopSimulatedStream() {
    if (this.simulatedStreamTimer) {
      clearInterval(this.simulatedStreamTimer);
      this.simulatedStreamTimer = null;
    }
  }
}

// Global Singleton Instance
export const hasoneWsEngine = new HasoneWebSocketEngine();
