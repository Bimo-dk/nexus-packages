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
import { SelfRegisterService } from '../self-register.service';
import type { NexusRemoteConfig, NexusRuntimeConfig } from '../types';

export interface NexusRemoteProviderOptions {
  /** Entry component class — used to read @NexusRemote metadata for name/route inference. */
  entry: object;
  /** Optional overrides for the registration call. */
  registration?: Omit<NexusRemoteConfig, 'entry'>;
  /** Runtime config defaults (overridden by /assets/config.json at startup). */
  configDefaults: NexusRuntimeConfig;
}

/**
 * One-stop provider for Bimo-Nexus remotes.
 *
 * Bundles:
 *   - Runtime config loader (NEXUS_CONFIG from /assets/config.json)
 *   - HttpClient + auth + correlation interceptors
 *   - Self-registration with the registry at bootstrap (POST/PUT /api/remotes)
 */
export function provideNexusRemote(options: NexusRemoteProviderOptions): EnvironmentProviders {
  const providers: (Provider | EnvironmentProviders)[] = [
    provideNexusConfig(options.configDefaults),
    provideHttpClient(withInterceptors([nexusAuthInterceptor, correlationIdInterceptor])),
    {
      provide: APP_INITIALIZER,
      multi: true,
      useFactory: () => {
        const svc = inject(SelfRegisterService);
        return async () => {
          await svc.register({ entry: options.entry, ...(options.registration ?? {}) });
        };
      },
    },
  ];
  return makeEnvironmentProviders(providers);
}
