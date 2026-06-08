import {
  NEXUS_DEFAULTS,
  RegistryError,
  type AddRemoteRequest,
  type CreateGateDto,
  type CreateHostDto,
  type GateConfig,
  type GatewayConfig,
  type HealthStatus,
  type HostConfig,
  type HostRemoteConfig,
  type ProtectionConfig,
  type RegistryResponse,
  type RemoteConfig,
  type UpdateGateDto,
  type UpdateHostDto,
  type UpdateRemoteRequest,
} from '@bimo-dk/nexus-core';
import { nextRequestId } from './correlation.js';

export interface RegistryClientOptions {
  /** Base URL to registry, e.g. 'http://localhost:3000' or '/api'. Trailing slash is trimmed. */
  registryUrl: string;
  /** Token for the X-Nexus-Token header. Required for write endpoints. */
  token: string;
  /**
   * Optional custom fetch (for testing / Node.js < 18). Default = globalThis.fetch.
   */
  fetchImpl?: typeof fetch;
}

export interface GetRemotesOptions {
  host_id?: string;
}

export interface ProtectionStatus {
  active_bans: Array<{ ip: string; expires_at: string }>;
  top_ips: Array<{ ip: string; request_count: number }>;
  rate_limit_config: ProtectionConfig;
}

/**
 * HTTP client for the Nexus registry API.
 *
 * Example:
 *   const client = new RegistryClient({ registryUrl: '/api', token: process.env.NEXUS_TOKEN });
 *   const remotes = await client.getRemotes();
 */
export class RegistryClient {
  private readonly apiUrl: string;
  private readonly baseUrl: string;
  private readonly token: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: RegistryClientOptions) {
    if (!options.registryUrl) {
      throw new Error('RegistryClient: registryUrl is required');
    }
    // Token is optional in browsers: the trust-boundary model in
    // CLAUDE.md forbids shipping NEXUS_TOKEN into the browser, so
    // the gateway injects it on the server-to-server hop instead.
    // Throwing here breaks every browser-side host built with the
    // Vue / React templates. Log once and continue with an empty
    // token; the gateway is responsible for upstream auth.
    // Accept both bare bases (http://registry:3000) and pre-/api URLs
    // (/api). Internally store apiUrl WITH /api so every endpoint helper
    // can just append `/remotes`, `/hosts` etc. without re-checking.
    // Fixes B-23 (double /api/api/) seen from browser hosts that pass
    // registryUrl='/api'.
    const raw = options.registryUrl.replace(/\/$/, '');
    this.apiUrl = /\/api$/.test(raw) ? raw : raw + '/api';
    this.baseUrl = this.apiUrl + '/remotes';
    this.token = options.token ?? '';
    if (!this.token && typeof console !== 'undefined') {
      console.warn(
        '[nexus-client] RegistryClient constructed without a token; ' +
          'assuming a gateway will inject X-Nexus-Token on the registry hop.',
      );
    }
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch.bind(globalThis);
  }

  // ── Remotes ────────────────────────────────────────────────────────────────

  async getRemotes(options?: GetRemotesOptions): Promise<RemoteConfig[]> {
    let url = this.baseUrl;
    if (options?.host_id) {
      url += `?host_id=${encodeURIComponent(options.host_id)}`;
    }
    const res = await this.request('GET', url);
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

  // ── Hosts ──────────────────────────────────────────────────────────────────

  async getHosts(): Promise<HostConfig[]> {
    const res = await this.request('GET', `${this.apiUrl}/hosts`);
    return (await res.json()) as HostConfig[];
  }

  async getHost(id: string): Promise<HostConfig> {
    const res = await this.request('GET', `${this.apiUrl}/hosts/${encodeURIComponent(id)}`);
    return (await res.json()) as HostConfig;
  }

  async getHostRemotes(id: string): Promise<HostRemoteConfig[]> {
    const res = await this.request('GET', `${this.apiUrl}/hosts/${encodeURIComponent(id)}/remotes`);
    const body = (await res.json()) as { remotes: HostRemoteConfig[] };
    return body.remotes;
  }

  async createHost(dto: CreateHostDto): Promise<HostConfig> {
    const res = await this.request('POST', `${this.apiUrl}/hosts`, dto);
    return (await res.json()) as HostConfig;
  }

  async updateHost(id: string, dto: UpdateHostDto): Promise<HostConfig> {
    const res = await this.request('PUT', `${this.apiUrl}/hosts/${encodeURIComponent(id)}`, dto);
    return (await res.json()) as HostConfig;
  }

  async deleteHost(id: string): Promise<void> {
    await this.request('DELETE', `${this.apiUrl}/hosts/${encodeURIComponent(id)}`);
  }

  async toggleHost(id: string): Promise<HostConfig> {
    const res = await this.request('POST', `${this.apiUrl}/hosts/${encodeURIComponent(id)}/toggle`, {});
    return (await res.json()) as HostConfig;
  }

  // ── Gates ──────────────────────────────────────────────────────────────────

  async getGates(): Promise<GateConfig[]> {
    const res = await this.request('GET', `${this.apiUrl}/gates`);
    return (await res.json()) as GateConfig[];
  }

  async getGate(id: string): Promise<GateConfig> {
    const res = await this.request('GET', `${this.apiUrl}/gates/${encodeURIComponent(id)}`);
    return (await res.json()) as GateConfig;
  }

  async getGateByDomain(domain: string): Promise<GateConfig> {
    const res = await this.request('GET', `${this.apiUrl}/gates/by-domain/${encodeURIComponent(domain)}`);
    return (await res.json()) as GateConfig;
  }

  async createGate(dto: CreateGateDto): Promise<GateConfig> {
    const res = await this.request('POST', `${this.apiUrl}/gates`, dto);
    return (await res.json()) as GateConfig;
  }

  async updateGate(id: string, dto: UpdateGateDto): Promise<GateConfig> {
    const res = await this.request('PUT', `${this.apiUrl}/gates/${encodeURIComponent(id)}`, dto);
    return (await res.json()) as GateConfig;
  }

  async deleteGate(id: string): Promise<void> {
    await this.request('DELETE', `${this.apiUrl}/gates/${encodeURIComponent(id)}`);
  }

  async toggleGate(id: string): Promise<GateConfig> {
    const res = await this.request('POST', `${this.apiUrl}/gates/${encodeURIComponent(id)}/toggle`, {});
    return (await res.json()) as GateConfig;
  }

  // ── Gateway config ─────────────────────────────────────────────────────────

  async getGatewayConfig(): Promise<GatewayConfig> {
    const res = await this.request('GET', `${this.apiUrl}/config/gateway`);
    return (await res.json()) as GatewayConfig;
  }

  async updateGatewayConfig(patch: Partial<GatewayConfig>): Promise<GatewayConfig> {
    const res = await this.request('PUT', `${this.apiUrl}/config/gateway`, patch);
    return (await res.json()) as GatewayConfig;
  }

  // ── Protection ─────────────────────────────────────────────────────────────

  async getProtectionStatus(): Promise<ProtectionStatus> {
    const res = await this.request('GET', `${this.apiUrl}/protection/status`);
    return (await res.json()) as ProtectionStatus;
  }

  async getProtectionConfig(): Promise<ProtectionConfig> {
    const res = await this.request('GET', `${this.apiUrl}/config/gateway/protection`);
    return (await res.json()) as ProtectionConfig;
  }

  async updateProtectionConfig(config: ProtectionConfig): Promise<ProtectionConfig> {
    const res = await this.request('PUT', `${this.apiUrl}/config/gateway/protection`, config);
    return (await res.json()) as ProtectionConfig;
  }

  async banIp(ip: string, duration_seconds?: number): Promise<void> {
    await this.request('POST', `${this.apiUrl}/protection/ban`, { ip, duration_seconds });
  }

  async unbanIp(ip: string): Promise<void> {
    await this.request('DELETE', `${this.apiUrl}/protection/ban/${encodeURIComponent(ip)}`);
  }

  async clearAllBans(): Promise<void> {
    await this.request('DELETE', `${this.apiUrl}/protection/ban`);
  }

  // ── Health ─────────────────────────────────────────────────────────────────

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

  // ── Internal ───────────────────────────────────────────────────────────────

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
        return remoteEntryUrl.replace(/\/remoteEntry\.json.*$/, '/health');
      }
      return u.toString();
    } catch {
      return remoteEntryUrl.replace(/\/remoteEntry\.json.*$/, '/health');
    }
  }
}
