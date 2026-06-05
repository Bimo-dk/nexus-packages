import type { NexusViteOptions } from './vite-plugin.js';

export interface NexusConfigFile extends NexusViteOptions {}

/**
 * Typed identity helper for nexus.config.ts files used by Vue/React remotes.
 * At runtime this is a no-op — it exists solely to provide type inference.
 *
 * Usage:
 *   export default defineNexusConfig({
 *     name: 'checkout',
 *     exposes: { CartPage: './src/CartPage.vue' },
 *     catalog: [{ expose: 'CartPage', title: 'Cart Page' }],
 *   });
 */
export function defineNexusConfig(config: NexusConfigFile): NexusConfigFile {
  return config;
}
