export type RemoteHealthStatus = 'healthy' | 'degraded' | 'down' | 'unknown';

export type RemoteVisibility = 'global' | `host:${string}`;

export type HostFramework = 'angular' | 'vue' | 'react';

export interface RemoteConfig {
  /** Unikt navn, camelCase, starter med lille bogstav. */
  name: string;
  /** URL til remoteEntry.json — kan be absolut (http(s)://) eller relativ (/...). */
  url: string;
  /** Exposed module path. Default './RemoteEntry'. */
  exposedModule: string;
  /** URL-path i kebab-case (a-z, 0-9, -). */
  routePath: string;
  /** Om remoten er aktivt registreret hos host. */
  enabled: boolean;
  /** ISO 8601 timestamp for hvornaar remoten blev added. */
  addedAt: string;
  /** ISO 8601 timestamp for seneste health-check. */
  lastHealthCheck?: string;
  /** Resultat af seneste health-check. */
  healthStatus?: RemoteHealthStatus;
  /** Internal Docker/container URL used by the gateway to proxy traffic. */
  upstreamUrl?: string;
  /** Visibility scope: global means all hosts, host:<id> means one host only. */
  visibility?: RemoteVisibility;
}

export interface HostRemoteConfig extends RemoteConfig {
  /** Whether this remote came from the global pool or is host-specific. */
  source: 'global' | 'host-specific';
}

export interface HostConfig {
  id: string;
  name: string;
  url: string;
  framework: HostFramework;
  remoteEntry: string;
  exposedModule: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  gateCount: number | null;
}

export interface GateConfig {
  id: string;
  name: string;
  domain: string;
  hostId: string;
  host: HostConfig;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProtectionConfig {
  rateLimitEnabled: boolean;
  rateLimitRequestsPerSecond: number;
  rateLimitBurst: number;
  rateLimitBy: 'ip' | 'token';
  maxConnectionsPerIp: number;
  maxWebsocketConnectionsPerIp: number;
  requestTimeoutMs: number;
  headerReadTimeoutMs: number;
  bodyReadTimeoutMs: number;
  idleTimeoutMs: number;
  maxBodyBytes: number;
  maxHeaderBytes: number;
  slowlorisTimeoutMs: number;
  banDurationSeconds: number;
  banThresholdViolations: number;
}

export interface GatewayConfig {
  gateName?: string;
  gateId?: string;
  hostName?: string;
  hostId?: string;
  hostFramework: 'auto' | HostFramework;
  hostRemoteEntry: string;
  hostExposedModule: string;
  registryUrl?: string;
  wsUrl?: string;
  publicUrl?: string;
  corsOrigins?: string[];
  customHeaders?: Record<string, string>;
  healthCheckPath?: string;
  protection?: ProtectionConfig;
}

export interface ReconnectPolicy {
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  jitterMs: number;
  maxAttempts: number;
}

export interface RegistryResponse {
  remotes: RemoteConfig[];
  total: number;
  enabled: number;
}

export interface HealthStatus {
  status: 'ok' | 'error';
  remote?: string;
  timestamp: string;
  responseTimeMs?: number;
}

export type WebSocketMessage =
  | { type: 'welcome'; timestamp: string; clients: number; reconnect_policy?: ReconnectPolicy }
  | { type: 'remotes_changed'; timestamp: string; remotes: RemoteConfig[]; trigger: string }
  | { type: 'host_changed'; host: HostConfig; trigger: string; timestamp: string }
  | { type: 'gate_changed'; gate: GateConfig; trigger: string; old_host_id?: string; new_host_id?: string; timestamp: string }
  | { type: 'config_changed'; section: string; value: unknown; timestamp: string }
  | { type: 'reconnect_policy_changed'; policy: ReconnectPolicy; timestamp: string }
  | { type: 'system_health'; timestamp: string; snapshot: unknown }
  | { type: 'registry_shutting_down'; timestamp: string; resume_in_ms: number }
  | { type: 'token_rotated'; timestamp: string; previous_token_expired: boolean }
  | { type: 'pong'; timestamp: string };

export interface AddRemoteRequest {
  name: string;
  url: string;
  exposedModule?: string;
  routePath: string;
  enabled?: boolean;
  upstreamUrl?: string;
  visibility?: RemoteVisibility;
}

export type UpdateRemoteRequest = Partial<Omit<RemoteConfig, 'name' | 'addedAt'>>;

export interface CreateHostDto {
  name: string;
  url: string;
  framework: string;
  remoteEntry: string;
  exposedModule: string;
  enabled?: boolean;
}

export type UpdateHostDto = Partial<CreateHostDto>;

export interface CreateGateDto {
  name: string;
  domain: string;
  hostId: string;
  enabled?: boolean;
}

export type UpdateGateDto = Partial<CreateGateDto>;
