export type RemoteHealthStatus = 'healthy' | 'degraded' | 'down' | 'unknown';

export interface RemoteConfig {
  /** Unikt navn, camelCase, starter med lille bogstav. */
  name: string;
  /** URL til remoteEntry.json — kan være absolut (http(s)://) eller relativ (/...). */
  url: string;
  /** Exposed module path. Default './RemoteEntry'. */
  exposedModule: string;
  /** URL-path i kebab-case (a-z, 0-9, -). */
  routePath: string;
  /** Om remoten er aktivt registreret hos host. */
  enabled: boolean;
  /** ISO 8601 timestamp for hvornår remoten blev tilføjet. */
  addedAt: string;
  /** ISO 8601 timestamp for seneste health-check. */
  lastHealthCheck?: string;
  /** Resultat af seneste health-check. */
  healthStatus?: RemoteHealthStatus;
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
  | { type: 'connected'; remotes: RemoteConfig[] }
  | { type: 'registry_updated'; remotes: RemoteConfig[] };

export interface AddRemoteRequest {
  name: string;
  url: string;
  exposedModule?: string;
  routePath: string;
  enabled?: boolean;
}

export type UpdateRemoteRequest = Partial<Omit<RemoteConfig, 'name' | 'addedAt'>>;
