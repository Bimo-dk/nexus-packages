import { Injectable, inject, signal } from '@angular/core';
import { Subject } from 'rxjs';
import type { GatewayConfig, HostConfig, ReconnectPolicy, RemoteConfig, WebSocketMessage } from '@bimo-dk/nexus-core';
import { NEXUS_CONFIG } from '../tokens';

@Injectable({ providedIn: 'root' })
export class RegistryWebSocketService {
  private readonly cfg = inject(NEXUS_CONFIG);
  private socket: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private intentionalClose = false;
  private attemptCount = 0;
  private policy: ReconnectPolicy = {
    initialDelayMs: 1000,
    maxDelayMs: 30_000,
    backoffMultiplier: 2,
    jitterMs: 0,
    maxAttempts: 0,
  };

  readonly connected = signal<boolean>(false);
  readonly remotesChanged$ = new Subject<RemoteConfig[]>();
  readonly hostChanged$ = new Subject<HostConfig>();
  readonly gatewayConfigChanged$ = new Subject<GatewayConfig>();

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

  private openSocket(): void {
    const wsUrl = this.deriveWsUrl();
    try {
      this.socket = new WebSocket(wsUrl);
    } catch (err) {
      console.error('[nexus-ws] Failed to construct WebSocket:', err);
      this.scheduleReconnect();
      return;
    }

    this.socket.addEventListener('open', () => {
      this.connected.set(true);
      this.attemptCount = 0;
      console.log(`[nexus-ws] Connected to ${wsUrl}`);
    });

    this.socket.addEventListener('message', (ev: MessageEvent) => {
      try {
        const data = typeof ev.data === 'string' ? ev.data : '';
        const msg = JSON.parse(data) as WebSocketMessage;

        if (msg.type === 'welcome' && msg.reconnect_policy) {
          this.policy = msg.reconnect_policy;
        } else if (msg.type === 'reconnect_policy_changed') {
          this.policy = msg.policy;
        } else if (msg.type === 'remotes_changed') {
          this.remotesChanged$.next(msg.remotes);
        } else if (msg.type === 'host_changed') {
          this.hostChanged$.next(msg.host);
        } else if (msg.type === 'config_changed' && msg.section === 'gateway') {
          this.gatewayConfigChanged$.next(msg.value as GatewayConfig);
        }
      } catch (err) {
        console.error('[nexus-ws] Malformed message:', err);
      }
    });

    this.socket.addEventListener('close', () => {
      this.connected.set(false);
      this.socket = null;
      if (!this.intentionalClose) this.scheduleReconnect();
    });

    this.socket.addEventListener('error', (ev: Event) => {
      console.error('[nexus-ws] Error event', ev);
    });
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

  private deriveWsUrl(): string {
    const base = this.cfg.registryUrl.replace(/\/$/, '');
    if (base.startsWith('ws://') || base.startsWith('wss://')) return `${base}/ws`;
    if (base.startsWith('http://')) return base.replace(/^http:\/\//, 'ws://') + '/ws';
    if (base.startsWith('https://')) return base.replace(/^https:\/\//, 'wss://') + '/ws';
    if (typeof window !== 'undefined' && window.location) {
      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${proto}//${window.location.host}${base}/ws`;
    }
    throw new Error(`[nexus-ws] Cannot derive WebSocket URL from "${this.cfg.registryUrl}"`);
  }
}
