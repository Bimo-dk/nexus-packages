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
    initial_delay_ms: 1000,
    max_delay_ms: 30_000,
    backoff_multiplier: 2,
    jitter_ms: 0,
    max_attempts: 0,
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

        if (msg.type === 'connected' && msg.reconnect_policy) {
          this.policy = msg.reconnect_policy;
        } else if (msg.type === 'reconnect_policy_changed') {
          this.policy = msg.reconnect_policy;
        } else if (msg.type === 'registry_updated') {
          this.remotesChanged$.next(msg.remotes);
        } else if (msg.type === 'host_changed') {
          this.hostChanged$.next(msg.host);
        } else if (msg.type === 'gateway_config_changed') {
          this.gatewayConfigChanged$.next(msg.value);
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
    if (this.policy.max_attempts > 0 && this.attemptCount >= this.policy.max_attempts) return;

    const base = this.policy.initial_delay_ms * Math.pow(this.policy.backoff_multiplier, this.attemptCount);
    const jitter = this.policy.jitter_ms > 0 ? Math.random() * this.policy.jitter_ms : 0;
    const delay = Math.min(base + jitter, this.policy.max_delay_ms);

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
