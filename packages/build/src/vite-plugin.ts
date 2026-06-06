import type { Plugin } from 'vite';
import { promises as fs } from 'node:fs';
import path from 'node:path';

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
      for (const [key, exposePath] of Object.entries(options.exposes)) {
        const absExposePath = path.resolve(root, exposePath.replace(/^\.\//, ''));
        const chunk = Object.values(bundle).find(
          (c) =>
            c.type === 'chunk' &&
            c.isEntry &&
            c.facadeModuleId != null &&
            path.resolve(c.facadeModuleId.split('?')[0].replace(/\\/g, '/')) === absExposePath.replace(/\\/g, '/'),
        );
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
