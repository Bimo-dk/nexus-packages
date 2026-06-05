import {
  APP_INITIALIZER,
  type EnvironmentProviders,
  type Provider,
  inject,
  makeEnvironmentProviders,
} from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideNexusConfig } from './provide-nexus-config';
import { loadRuntimeConfig } from '../config-loader';
import { NEXUS_CONFIG } from '../tokens';
import { correlationIdInterceptor } from '../interceptors/correlation-id.interceptor';
import { nexusAuthInterceptor } from '../interceptors/nexus-auth.interceptor';
import { DynamicNexusService } from '../host/dynamic-nexus.service';
import { HealthService } from '../host/health.service';
import type { NexusHostConfig, NexusRuntimeConfig } from '../types';

export interface NexusHostProviderOptions {
  /** Runtime config defaults (overridden by /assets/config.json at startup). */
  configDefaults: NexusRuntimeConfig;
  /** Optional host runtime tuning. */
  host?: NexusHostConfig;
}

function readGatewayOverrides(): Partial<NexusRuntimeConfig> {
  if (typeof window === 'undefined') return {};
  const gw = (window as unknown as { __NEXUS_GATEWAY_CONFIG__?: { registryUrl?: string; wsUrl?: string } }).__NEXUS_GATEWAY_CONFIG__;
  if (!gw) return {};
  const overrides: Partial<NexusRuntimeConfig> = {};
  if (gw.registryUrl) overrides.registryUrl = gw.registryUrl;
  return overrides;
}

/**
 * One-stop provider for Bimo-Nexus hosts.
 *
 * Bundles:
 *   - Runtime config loader
 *   - HttpClient + auth + correlation interceptors
 *   - Registry service (with fallback chain)
 *   - WebSocket service (auto-reconnect)
 *   - DynamicNexusService — fetches remotes, registers routes, reacts to broadcasts
 *   - HealthService — polls /health on every loaded remote
 *
 * When window.__NEXUS_GATEWAY_CONFIG__ is present its registryUrl takes precedence
 * over configDefaults, so the host shell works correctly when loaded through a Nexus gateway.
 */
export function provideNexusHost(options: NexusHostProviderOptions): EnvironmentProviders {
  const gatewayOverrides = readGatewayOverrides();
  const effectiveDefaults: NexusRuntimeConfig = { ...options.configDefaults, ...gatewayOverrides };
  const healthIntervalMs = options.host?.healthIntervalMs;

  const providers: (Provider | EnvironmentProviders)[] = [
    provideNexusConfig(effectiveDefaults),
    provideHttpClient(withInterceptors([nexusAuthInterceptor, correlationIdInterceptor])),
    {
      provide: APP_INITIALIZER,
      multi: true,
      useFactory: () => {
        const nexus = inject(DynamicNexusService);
        const health = inject(HealthService);
        const config = inject(NEXUS_CONFIG);
        return async () => {
          const loaded = await loadRuntimeConfig(
            effectiveDefaults,
            effectiveDefaults.configAssetPath,
          );
          Object.assign(config, loaded, gatewayOverrides);
          await nexus.initialize();
          health.start(healthIntervalMs);
        };
      },
    },
  ];
  return makeEnvironmentProviders(providers);
}
