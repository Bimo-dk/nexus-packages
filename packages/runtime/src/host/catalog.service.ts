import { Injectable, computed, inject, signal } from '@angular/core';
import { DynamicNexusService } from './dynamic-nexus.service';

export type NexusInputType = 'string' | 'number' | 'boolean' | 'object' | 'array';

export interface NexusInputSpec {
  type: NexusInputType;
  default?: unknown;
  description?: string;
  required?: boolean;
  enum?: string[];
}

export interface CatalogEntry {
  remote: string;
  expose: string;
  className: string;
  title: string;
  description?: string;
  category?: string;
  tags: string[];
  icon?: string;
  inputs: Record<string, NexusInputSpec>;
  experimental: boolean;
}

interface CatalogManifest {
  remote: string;
  generatedAt: string;
  entries: CatalogEntry[];
}

/**
 * Aggregates `/catalog.json` from every registered remote into one searchable
 * signal of CatalogEntry objects. Used by the portal's Component Catalog page
 * and any in-app "component picker" UI.
 *
 * Catalog manifests are auto-generated at remote build time by `nexus-build`
 * from `@NexusComponent({...})` decorators.
 */
@Injectable({ providedIn: 'root' })
export class CatalogService {
  private readonly nexus = inject(DynamicNexusService);

  readonly entries = signal<CatalogEntry[]>([]);
  readonly loading = signal<boolean>(false);
  readonly errors = signal<Map<string, string>>(new Map());

  readonly categories = computed<string[]>(() => {
    const set = new Set<string>();
    for (const e of this.entries()) if (e.category) set.add(e.category);
    return Array.from(set).sort();
  });

  readonly tags = computed<string[]>(() => {
    const set = new Set<string>();
    for (const e of this.entries()) for (const t of e.tags) set.add(t);
    return Array.from(set).sort();
  });

  /** Re-read every registered remote's catalog.json and merge into the entries signal. */
  async refresh(): Promise<void> {
    this.loading.set(true);
    const errors = new Map<string, string>();
    const collected: CatalogEntry[] = [];

    const remotes = this.nexus.loadedRemotes();
    await Promise.all(
      remotes.map(async (r) => {
        const url = this.deriveCatalogUrl(r.url);
        try {
          const res = await fetch(url, { cache: 'no-store' });
          if (!res.ok) {
            errors.set(r.name, `HTTP ${res.status}`);
            return;
          }
          const manifest = (await res.json()) as CatalogManifest;
          for (const entry of manifest.entries) {
            collected.push({ ...entry, remote: r.name });
          }
        } catch (err) {
          errors.set(r.name, err instanceof Error ? err.message : String(err));
        }
      }),
    );

    this.entries.set(collected);
    this.errors.set(errors);
    this.loading.set(false);
  }

  filter(opts: { query?: string; category?: string; tag?: string; remote?: string }): CatalogEntry[] {
    const q = opts.query?.toLowerCase().trim();
    return this.entries().filter((e) => {
      if (opts.remote && e.remote !== opts.remote) return false;
      if (opts.category && e.category !== opts.category) return false;
      if (opts.tag && !e.tags.includes(opts.tag)) return false;
      if (q) {
        const hay = `${e.title} ${e.description ?? ''} ${e.tags.join(' ')} ${e.expose}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }

  private deriveCatalogUrl(remoteEntryUrl: string): string {
    // Replace trailing /remoteEntry.json with /catalog.json
    return remoteEntryUrl.replace(/\/remoteEntry\.json([?#].*)?$/, '/catalog.json');
  }
}
