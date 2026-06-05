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
    remote_entry: overrides.remote_entry ?? '/host/remoteEntry.json',
    exposed_module: overrides.exposed_module ?? './AppShell',
    enabled: overrides.enabled ?? true,
    created_at: overrides.created_at ?? '2026-01-01T00:00:00.000Z',
    updated_at: overrides.updated_at ?? '2026-01-01T00:00:00.000Z',
    gate_count: overrides.gate_count ?? 0,
  };
}

/**
 * Creates a complete GateConfig with an embedded mock HostConfig.
 */
export function createMockGate(overrides: Partial<GateConfig & { host_id?: string }> = {}): GateConfig {
  const name = overrides.name ?? 'mockGate';
  const host = overrides.host ?? createMockHost();
  return {
    id: overrides.id ?? `gate-${name}`,
    name,
    domain: overrides.domain ?? 'mock.example.com',
    host_id: overrides.host_id ?? host.id,
    host,
    enabled: overrides.enabled ?? true,
    created_at: overrides.created_at ?? '2026-01-01T00:00:00.000Z',
    updated_at: overrides.updated_at ?? '2026-01-01T00:00:00.000Z',
  };
}

/**
 * Creates a mock ProtectionConfig with conservative defaults.
 */
export function createMockProtectionConfig(overrides: Partial<ProtectionConfig> = {}): ProtectionConfig {
  return {
    rate_limit_enabled: false,
    rate_limit_requests_per_second: 100,
    rate_limit_burst: 200,
    rate_limit_by: 'ip',
    max_connections_per_ip: 100,
    max_websocket_connections_per_ip: 10,
    request_timeout_ms: 30_000,
    header_read_timeout_ms: 5_000,
    body_read_timeout_ms: 10_000,
    idle_timeout_ms: 60_000,
    max_body_bytes: 1_048_576,
    max_header_bytes: 8_192,
    slowloris_timeout_ms: 10_000,
    ban_duration_seconds: 3_600,
    ban_threshold_violations: 10,
    ...overrides,
  };
}

/**
 * Creates a mock GatewayConfig.
 */
export function createMockGatewayConfig(overrides: Partial<GatewayConfig> = {}): GatewayConfig {
  return {
    host_remote_entry: '/host/remoteEntry.json',
    host_exposed_module: './AppShell',
    host_framework: 'auto',
    public_url: 'http://localhost:4200',
    cors_origins: ['*'],
    custom_headers: {},
    health_check_path: '/health',
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
