import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, defer, from, map, of, tap } from 'rxjs';
import type { RegistryResponse, RemoteConfig } from '@bimo-dk/nexus-core';
import { NEXUS_CONFIG } from '../tokens';

interface CacheEntry {
  timestamp: number;
  remotes: RemoteConfig[];
}

const CACHE_KEY = 'nexus_remotes_cache_v2';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

@Injectable({ providedIn: 'root' })
export class RegistryService {
  private readonly http = inject(HttpClient);
  private readonly cfg = inject(NEXUS_CONFIG);
  private readonly baseUrl = `${this.cfg.registryUrl.replace(/\/$/, '')}/remotes`;
  private readonly staticBackupUrl = this.cfg.staticBackupUrl ?? '/assets/registry-backup/remotes.json';

  readonly lastFetchOk = signal<boolean>(true);
  readonly lastSource = signal<'live' | 'cache' | 'backup' | 'empty'>('live');

  /**
   * Fetch enabled remotes with fallback chain:
   *   1. Live registry API
   *   2. localStorage cache (max 24h)
   *   3. Static backup file
   *   4. Empty list
   */
  getEnabledRemotes(): Observable<RemoteConfig[]> {
    return this.http.get<RegistryResponse>(this.baseUrl).pipe(
      map((res) => res.remotes.filter((r) => r.enabled)),
      tap((enabled) => {
        this.lastFetchOk.set(true);
        this.lastSource.set('live');
        this.writeCache(enabled);
      }),
      catchError((err: HttpErrorResponse) => {
        this.lastFetchOk.set(false);
        console.error(`[registry] Live fetch failed (status=${err.status}). Trying cache -> backup.`);
        return this.fallbackChain();
      }),
    );
  }

  private fallbackChain(): Observable<RemoteConfig[]> {
    const cached = this.readCache();
    if (cached.length > 0) {
      this.lastSource.set('cache');
      console.warn(`[registry] Using localStorage cache (${cached.length} remotes)`);
      return of(cached);
    }
    return defer(() => from(this.loadStaticBackup())).pipe(
      tap((backup) => {
        if (backup.length > 0) {
          this.lastSource.set('backup');
          console.warn(`[registry] Using static backup file (${backup.length} remotes)`);
        } else {
          this.lastSource.set('empty');
          console.error('[registry] No fallback data available — empty list');
        }
      }),
    );
  }

  private async loadStaticBackup(): Promise<RemoteConfig[]> {
    try {
      const res = await fetch(this.staticBackupUrl, { cache: 'no-cache' });
      if (!res.ok) return [];
      const json = (await res.json()) as { remotes?: RemoteConfig[] };
      return (json.remotes ?? []).filter((r) => r.enabled);
    } catch (err) {
      console.error('[registry] Static backup fetch failed:', err);
      return [];
    }
  }

  private readCache(): RemoteConfig[] {
    try {
      const raw = globalThis.localStorage?.getItem(CACHE_KEY);
      if (!raw) return [];
      const entry = JSON.parse(raw) as CacheEntry;
      const age = Date.now() - entry.timestamp;
      if (age > CACHE_TTL_MS) return [];
      return entry.remotes;
    } catch {
      return [];
    }
  }

  private writeCache(remotes: RemoteConfig[]): void {
    try {
      const entry: CacheEntry = { timestamp: Date.now(), remotes };
      globalThis.localStorage?.setItem(CACHE_KEY, JSON.stringify(entry));
    } catch {
      /* localStorage unavailable */
    }
  }
}
