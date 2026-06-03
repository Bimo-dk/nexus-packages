import {
  APP_INITIALIZER,
  type EnvironmentProviders,
  type Provider,
  inject,
  makeEnvironmentProviders,
} from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideNexusConfig } from './provide-nexus-config.js';
import { correlationIdInterceptor } from '../interceptors/correlation-id.interceptor.js';
import { nexusAuthInterceptor } from '../interceptors/nexus-auth.interceptor.js';
import { DynamicNexusService } from '../host/dynamic-nexus.service.js';
import type { NexusHostConfig, NexusRuntimeConfig } from '../types.js';

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
 *
 * Just call `inject(DynamicNexusService).initialize()` from your shell component's
 * constructor (or via APP_INITIALIZER if you want eager loading).
 */
export function provideNexusHost(options: NexusHostProviderOptions): EnvironmentProviders {
  const providers: (Provider | EnvironmentProviders)[] = [
    provideNexusConfig(options.configDefaults),
    provideHttpClient(withInterceptors([nexusAuthInterceptor, correlationIdInterceptor])),
    {
      provide: APP_INITIALIZER,
      multi: true,
      useFactory: () => {
        const nexus = inject(DynamicNexusService);
        return async () => {
          await nexus.initialize();
        };
      },
    },
  ];
  return makeEnvironmentProviders(providers);
}
