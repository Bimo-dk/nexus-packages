type LoadFn = (remoteName: string, exposedModule: string) => Promise<unknown>;

const cache = new Map<string, Promise<unknown>>();

function cacheKey(remote: string, expose: string): string {
  return `${remote}::${expose}`;
}

async function resolveLoadFn(): Promise<LoadFn> {
  // @angular-architects/native-federation or @softarc/native-federation-runtime
  // Dynamic import avoids bundling the dependency into this framework-agnostic package.
  // The host application is responsible for having native-federation on the page.
  try {
    const mod = await import('@angular-architects/native-federation' as string);
    if (typeof (mod as { loadRemoteModule?: unknown }).loadRemoteModule === 'function') {
      return (mod as { loadRemoteModule: LoadFn }).loadRemoteModule;
    }
  } catch { /* not present */ }

  try {
    const mod = await import('@softarc/native-federation-runtime' as string);
    if (typeof (mod as { loadRemoteModule?: unknown }).loadRemoteModule === 'function') {
      return (mod as { loadRemoteModule: LoadFn }).loadRemoteModule;
    }
  } catch { /* not present */ }

  throw new Error(
    '[nexus-runtime-core] No federation runtime found. ' +
    'Install @angular-architects/native-federation or @softarc/native-federation-runtime.',
  );
}

let loadFnPromise: Promise<LoadFn> | null = null;
function getLoadFn(): Promise<LoadFn> {
  if (!loadFnPromise) loadFnPromise = resolveLoadFn();
  return loadFnPromise;
}

interface RemoteEntryManifest {
  name: string;
  exposes: Record<string, string>;
}

// Indirect import avoids bundler static analysis on the dynamic URL.
// eslint-disable-next-line @typescript-eslint/no-implied-eval
const indirectImport = new Function('u', 'return import(u)') as (u: string) => Promise<unknown>;

async function loadByUrl(remoteEntryUrl: string, expose: string): Promise<unknown> {
  const res = await fetch(remoteEntryUrl);
  if (!res.ok) {
    throw new Error(
      `[nexus-runtime-core] Failed to fetch remoteEntry.json from ${remoteEntryUrl}: ${res.status}`,
    );
  }
  const manifest: RemoteEntryManifest = await res.json() as RemoteEntryManifest;
  const key = expose.startsWith('./') ? expose : `./${expose}`;
  const chunkPath = manifest.exposes[key];
  if (!chunkPath) {
    throw new Error(
      `[nexus-runtime-core] Expose "${expose}" not found in manifest at ${remoteEntryUrl}. ` +
      `Available: ${Object.keys(manifest.exposes).join(', ')}`,
    );
  }
  const base = remoteEntryUrl.slice(0, remoteEntryUrl.lastIndexOf('/') + 1);
  const moduleUrl = new URL(chunkPath, base).href;
  return indirectImport(moduleUrl);
}

export interface PreloadSpec {
  remote: string;
  expose: string;
}

/**
 * Framework-agnostic module loader.
 *
 * When `remote` is a URL (starts with http:// or https://), it is treated as a
 * remoteEntry.json endpoint — the manifest is fetched, the expose is resolved to
 * an absolute module URL, and the module is dynamically imported.
 *
 * Otherwise the native-federation runtime is used (Angular hosts).
 *
 * Results are memoized: calling loadRemoteModule twice with the same
 * remote + expose pair returns the cached Promise without re-fetching.
 */
export class NexusLoader {
  async loadRemoteModule(remote: string, expose: string): Promise<unknown> {
    const key = cacheKey(remote, expose);
    if (cache.has(key)) return cache.get(key)!;

    const p = remote.startsWith('http://') || remote.startsWith('https://')
      ? loadByUrl(remote, expose)
      : getLoadFn().then((load) => load(remote, expose));

    cache.set(key, p);
    try {
      return await p;
    } catch (err) {
      cache.delete(key);
      throw err;
    }
  }

  async preloadAll(specs: PreloadSpec[]): Promise<unknown[]> {
    return Promise.all(specs.map((s) => this.loadRemoteModule(s.remote, s.expose)));
  }

  clearCache(): void {
    cache.clear();
  }
}
