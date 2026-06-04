import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription, interval, startWith } from 'rxjs';
import type { RemoteHealthStatus } from '@bimo-dk/nexus-core';
import { DynamicNexusService } from './dynamic-nexus.service';

const DEFAULT_INTERVAL_MS = 30_000;
const DEGRADED_THRESHOLD_MS = 1500;

@Injectable({ providedIn: 'root' })
export class HealthService {
  private readonly nexus = inject(DynamicNexusService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly state = signal<Map<string, RemoteHealthStatus>>(new Map());
  private subscription?: Subscription;

  readonly remoteHealth = computed(() => this.state());

  start(intervalMs: number = DEFAULT_INTERVAL_MS): void {
    if (this.subscription) return;
    this.subscription = interval(intervalMs)
      .pipe(startWith(0), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.runChecks());
  }

  private async runChecks(): Promise<void> {
    const remotes = this.nexus.loadedRemotes();
    if (remotes.length === 0) return;

    const checks = remotes.map(async (remote) => {
      const healthUrl = this.buildHealthUrl(remote.url);
      const start = performance.now();
      try {
        const res = await fetch(healthUrl, { method: 'GET', cache: 'no-store' });
        const elapsed = performance.now() - start;
        if (!res.ok) {
          return { name: remote.name, status: 'down' as RemoteHealthStatus };
        }
        const status: RemoteHealthStatus = elapsed > DEGRADED_THRESHOLD_MS ? 'degraded' : 'healthy';
        return { name: remote.name, status };
      } catch {
        return { name: remote.name, status: 'down' as RemoteHealthStatus };
      }
    });

    const results = await Promise.all(checks);
    this.state.update((prev) => {
      const next = new Map(prev);
      for (const r of results) {
        const before = next.get(r.name);
        if (before !== r.status) {
          console.log(`[nexus] health ${r.name}: ${before ?? 'unknown'} -> ${r.status} @ ${new Date().toISOString()}`);
        }
        next.set(r.name, r.status);
      }
      return next;
    });
  }

  private buildHealthUrl(remoteEntryUrl: string): string {
    try {
      const u = new URL(remoteEntryUrl);
      u.pathname = '/health';
      u.search = '';
      return u.toString();
    } catch {
      return remoteEntryUrl.replace(/\/remoteEntry\.json.*$/, '/health');
    }
  }
}
