import type { GateConfig, GatewayConfig, HostConfig, ProtectionConfig, RegistryResponse, RemoteConfig } from '@bimo-dk/nexus-core';

/**
 * Creates a complete RemoteConfig with sensible default values.
 * Override fields via partial argument.
 */
export function createMockRemoteConfig(overrides: Partial<RemoteConfig> = {}): RemoteConfig {
  const name = overrides.name ?? 'mockRemote';
  return {
    name,
    url: `/remotes/${name}/remoteEntry.json`,
    exposedModule: './RemoteEntry',
    routePath: name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase(),
    enabled: true,
    addedAt: '2026-01-01T00:00:00.000Z',
    healthStatus: 'healthy',
    ...overrides,
  };
}

/**
 * Creates a RegistryResponse with N mock remotes (default 2).
 */
export function createMockRegistryResponse(count = 2): RegistryResponse {
  const remotes = Array.from({ length: count }, (_, i) =>
    createMockRemoteConfig({ name: `mockRemote${i + 1}` }),
  );
  return {
    remotes,
    total: remotes.length,
    enabled: remotes.filter((r) => r.enabled).length,
  };
}

/**
 * Creates a complete HostConfig with sensible default values.
 */
export function createMockHost(overrides: Partial<HostConfig> = {}): HostConfig {
  const name = overrides.name ?? 'mockHost';
  return {
    id: overrides.id ?? `host-${name}`,
    name,
    url: overrides.url ?? `http://localhost:4000`,
    framework: overrides.framework ?? 'angular',
    remoteEntry: overrides.remoteEntry ?? '/host/remoteEntry.json',
    exposedModule: overrides.exposedModule ?? './AppShell',
    enabled: overrides.enabled ?? true,
    createdAt: overrides.createdAt ?? '2026-01-01T00:00:00.000Z',
    updatedAt: overrides.updatedAt ?? '2026-01-01T00:00:00.000Z',
    gateCount: overrides.gateCount ?? 0,
  };
}

/**
 * Creates a complete GateConfig with an embedded mock HostConfig.
 */
export function createMockGate(overrides: Partial<GateConfig & { hostId?: string }> = {}): GateConfig {
  const name = overrides.name ?? 'mockGate';
  const host = overrides.host ?? createMockHost();
  return {
    id: overrides.id ?? `gate-${name}`,
    name,
    domain: overrides.domain ?? 'mock.example.com',
    hostId: overrides.hostId ?? host.id,
    host,
    enabled: overrides.enabled ?? true,
    createdAt: overrides.createdAt ?? '2026-01-01T00:00:00.000Z',
    updatedAt: overrides.updatedAt ?? '2026-01-01T00:00:00.000Z',
  };
}

/**
 * Creates a mock ProtectionConfig with conservative defaults.
 */
export function createMockProtectionConfig(overrides: Partial<ProtectionConfig> = {}): ProtectionConfig {
  return {
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
    ...overrides,
  };
}

/**
 * Creates a mock GatewayConfig.
 */
export function createMockGatewayConfig(overrides: Partial<GatewayConfig> = {}): GatewayConfig {
  return {
    hostRemoteEntry: '/host/remoteEntry.json',
    hostExposedModule: './AppShell',
    hostFramework: 'auto',
    publicUrl: 'http://localhost:4200',
    corsOrigins: ['*'],
    customHeaders: {},
    healthCheckPath: '/health',
    protection: createMockProtectionConfig(),
    ...overrides,
  };
}

/**
 * Sets window.__NEXUS_GATEWAY_CONFIG__ to a mock value for unit tests.
 * Call the returned cleanup function in afterEach to restore the original value.
 */
export function createMockGatewayConfigWindow(overrides: Partial<GatewayConfig> = {}): () => void {
  const original = (globalThis as Record<string, unknown>)['__NEXUS_GATEWAY_CONFIG__'];
  (globalThis as Record<string, unknown>)['__NEXUS_GATEWAY_CONFIG__'] = createMockGatewayConfig(overrides);
  return () => {
    if (original === undefined) {
      delete (globalThis as Record<string, unknown>)['__NEXUS_GATEWAY_CONFIG__'];
    } else {
      (globalThis as Record<string, unknown>)['__NEXUS_GATEWAY_CONFIG__'] = original;
    }
  };
}
