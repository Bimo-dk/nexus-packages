import { Injectable, Type, inject } from '@angular/core';
import { loadRemoteModule } from '@angular-architects/native-federation';
import { DynamicNexusService } from './dynamic-nexus.service.js';

/**
 * Loads a single exposed module from a registered remote.
 *
 * Use this for advanced loading patterns beyond the default route-registration
 * (e.g. NgComponentOutlet grids, on-demand button-triggered loading, dialogs).
 * The remote must already be present in DynamicNexusService.loadedRemotes()
 * (i.e. registered with the registry).
 *
 * Example:
 *   const loader = inject(ComponentLoaderService);
 *   const cmp = await loader.loadComponent('remoteOne', 'MetricCard');
 *   // cmp is a Type<unknown> ready for NgComponentOutlet
 */
@Injectable({ providedIn: 'root' })
export class ComponentLoaderService {
  private readonly nexus = inject(DynamicNexusService);
  private readonly cache = new Map<string, Promise<Type<unknown>>>();

  loadComponent(remoteName: string, exposeAs: string): Promise<Type<unknown>> {
    const key = `${remoteName}::${exposeAs}`;
    const existing = this.cache.get(key);
    if (existing) return existing;

    const remote = this.nexus.loadedRemotes().find((r) => r.name === remoteName);
    if (!remote) {
      return Promise.reject(new Error(`[nexus] Remote "${remoteName}" not loaded (not in registry?)`));
    }

    const moduleName = exposeAs.startsWith('./') ? exposeAs : `./${exposeAs}`;
    const promise = loadRemoteModule({ remoteEntry: remote.url, exposedModule: moduleName }).then(
      (mod: Record<string, unknown>) => {
        const cmp = (mod['default'] ?? mod[Object.keys(mod)[0]]) as Type<unknown>;
        if (!cmp) throw new Error(`[nexus] Module "${moduleName}" on "${remoteName}" exposed nothing usable`);
        return cmp;
      },
    );
    this.cache.set(key, promise);
    return promise;
  }

  /** Preload multiple components in parallel — useful for eager grids. */
  async preloadAll(targets: Array<{ remote: string; expose: string }>): Promise<Type<unknown>[]> {
    return Promise.all(targets.map((t) => this.loadComponent(t.remote, t.expose)));
  }
}
