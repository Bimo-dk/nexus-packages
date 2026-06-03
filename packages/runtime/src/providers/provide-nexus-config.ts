import { APP_INITIALIZER, type EnvironmentProviders, type Provider, makeEnvironmentProviders } from '@angular/core';
import { loadRuntimeConfig } from '../config-loader';
import { NEXUS_CONFIG } from '../tokens';
import type { NexusRuntimeConfig } from '../types';

/**
 * Bootstrap-time loader for /assets/config.json.
 *
 * The config is fetched eagerly (APP_INITIALIZER) so all downstream injectors
 * can synchronously read NEXUS_CONFIG via `inject(NEXUS_CONFIG)`.
 *
 * Pass `defaults` to provide fallback values used during dev or if the asset
 * is missing. The fetched values are merged on top.
 */
export function provideNexusConfig(defaults: NexusRuntimeConfig): EnvironmentProviders {
  const mutable: NexusRuntimeConfig = { ...defaults };
  const providers: Provider[] = [
    { provide: NEXUS_CONFIG, useValue: mutable },
    {
      provide: APP_INITIALIZER,
      multi: true,
      useFactory: () => async () => {
        const loaded = await loadRuntimeConfig(defaults, defaults.configAssetPath);
        Object.assign(mutable, loaded);
      },
    },
  ];
  return makeEnvironmentProviders(providers);
}
