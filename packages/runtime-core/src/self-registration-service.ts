import { RegistryError } from '@bimo-dk/nexus-core';

export interface RegisterOptions {
  name: string;
  url: string;
  exposedModule: string;
  routePath: string;
  registryUrl: string;
  token: string;
  publicUrl?: string;
}

interface GatewayConfigWindow {
  registryUrl?: string;
  wsUrl?: string;
}

function readGatewayRegistryUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const cfg = (window as unknown as { __NEXUS_GATEWAY_CONFIG__?: GatewayConfigWindow }).__NEXUS_GATEWAY_CONFIG__;
  return cfg?.registryUrl ?? null;
}

/**
 * Registers this remote with the Nexus registry via POST.
 * Falls back to PUT on 409 (already registered — idempotent re-registration).
 * Reads window.__NEXUS_GATEWAY_CONFIG__.registryUrl when present so remotes
 * behind a gateway use the correct registry address automatically.
 */
export class SelfRegistrationService {
  async register(options: RegisterOptions): Promise<void> {
    const base = (readGatewayRegistryUrl() ?? options.registryUrl).replace(/\/$/, '');
    const headers = {
      'Content-Type': 'application/json',
      'X-Nexus-Token': options.token,
    };
    const body = JSON.stringify({
      name: options.name,
      url: options.publicUrl ?? options.url,
      exposedModule: options.exposedModule,
      routePath: options.routePath,
    });

    const postRes = await fetch(`${base}/remotes`, { method: 'POST', headers, body });

    if (postRes.ok || postRes.status === 201) return;

    if (postRes.status === 409) {
      const putRes = await fetch(`${base}/remotes/${encodeURIComponent(options.name)}`, {
        method: 'PUT',
        headers,
        body,
      });
      if (!putRes.ok) {
        throw new RegistryError(
          `Failed to re-register remote "${options.name}": ${putRes.status}`,
          putRes.status,
        );
      }
      return;
    }

    throw new RegistryError(
      `Failed to register remote "${options.name}": ${postRes.status}`,
      postRes.status,
    );
  }
}
