import {
  APP_INITIALIZER,
  type EnvironmentProviders,
  type Provider,
  inject,
  makeEnvironmentProviders,
} from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideNexusConfig } from './provide-nexus-config';
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
 * Both are auto-started at bootstrap. Hosts only need to read `loadedRemotes()`
 * and `remoteHealth()` to render UI.
 */
export function provideNexusHost(options: NexusHostProviderOptions): EnvironmentProviders {
  const healthIntervalMs = options.host?.healthIntervalMs;
  const providers: (Provider | EnvironmentProviders)[] = [
    provideNexusConfig(options.configDefaults),
    provideHttpClient(withInterceptors([nexusAuthInterceptor, correlationIdInterceptor])),
    {
      provide: APP_INITIALIZER,
      multi: true,
      useFactory: () => {
        const nexus = inject(DynamicNexusService);
        const health = inject(HealthService);
        return async () => {
          await nexus.initialize();
          health.start(healthIntervalMs);
        };
      },
    },
  ];
  return makeEnvironmentProviders(providers);
}
