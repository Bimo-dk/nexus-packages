import { NEXUS_DEFAULTS, type WebSocketMessage } from '@bimo-dk/nexus-core';

export interface RegistryWebSocketOptions {
  /** Base URL to registry/proxy — used to derive ws://...:port/ws. */
  registryUrl: string;
  /** Token (forwarded as subprotocol or query — currently unused on the server side). */
  token: string;
  /** Min reconnect delay in ms. Default 1000. */
  minReconnectDelayMs?: number;
  /** Max reconnect delay in ms. Default NEXUS_DEFAULTS.WS_MAX_RECONNECT_DELAY_MS. */
  maxReconnectDelayMs?: number;
}

type MessageHandler = (msg: WebSocketMessage) => void;

/**
 * WebSocket client for the registry's /ws endpoint.
 *
 * Built-in exponential backoff reconnect (1s -> 2s -> 4s -> ... -> max).
 * Universal: works in browser (native WebSocket) and Node.js 22+ (native WebSocket).
 */
export class RegistryWebSocket {
  private readonly wsUrl: string;
  private readonly minDelay: number;
  private readonly maxDelay: number;
  private readonly handlers = new Set<MessageHandler>();
  private socket: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private currentDelay: number;
  private intentionalClose = false;

  constructor(options: RegistryWebSocketOptions) {
    if (!options.registryUrl) throw new Error('RegistryWebSocket: registryUrl is required');
    this.wsUrl = this.deriveWsUrl(options.registryUrl);
    this.minDelay = options.minReconnectDelayMs ?? 1000;
    this.maxDelay = options.maxReconnectDelayMs ?? NEXUS_DEFAULTS.WS_MAX_RECONNECT_DELAY_MS;
    this.currentDelay = this.minDelay;
  }

  connect(): void {
    this.intentionalClose = false;
    this.openSocket();
  }

  disconnect(): void {
    this.intentionalClose = true;
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.socket) {
      try {
        this.socket.close(1000, 'client shutdown');
      } catch {
        /* ignore */
      }
      this.socket = null;
    }
  }

  onMessage(handler: MessageHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  get isConnected(): boolean {
    return this.socket?.readyState === 1; // WebSocket.OPEN
  }

  private openSocket(): void {
    try {
      this.socket = new WebSocket(this.wsUrl);
    } catch (err) {
      console.error('[nexus-ws] Failed to construct WebSocket:', err);
      this.scheduleReconnect();
      return;
    }

    this.socket.addEventListener('open', () => {
      this.currentDelay = this.minDelay;
    });

    this.socket.addEventListener('message', (ev: MessageEvent) => {
      try {
        const msg = JSON.parse(typeof ev.data === 'string' ? ev.data : '') as WebSocketMessage;
        for (const handler of this.handlers) {
          try {
            handler(msg);
          } catch (err) {
            console.error('[nexus-ws] Handler threw:', err);
          }
        }
      } catch (err) {
        console.error('[nexus-ws] Malformed message:', err);
      }
    });

    this.socket.addEventListener('close', () => {
      this.socket = null;
      if (!this.intentionalClose) {
        this.scheduleReconnect();
      }
    });

    this.socket.addEventListener('error', (ev: Event) => {
      console.error('[nexus-ws] Error event', ev);
    });
  }

  private scheduleReconnect(): void {
    if (this.intentionalClose || this.reconnectTimer !== null) return;
    const delay = this.currentDelay;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.openSocket();
    }, delay);
    this.currentDelay = Math.min(this.currentDelay * 2, this.maxDelay);
  }

  private deriveWsUrl(registryUrl: string): string {
    const trimmed = registryUrl.replace(/\/$/, '');
    if (trimmed.startsWith('ws://') || trimmed.startsWith('wss://')) {
      return trimmed + NEXUS_DEFAULTS.WEBSOCKET_PATH;
    }
    if (trimmed.startsWith('http://')) {
      return trimmed.replace(/^http:\/\//, 'ws://') + NEXUS_DEFAULTS.WEBSOCKET_PATH;
    }
    if (trimmed.startsWith('https://')) {
      return trimmed.replace(/^https:\/\//, 'wss://') + NEXUS_DEFAULTS.WEBSOCKET_PATH;
    }
    // Relative URL — only meaningful in browser context with window.location
    if (typeof window !== 'undefined' && window.location) {
      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${proto}//${window.location.host}${trimmed}${NEXUS_DEFAULTS.WEBSOCKET_PATH}`;
    }
    throw new Error(`Cannot derive WebSocket URL from "${registryUrl}" outside a browser context`);
  }
}
