import { Injectable, inject } from '@angular/core';
import { NEXUS_CONFIG } from './tokens';
import { readRemoteMetadata } from './decorator-meta';
import { deriveRouteFromName } from './route-utils';
import type { NexusRemoteConfig } from './types';

interface ResolvedRegistration {
  name: string;
  url: string;
  routePath: string;
  exposedModule: string;
  enabled: true;
  upstreamUrl?: string;
}

const MAX_ATTEMPTS = 5;
const BASE_DELAY_MS = 1000;

@Injectable({ providedIn: 'root' })
export class SelfRegisterService {
  private readonly cfg = inject(NEXUS_CONFIG);

  async register(input: NexusRemoteConfig): Promise<void> {
    if (input.selfRegister === false) return;

    const resolved = this.resolve(input);
    const url = `${this.cfg.registryUrl.replace(/\/$/, '')}/remotes`;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.cfg.nexusToken) headers['X-Nexus-Token'] = this.cfg.nexusToken;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        await this.attemptRegister(resolved, url, headers);
        return;
      } catch (err) {
        if (attempt === MAX_ATTEMPTS) {
          console.warn('[nexus-runtime] Self-registration failed after all retries:', err instanceof Error ? err.message : err);
          return;
        }
        const delay = BASE_DELAY_MS * 2 ** (attempt - 1);
        console.warn(`[nexus-runtime] Registry not ready (attempt ${attempt}/${MAX_ATTEMPTS}), retrying in ${delay}ms`);
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }

  private async attemptRegister(resolved: ResolvedRegistration, url: string, headers: Record<string, string>): Promise<void> {
    const probe = await fetch(`${url}/${encodeURIComponent(resolved.name)}`, {
      method: 'GET',
      headers,
      cache: 'no-store',
    });

    if (probe.ok) {
      const updateBody: Record<string, unknown> = {
        url: resolved.url,
        routePath: resolved.routePath,
        exposedModule: resolved.exposedModule,
        enabled: true,
      };
      if (resolved.upstreamUrl) updateBody['upstreamUrl'] = resolved.upstreamUrl;

      const res = await fetch(`${url}/${encodeURIComponent(resolved.name)}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(updateBody),
      });
      if (!res.ok) throw new Error(`PUT ${res.status} ${res.statusText}`);
      console.log(`[nexus-runtime] Self-updated registration for "${resolved.name}"`);
      return;
    }

    const create = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(resolved),
    });
    if (!create.ok) throw new Error(`POST ${create.status} ${create.statusText}`);
    console.log(`[nexus-runtime] Self-registered "${resolved.name}" at ${resolved.url}`);
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
    const upstreamUrl = this.cfg.upstreamUrl;
    return { name, url, routePath, exposedModule, enabled: true, ...(upstreamUrl ? { upstreamUrl } : {}) };
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
