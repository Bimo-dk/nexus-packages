import { NEXUS_DEFAULTS, type ReconnectPolicy, type WebSocketMessage } from '@bimo-dk/nexus-core';

export interface RegistryWebSocketOptions {
  /** Base URL to registry/proxy — used to derive ws://...:port/ws. */
  registryUrl: string;
  /** X-Nexus-Token. Required by the registry. Forwarded as `?token=...` because browser WebSocket cannot send custom headers. */
  token: string;
  /** Min reconnect delay in ms. Default 1000. Used until the server sends a reconnect_policy. */
  minReconnectDelayMs?: number;
  /** Max reconnect delay in ms. Default NEXUS_DEFAULTS.WS_MAX_RECONNECT_DELAY_MS. Used until the server sends a reconnect_policy. */
  maxReconnectDelayMs?: number;
}

type MessageHandler = (msg: WebSocketMessage) => void;
type ReconnectPolicyHandler = (policy: ReconnectPolicy) => void;

/**
 * WebSocket client for the registry's /ws endpoint.
 *
 * Built-in exponential backoff reconnect. When the server sends a reconnect_policy in the
 * welcome message or via reconnect_policy_changed, those values replace the constructor defaults.
 * Universal: works in browser (native WebSocket) and Node.js 22+ (native WebSocket).
 */
export class RegistryWebSocket {
  private readonly wsUrl: string;
  private readonly handlers = new Set<MessageHandler>();
  private readonly reconnectPolicyHandlers = new Set<ReconnectPolicyHandler>();
  private socket: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private intentionalClose = false;
  private attemptCount = 0;

  // Reconnect policy — updated from server when available
  private policy: ReconnectPolicy = {
    initialDelayMs: 1000,
    maxDelayMs: NEXUS_DEFAULTS.WS_MAX_RECONNECT_DELAY_MS,
    backoffMultiplier: 2,
    jitterMs: 0,
    maxAttempts: 0,
  };

  constructor(options: RegistryWebSocketOptions) {
    if (!options.registryUrl) throw new Error('RegistryWebSocket: registryUrl is required');
    this.wsUrl = this.appendToken(this.deriveWsUrl(options.registryUrl), options.token);
    if (options.minReconnectDelayMs !== undefined) this.policy.initialDelayMs = options.minReconnectDelayMs;
    if (options.maxReconnectDelayMs !== undefined) this.policy.maxDelayMs = options.maxReconnectDelayMs;
  }

  private appendToken(url: string, token: string): string {
    if (!token) return url;
    const sep = url.includes('?') ? '&' : '?';
    return `${url}${sep}token=${encodeURIComponent(token)}`;
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

  onReconnectPolicyChanged(handler: ReconnectPolicyHandler): () => void {
    this.reconnectPolicyHandlers.add(handler);
    return () => this.reconnectPolicyHandlers.delete(handler);
  }

  /** Send a subscribe_gate message so the server streams gate-specific events. */
  subscribeGate(gate_name: string): void {
    if (!this.isConnected || !this.socket) return;
    this.socket.send(JSON.stringify({ type: NEXUS_DEFAULTS.WS_SUBSCRIBE_GATE_TYPE, gate_name }));
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
      this.attemptCount = 0;
    });

    this.socket.addEventListener('message', (ev: MessageEvent) => {
      try {
        const msg = JSON.parse(typeof ev.data === 'string' ? ev.data : '') as WebSocketMessage;

        if (msg.type === 'welcome' && msg.reconnect_policy) {
          this.applyPolicy(msg.reconnect_policy);
        } else if (msg.type === 'reconnect_policy_changed') {
          this.applyPolicy(msg.policy);
          for (const h of this.reconnectPolicyHandlers) {
            try { h(msg.policy); } catch (err) { console.error('[nexus-ws] Policy handler threw:', err); }
          }
        }

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

  private applyPolicy(policy: ReconnectPolicy): void {
    this.policy = policy;
  }

  private scheduleReconnect(): void {
    if (this.intentionalClose || this.reconnectTimer !== null) return;
    if (this.policy.maxAttempts > 0 && this.attemptCount >= this.policy.maxAttempts) return;

    const base = this.policy.initialDelayMs * Math.pow(this.policy.backoffMultiplier, this.attemptCount);
    const jitter = this.policy.jitterMs > 0 ? Math.random() * this.policy.jitterMs : 0;
    const delay = Math.min(base + jitter, this.policy.maxDelayMs);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.attemptCount++;
      this.openSocket();
    }, delay);
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
