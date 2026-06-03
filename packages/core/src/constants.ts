/**
 * Bimo-Nexus platform defaults. Frozen så de ikke kan muteres ved runtime.
 *
 * Alle ports og headers er aftalte konventioner på tværs af services.
 * Bumpr major version på @bimo-dk/nexus-core hvis nogen af disse værdier ændres.
 */
export const NEXUS_DEFAULTS = Object.freeze({
  REGISTRY_PORT: 3000,
  HOST_PORT: 4000,
  APP_PORT: 80,
  PORTAL_PORT: 9000,
  TOKEN_HEADER: 'X-Bimo-Token',
  REQUEST_ID_HEADER: 'X-Request-ID',
  WEBSOCKET_PATH: '/ws',
  CACHE_TTL_MS: 86_400_000, // 24t
  HEALTH_POLL_INTERVAL_MS: 30_000,
  WS_MAX_RECONNECT_DELAY_MS: 30_000,
} as const);

export type NexusDefaults = typeof NEXUS_DEFAULTS;
