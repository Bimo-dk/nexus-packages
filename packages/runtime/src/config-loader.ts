import type { NexusRuntimeConfig } from './types.js';

const DEFAULT_PATH = '/assets/config.json';

/**
 * Fetch runtime config from /assets/config.json (template-substituted by container entrypoint).
 * Falls back to the supplied defaults on any error.
 */
export async function loadRuntimeConfig(
  defaults: NexusRuntimeConfig,
  assetPath: string = DEFAULT_PATH,
): Promise<NexusRuntimeConfig> {
  try {
    const res = await fetch(assetPath, { cache: 'no-store' });
    if (!res.ok) return defaults;
    const json = (await res.json()) as Partial<NexusRuntimeConfig>;
    return { ...defaults, ...json };
  } catch {
    return defaults;
  }
}
