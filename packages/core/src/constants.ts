/**
 * Bimo-Nexus platform defaults. Frozen so they cannot be mutated at runtime.
 *
 * All ports and headers are agreed conventions across services.
 * Bump major version on @bimo-dk/nexus-core if any of these values change.
 */
export const NEXUS_DEFAULTS = Object.freeze({
  REGISTRY_PORT: 8670,
  HOST_PORT: 4000,
  APP_PORT: 80,
  PORTAL_PORT: 9000,
  TOKEN_HEADER: 'X-Nexus-Token',
  REQUEST_ID_HEADER: 'X-Request-ID',
  WEBSOCKET_PATH: '/ws',
  CACHE_TTL_MS: 86_400_000, // 24h
  HEALTH_POLL_INTERVAL_MS: 30_000,
  WS_MAX_RECONNECT_DELAY_MS: 30_000,
  HOST_REMOTE_ENTRY: '/host/remoteEntry.json',
  HOST_EXPOSED_MODULE: './AppShell',
  GATEWAY_CONFIG_KEY: 'gateway_config',
  WS_SUBSCRIBE_GATE_TYPE: 'subscribe_gate',
} as const);

export type NexusDefaults = typeof NEXUS_DEFAULTS;
