import type { RegistryResponse, RemoteConfig } from '@bimo-nexus/core';

/**
 * Opretter et komplet RemoteConfig med fornuftige default-værdier.
 * Override felter via partial-argument.
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
 * Opretter en RegistryResponse med N mock remotes (default 2).
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
