import { Injectable, inject } from '@angular/core';
import { NEXUS_CONFIG } from './tokens.js';
import { readRemoteMetadata } from './decorator-meta.js';
import { deriveRouteFromName } from './route-utils.js';
import type { NexusRemoteConfig } from './types.js';

interface ResolvedRegistration {
  name: string;
  url: string;
  routePath: string;
  exposedModule: string;
  enabled: true;
}

@Injectable({ providedIn: 'root' })
export class SelfRegisterService {
  private readonly cfg = inject(NEXUS_CONFIG);

  async register(input: NexusRemoteConfig): Promise<void> {
    if (input.selfRegister === false) return;

    const resolved = this.resolve(input);
    const url = `${this.cfg.registryUrl.replace(/\/$/, '')}/remotes`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.cfg.nexusToken) headers['X-Nexus-Token'] = this.cfg.nexusToken;

    try {
      const probe = await fetch(`${url}/${encodeURIComponent(resolved.name)}`, {
        method: 'GET',
        headers,
        cache: 'no-store',
      });
      if (probe.ok) {
        const res = await fetch(`${url}/${encodeURIComponent(resolved.name)}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({
            url: resolved.url,
            routePath: resolved.routePath,
            exposedModule: resolved.exposedModule,
            enabled: true,
          }),
        });
        if (!res.ok) {
          console.warn(`[nexus-runtime] Self-update failed: ${res.status} ${res.statusText}`);
          return;
        }
        console.log(`[nexus-runtime] Self-updated registration for "${resolved.name}"`);
        return;
      }

      const create = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(resolved),
      });
      if (!create.ok) {
        console.warn(`[nexus-runtime] Self-register failed: ${create.status} ${create.statusText}`);
        return;
      }
      console.log(`[nexus-runtime] Self-registered "${resolved.name}" at ${resolved.url}`);
    } catch (err) {
      console.warn('[nexus-runtime] Self-registration unavailable:', err instanceof Error ? err.message : err);
    }
  }

  private resolve(input: NexusRemoteConfig): ResolvedRegistration {
    const meta = readRemoteMetadata(input.entry) ?? {};
    const name = input.name ?? meta.name ?? this.inferNameFromClass(input.entry);
    if (!name) {
      throw new Error('[nexus-runtime] Cannot determine remote name — supply `name` or annotate with @NexusRemote.');
    }
    const routePath = input.routePath ?? meta.route ?? deriveRouteFromName(name);
    const exposedModule = input.exposedModule ?? (meta.exposeAs ? `./${meta.exposeAs}` : './RemoteEntry');
    const url = input.url ?? this.cfg.publicUrl ?? this.deriveUrl();
    return { name, url, routePath, exposedModule, enabled: true };
  }

  private inferNameFromClass(entry: object): string | undefined {
    const ctor = (entry as { constructor?: { name?: string } }).constructor;
    const raw = ctor?.name ?? (entry as { name?: string }).name;
    if (!raw) return undefined;
    const stripped = raw.replace(/EntryComponent$/, '').replace(/Component$/, '').replace(/Entry$/, '');
    if (!stripped) return undefined;
    return stripped.charAt(0).toLowerCase() + stripped.slice(1);
  }

  private deriveUrl(): string {
    if (typeof window === 'undefined') {
      throw new Error('[nexus-runtime] Cannot derive remote URL outside browser — supply `url` or set publicUrl in runtime config.');
    }
    const origin = window.location.origin;
    const pathname = window.location.pathname.replace(/\/[^/]*$/, '/').replace(/\/$/, '');
    return `${origin}${pathname}/remoteEntry.json`;
  }
}
