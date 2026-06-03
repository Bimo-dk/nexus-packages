import { Injectable, inject, signal } from '@angular/core';
import { Subject } from 'rxjs';
import type { RemoteConfig, WebSocketMessage } from '@bimo-dk/nexus-core';
import { NEXUS_CONFIG } from '../tokens.js';

const MIN_RECONNECT_MS = 1000;
const MAX_RECONNECT_MS = 30000;

@Injectable({ providedIn: 'root' })
export class RegistryWebSocketService {
  private readonly cfg = inject(NEXUS_CONFIG);
  private socket: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private currentDelay = MIN_RECONNECT_MS;
  private intentionalClose = false;

  readonly connected = signal<boolean>(false);
  readonly remotesChanged$ = new Subject<RemoteConfig[]>();

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
      this.currentDelay = MIN_RECONNECT_MS;
      console.log(`[nexus-ws] Connected to ${wsUrl}`);
    });

    this.socket.addEventListener('message', (ev: MessageEvent) => {
      try {
        const data = typeof ev.data === 'string' ? ev.data : '';
        const msg = JSON.parse(data) as WebSocketMessage;
        if (msg.type === 'registry_updated' && 'remotes' in msg) {
          this.remotesChanged$.next((msg as { remotes: RemoteConfig[] }).remotes);
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
    const delay = this.currentDelay;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.openSocket();
    }, delay);
    this.currentDelay = Math.min(this.currentDelay * 2, MAX_RECONNECT_MS);
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
