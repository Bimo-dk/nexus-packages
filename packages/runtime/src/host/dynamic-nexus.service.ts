import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { Router, type Routes } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { loadRemoteModule } from '@angular-architects/native-federation';
import type { RemoteConfig } from '@bimo-dk/nexus-core';
import { RegistryService } from './registry.service';
import { RegistryWebSocketService } from './registry-websocket.service';

@Injectable({ providedIn: 'root' })
export class DynamicNexusService {
  private readonly router = inject(Router);
  private readonly registry = inject(RegistryService);
  private readonly ws = inject(RegistryWebSocketService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loadedRemotes = signal<RemoteConfig[]>([]);
  readonly failedRemotes = signal<Map<string, string>>(new Map());

  readonly registryOnline = computed(() => this.ws.connected() || this.registry.lastFetchOk());

  private initStarted = false;

  async initialize(): Promise<void> {
    if (this.initStarted) return;
    this.initStarted = true;

    try {
      const initial = await this.fetchInitial();
      await this.reconcile(initial);
    } catch (err) {
      console.error('[nexus] Initial sync failed:', err);
    }

    this.ws.remotesChanged$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((remotes) => {
        const enabled = remotes.filter((r) => r.enabled);
        this.reconcile(enabled).catch((err) =>
          console.error('[nexus] Reconcile from WS failed:', err),
        );
      });

    this.ws.hostChanged$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        // Re-sync remotes when a host changes (visibility may have shifted)
        this.fetchInitial().then((remotes) =>
          this.reconcile(remotes).catch((err) =>
            console.error('[nexus] Reconcile from host_changed failed:', err),
          ),
        );
      });

    this.ws.connect();
  }

  private fetchInitial(): Promise<RemoteConfig[]> {
    return new Promise((resolve) => {
      this.registry.getEnabledRemotes().subscribe({
        next: (r) => resolve(r),
        error: () => resolve([]),
      });
    });
  }

  private async reconcile(desired: RemoteConfig[]): Promise<void> {
    const currentNames = new Set(this.loadedRemotes().map((r) => r.name));
    const desiredNames = new Set(desired.map((r) => r.name));

    for (const remote of desired) {
      if (!currentNames.has(remote.name)) {
        await this.registerRoute(remote);
      }
    }

    if (currentNames.size !== desiredNames.size || [...currentNames].some((n) => !desiredNames.has(n))) {
      this.removeStaleRoutes(desiredNames);
    }
  }

  private async registerRoute(remote: RemoteConfig): Promise<void> {
    try {
      const moduleRef = await loadRemoteModule({
        remoteEntry: remote.url,
        exposedModule: remote.exposedModule,
      });

      // BYOF path: if the remote exports `mount(el)` we wrap it in the
      // generic NexusByofWrapperComponent so Angular's router can route
      // to a Vue/React/vanilla remote without trying to instantiate it
      // as an Angular component. The remote owns its own framework
      // runtime inside the wrapper's div.
      const mountFn = (moduleRef as Record<string, unknown>)['mount'] as
        | ((el: HTMLElement) => void | (() => void))
        | undefined;

      let loadComponentFactory: () => Promise<unknown>;

      if (typeof mountFn === 'function') {
        const { NexusByofWrapperComponent } = await import('./byof-wrapper.component');
        loadComponentFactory = () => {
          const SubClass = class extends NexusByofWrapperComponent {
            override ngAfterViewInit(): void {
              this.mountFn = mountFn;
              super.ngAfterViewInit();
            }
          };
          return Promise.resolve(SubClass);
        };
      } else {
        const component =
          moduleRef['EntryComponent'] ??
          moduleRef['default'] ??
          moduleRef[Object.keys(moduleRef)[0]];
        if (!component) {
          throw new Error(
            `Remote "${remote.name}" did not expose a usable component or mount() function`,
          );
        }
        loadComponentFactory = () => Promise.resolve(component);
      }

      const newRoute = {
        path: remote.routePath,
        loadComponent: loadComponentFactory,
        data: { remoteName: remote.name },
      };

      const existing = this.router.config.filter((r) => r.path !== remote.routePath);
      const updated: Routes = [...existing, newRoute as Routes[number]].sort((a, b) => {
        if (a.path === '**') return 1;
        if (b.path === '**') return -1;
        return 0;
      });
      this.router.resetConfig(updated);

      this.loadedRemotes.update((list) => [...list.filter((r) => r.name !== remote.name), remote]);
      this.clearFailure(remote.name);

      console.log(`[nexus] Registered "${remote.name}" at /${remote.routePath}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[nexus] Failed to load remote "${remote.name}":`, msg);
      this.failedRemotes.update((m) => {
        const next = new Map(m);
        next.set(remote.name, msg);
        return next;
      });
    }
  }

  private removeStaleRoutes(desiredNames: Set<string>): void {
    const stale = this.loadedRemotes().filter((r) => !desiredNames.has(r.name));
    if (stale.length === 0) return;

    const stalePaths = new Set(stale.map((r) => r.routePath));
    const updated = this.router.config.filter((r) => !stalePaths.has(r.path ?? ''));
    this.router.resetConfig(updated);

    this.loadedRemotes.update((list) => list.filter((r) => desiredNames.has(r.name)));
    for (const s of stale) {
      console.log(`[nexus] Removed stale remote "${s.name}"`);
    }
  }

  private clearFailure(name: string): void {
    this.failedRemotes.update((m) => {
      if (!m.has(name)) return m;
      const next = new Map(m);
      next.delete(name);
      return next;
    });
  }
}
