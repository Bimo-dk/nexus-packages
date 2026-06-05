import { NEXUS_DEFAULTS, type GatewayConfig, type ProtectionConfig } from '@bimo-dk/nexus-core';

const DEFAULT_PROTECTION: ProtectionConfig = {
  rateLimitEnabled: false,
  rateLimitRequestsPerSecond: 100,
  rateLimitBurst: 200,
  rateLimitBy: 'ip',
  maxConnectionsPerIp: 100,
  maxWebsocketConnectionsPerIp: 10,
  requestTimeoutMs: 30_000,
  headerReadTimeoutMs: 5_000,
  bodyReadTimeoutMs: 10_000,
  idleTimeoutMs: 60_000,
  maxBodyBytes: 1_048_576,
  maxHeaderBytes: 8_192,
  slowlorisTimeoutMs: 10_000,
  banDurationSeconds: 3_600,
  banThresholdViolations: 10,
};

const DEFAULT_GATEWAY_CONFIG: GatewayConfig = {
  hostRemoteEntry: NEXUS_DEFAULTS.HOST_REMOTE_ENTRY,
  hostExposedModule: NEXUS_DEFAULTS.HOST_EXPOSED_MODULE,
  hostFramework: 'auto',
  publicUrl: '',
  corsOrigins: [],
  customHeaders: {},
  healthCheckPath: '/health',
  protection: DEFAULT_PROTECTION,
};

/**
 * Reads window.__NEXUS_GATEWAY_CONFIG__ and returns a typed GatewayConfig.
 * Falls back to sensible defaults when running in local development (no gateway).
 */
export class GatewayConfigReader {
  readConfig(): GatewayConfig {
    if (typeof window === 'undefined') return { ...DEFAULT_GATEWAY_CONFIG };
    const raw = (window as unknown as { __NEXUS_GATEWAY_CONFIG__?: Partial<GatewayConfig> }).__NEXUS_GATEWAY_CONFIG__;
    if (!raw) return { ...DEFAULT_GATEWAY_CONFIG };
    return {
      ...DEFAULT_GATEWAY_CONFIG,
      ...raw,
      protection: { ...DEFAULT_PROTECTION, ...(raw.protection ?? {}) },
    };
  }
}
