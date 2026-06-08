import type { Plugin } from 'vite';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import {
  scanForDefineNexusComponent,
  type DiscoveredFunctionComponent,
} from './auto-scanner.js';

export interface CatalogEntrySpec {
  expose: string;
  title: string;
  description?: string;
  category?: string;
  tags?: string[];
  inputs?: Record<string, {
    type: 'string' | 'number' | 'boolean' | 'object' | 'array';
    description?: string;
    default?: unknown;
    required?: boolean;
  }>;
}

export interface NexusViteOptions {
  /** Remote name in camelCase — must match the bnx registry name. */
  name: string;
  /** Exposes map: expose-key -> file-path (same format as native federation). */
  exposes: Record<string, string>;
  /** Optional catalog entries for the remote. Generates catalog.json in dist when provided. */
  catalog?: CatalogEntrySpec[];
}

/**
 * Vite plugin for Nexus Vue/React remotes.
 *
 * - Injects __NEXUS_REMOTE_NAME__, __NEXUS_EXPOSES__, __NEXUS_TOKEN__, __NEXUS_REGISTRY_URL__.
 * - Serves /remoteEntry.json in dev mode so the host can load the remote during development.
 * - Generates remoteEntry.json in dist/ at build time for production use.
 * - Generates catalog.json in dist/ when catalog entries are provided.
 */
export function nexusVite(options: NexusViteOptions): Plugin {
  let outDir = 'dist';
  let root = process.cwd();

  return {
    name: 'nexus-vite',
    enforce: 'pre',

    config(config) {
      outDir = config.build?.outDir ?? 'dist';
      root = config.root ?? process.cwd();
      return {
        define: {
          __NEXUS_REMOTE_NAME__: JSON.stringify(options.name),
          __NEXUS_EXPOSES__: JSON.stringify(options.exposes),
          __NEXUS_TOKEN__: JSON.stringify(process.env['NEXUS_TOKEN'] ?? ''),
          __NEXUS_REGISTRY_URL__: JSON.stringify(process.env['REGISTRY_URL'] ?? ''),
        },
      };
    },

    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url !== '/remoteEntry.json') {
          next();
          return;
        }
        const exposes: Record<string, string> = {};
        for (const [key, exposePath] of Object.entries(options.exposes)) {
          exposes[`./${key}`] = `/${exposePath.replace(/^\.\//, '')}`;
        }
        const manifest = { name: options.name, exposes };
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(manifest, null, 2));
      });
    },

    generateBundle(_, bundle) {
      // Emit exposes as an array of { key, outFileName } objects to match
      // the native-federation manifest shape that @bimo-dk/nexus-runtime
      // and @angular-architects/native-federation both expect. The earlier
      // object form ({ './X': './X.js' }) tripped the consumer with
      // `t.exposes is not iterable`. (B-21)
      const exposes: Array<{ key: string; outFileName: string }> = [];
      const norm = (p: string): string => p.replace(/\\/g, '/').toLowerCase();
      for (const [key, exposePath] of Object.entries(options.exposes)) {
        const relPath = exposePath.replace(/^\.\//, '');
        const absExposePath = norm(path.resolve(root, relPath));
        const exposePathSuffix = norm('/' + relPath);
        const chunk = Object.values(bundle).find((c) => {
          if (c.type !== 'chunk' || !c.isEntry || c.facadeModuleId == null) return false;
          const id = norm(c.facadeModuleId.split('?')[0]);
          return id === absExposePath || id.endsWith(exposePathSuffix);
        });
        if (chunk) {
          exposes.push({ key: `./${key}`, outFileName: chunk.fileName });
        }
      }

      if (exposes.length > 0) {
        this.emitFile({
          type: 'asset',
          fileName: 'remoteEntry.json',
          source: JSON.stringify({ name: options.name, exposes, shared: [] }, null, 2),
        });
      }
    },

    async closeBundle() {
      if (!options.catalog || options.catalog.length === 0) return;

      const manifest = {
        remote: options.name,
        generatedAt: new Date().toISOString(),
        entries: options.catalog.map((entry) => ({
          remote: options.name,
          expose: entry.expose,
          title: entry.title,
          description: entry.description,
          category: entry.category,
          tags: entry.tags ?? [],
          inputs: entry.inputs ?? {},
        })),
      };

      const outPath = path.resolve(outDir, 'catalog.json');
      await fs.mkdir(outDir, { recursive: true });
      await fs.writeFile(outPath, JSON.stringify(manifest, null, 2), 'utf8');
    },
  };
}

export interface NexusViteAutoOptions {
  /** Remote name in camelCase — must match the bnx registry name. */
  name: string;
  /** Source directory to scan. Defaults to 'src'. */
  scanDir?: string;
  /** Extra file extensions to scan. Defaults: .ts, .tsx, .vue, .js, .jsx. */
  extensions?: string[];
}

/**
 * Auto-discovering Vite plugin for Nexus Vue / React remotes.
 *
 * Replaces the hand-written `exposes` / `rollupOptions.input` / `catalog`
 * triple in `vite.config.ts`. The plugin scans `src/` for components
 * marked with `defineNexusComponent({ ... }, comp)`, then builds the
 * same payload `nexusVite()` accepts and delegates to it.
 *
 * Net effect: a new component shows up in the portal Component Catalog
 * the next time the remote is rebuilt — no developer ever touches the
 * Vite config to register it. (B-28)
 *
 * @example
 *   // vite.config.ts — the entire file
 *   import { defineConfig } from 'vite';
 *   import vue from '@vitejs/plugin-vue';
 *   import { nexusViteAuto } from '@bimo-dk/nexus-build/vite';
 *
 *   export default defineConfig({
 *     plugins: [vue(), nexusViteAuto({ name: 'shop' })],
 *   });
 *
 *   // src/Cart.ts
 *   import { defineNexusComponent } from '@bimo-dk/nexus-build';
 *   import { defineComponent } from 'vue';
 *
 *   export const Cart = defineNexusComponent(
 *     { title: 'Cart Widget', category: 'commerce', tags: ['cart'] },
 *     defineComponent({ ... }),
 *   );
 */
export function nexusViteAuto(options: NexusViteAutoOptions): Plugin {
  let discovered: DiscoveredFunctionComponent[] = [];
  let catalog: CatalogEntrySpec[] = [];
  let exposes: Record<string, string> = {};
  let outDir = 'dist';
  let root = process.cwd();
  let scanned = false;

  async function scan(): Promise<void> {
    if (scanned) return;
    discovered = await scanForDefineNexusComponent({
      srcDir: options.scanDir ?? 'src',
      extensions: options.extensions,
    });
    exposes = {};
    catalog = [];
    for (const c of discovered) {
      const exposeName = c.exportName === 'default'
        ? path.basename(c.fileRelative, path.extname(c.fileRelative))
        : c.exportName;
      exposes[exposeName] = c.fileRelative;
      const entry: CatalogEntrySpec = {
        expose: `./${exposeName}`,
        title: c.metadata.title,
      };
      if (c.metadata.description) entry.description = c.metadata.description;
      if (c.metadata.category) entry.category = c.metadata.category;
      if (c.metadata.tags) entry.tags = c.metadata.tags;
      catalog.push(entry);
    }
    scanned = true;
  }

  return {
    name: 'nexus-vite-auto',
    enforce: 'pre',

    async config(viteConfig) {
      await scan();
      outDir = viteConfig.build?.outDir ?? 'dist';
      root = viteConfig.root ?? process.cwd();
      const rollupInput: Record<string, string> = {};
      for (const exposeName of Object.keys(exposes)) {
        rollupInput[exposeName] = exposes[exposeName];
      }
      const buildBlock = Object.keys(rollupInput).length > 0
        ? {
            build: {
              rollupOptions: {
                input: rollupInput,
                preserveEntrySignatures: 'strict' as const,
              },
            },
          }
        : {};
      return {
        define: {
          __NEXUS_REMOTE_NAME__: JSON.stringify(options.name),
          __NEXUS_EXPOSES__: JSON.stringify(exposes),
          __NEXUS_TOKEN__: JSON.stringify(process.env['NEXUS_TOKEN'] ?? ''),
          __NEXUS_REGISTRY_URL__: JSON.stringify(process.env['REGISTRY_URL'] ?? ''),
        },
        ...buildBlock,
      };
    },

    async configureServer(server) {
      await scan();
      server.middlewares.use((req, res, next) => {
        if (req.url !== '/remoteEntry.json') { next(); return; }
        const devExposes: Record<string, string> = {};
        for (const [k, v] of Object.entries(exposes)) {
          devExposes[`./${k}`] = `/${v.replace(/^\.\//, '')}`;
        }
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ name: options.name, exposes: devExposes }, null, 2));
      });
    },

    generateBundle(_, bundle) {
      const exposesOut: Array<{ key: string; outFileName: string }> = [];
      const norm = (p: string): string => p.replace(/\\/g, '/').toLowerCase();
      for (const [key, exposePath] of Object.entries(exposes)) {
        const relPath = exposePath.replace(/^\.\//, '');
        const absExposePath = norm(path.resolve(root, relPath));
        const exposePathSuffix = norm('/' + relPath);
        const chunk = Object.values(bundle).find((c) => {
          if (c.type !== 'chunk' || !c.isEntry || c.facadeModuleId == null) return false;
          const id = norm(c.facadeModuleId.split('?')[0]);
          return id === absExposePath || id.endsWith(exposePathSuffix);
        });
        if (chunk) {
          exposesOut.push({ key: `./${key}`, outFileName: chunk.fileName });
        }
      }
      if (exposesOut.length > 0) {
        this.emitFile({
          type: 'asset',
          fileName: 'remoteEntry.json',
          source: JSON.stringify({ name: options.name, exposes: exposesOut, shared: [] }, null, 2),
        });
      }
    },

    async closeBundle() {
      if (catalog.length === 0) return;
      const manifest = {
        remote: options.name,
        generatedAt: new Date().toISOString(),
        entries: catalog.map((entry) => ({
          remote: options.name,
          expose: entry.expose,
          title: entry.title,
          description: entry.description,
          category: entry.category,
          tags: entry.tags ?? [],
          inputs: entry.inputs ?? {},
        })),
      };
      const outPath = path.resolve(outDir, 'catalog.json');
      await fs.mkdir(outDir, { recursive: true });
      await fs.writeFile(outPath, JSON.stringify(manifest, null, 2), 'utf8');
    },
  };
}
