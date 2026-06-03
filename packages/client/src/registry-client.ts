import {
  NEXUS_DEFAULTS,
  RegistryError,
  type AddRemoteRequest,
  type HealthStatus,
  type RegistryResponse,
  type RemoteConfig,
  type UpdateRemoteRequest,
} from '@bimo-nexus/core';
import { nextRequestId } from './correlation.js';

export interface RegistryClientOptions {
  /** Base URL til registry, fx 'http://localhost:3000' eller '/api'. Trailing slash trimmes. */
  registryUrl: string;
  /** Token til X-Bimo-Token header. Påkrævet for skrivnings-endpoints. */
  token: string;
  /**
   * Optional custom fetch (til testing / Node.js < 18). Default = globalThis.fetch.
   */
  fetchImpl?: typeof fetch;
}

/**
 * HTTP-klient til Bimo-Nexus registry API.
 *
 * Eksempel:
 *   const client = new RegistryClient({ registryUrl: '/api', token: process.env.BIMO_TOKEN });
 *   const remotes = await client.getRemotes();
 */
export class RegistryClient {
  private readonly baseUrl: string;
  private readonly token: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: RegistryClientOptions) {
    if (!options.registryUrl) {
      throw new Error('RegistryClient: registryUrl is required');
    }
    if (!options.token) {
      throw new Error('RegistryClient: token is required');
    }
    this.baseUrl = options.registryUrl.replace(/\/$/, '') + '/remotes';
    this.token = options.token;
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch.bind(globalThis);
  }

  async getRemotes(): Promise<RemoteConfig[]> {
    const res = await this.request('GET', this.baseUrl);
    const body = (await res.json()) as RegistryResponse;
    return body.remotes;
  }

  async addRemote(remote: AddRemoteRequest): Promise<RemoteConfig> {
    const res = await this.request('POST', this.baseUrl, remote);
    return (await res.json()) as RemoteConfig;
  }

  async updateRemote(name: string, patch: UpdateRemoteRequest): Promise<RemoteConfig> {
    const url = `${this.baseUrl}/${encodeURIComponent(name)}`;
    const res = await this.request('PUT', url, patch);
    return (await res.json()) as RemoteConfig;
  }

  async deleteRemote(name: string): Promise<void> {
    const url = `${this.baseUrl}/${encodeURIComponent(name)}`;
    await this.request('DELETE', url);
  }

  async toggleRemote(name: string): Promise<RemoteConfig> {
    const url = `${this.baseUrl}/${encodeURIComponent(name)}/toggle`;
    const res = await this.request('POST', url, {});
    return (await res.json()) as RemoteConfig;
  }

  async checkHealth(url: string): Promise<HealthStatus> {
    const healthUrl = this.healthUrlFor(url);
    const start = Date.now();
    try {
      const res = await this.fetchImpl(healthUrl, { method: 'GET' });
      const responseTimeMs = Date.now() - start;
      if (!res.ok) {
        return { status: 'error', timestamp: new Date().toISOString(), responseTimeMs };
      }
      const body = (await res.json().catch(() => ({}))) as Partial<HealthStatus>;
      return {
        status: 'ok',
        remote: body.remote,
        timestamp: new Date().toISOString(),
        responseTimeMs,
      };
    } catch {
      return {
        status: 'error',
        timestamp: new Date().toISOString(),
        responseTimeMs: Date.now() - start,
      };
    }
  }

  private async request(method: string, url: string, body?: unknown): Promise<Response> {
    const correlationId = nextRequestId();
    const init: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        [NEXUS_DEFAULTS.TOKEN_HEADER]: this.token,
        [NEXUS_DEFAULTS.REQUEST_ID_HEADER]: correlationId,
      },
    };
    if (body !== undefined && method !== 'GET' && method !== 'HEAD') {
      init.body = JSON.stringify(body);
    }

    let res: Response;
    try {
      res = await this.fetchImpl(url, init);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new RegistryError(`Network error: ${msg}`, 0, correlationId);
    }

    if (!res.ok) {
      let detail = '';
      let serverCorrelationId: string | undefined;
      try {
        const text = await res.text();
        detail = text;
        try {
          const parsed = JSON.parse(text) as { message?: string; correlationId?: string };
          if (parsed.message) detail = parsed.message;
          if (parsed.correlationId) serverCorrelationId = parsed.correlationId;
        } catch {
          /* not JSON */
        }
      } catch {
        /* body unreadable */
      }
      throw new RegistryError(
        `${method} ${url} failed: ${res.status} ${detail}`,
        res.status,
        serverCorrelationId ?? correlationId,
      );
    }

    return res;
  }

  private healthUrlFor(remoteEntryUrl: string): string {
    try {
      const u = new URL(remoteEntryUrl, 'http://placeholder.invalid');
      u.pathname = '/health';
      u.search = '';
      if (u.hostname === 'placeholder.invalid') {
        // relativ URL — strip og byg relativ /health
        return remoteEntryUrl.replace(/\/remoteEntry\.json.*$/, '/health');
      }
      return u.toString();
    } catch {
      return remoteEntryUrl.replace(/\/remoteEntry\.json.*$/, '/health');
    }
  }
}
