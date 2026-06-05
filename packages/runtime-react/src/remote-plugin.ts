import { SelfRegistrationService, type RegisterOptions } from '@bimo-dk/nexus-runtime-core';

/**
 * Call once at remote startup (outside any component) to self-register with the registry.
 *
 * Usage in remote's main.tsx:
 *   registerNexusRemote({ name, url, exposedModule, routePath, registryUrl, token })
 */
export function registerNexusRemote(options: RegisterOptions): void {
  const svc = new SelfRegistrationService();
  svc.register(options).catch((err) => {
    console.error('[nexus-react] Self-registration failed:', err);
  });
}
