import { describe, it, expect } from 'vitest';
import { defineNexusConfig } from './nexus-config.js';
import { nexusVite } from './vite-plugin.js';

describe('defineNexusConfig', () => {
  it('returns its argument unchanged', () => {
    const config = {
      name: 'checkout',
      exposes: { CartPage: './src/CartPage.vue' },
      catalog: [{ expose: 'CartPage', title: 'Cart Page' }],
    };
    expect(defineNexusConfig(config)).toBe(config);
  });
});

describe('nexusVite', () => {
  it('returns a Vite plugin object with the correct name', () => {
    const plugin = nexusVite({ name: 'checkout', exposes: { CartPage: './src/CartPage.vue' } });
    expect(plugin.name).toBe('nexus-vite');
  });

  it('defines remote name and exposes as build constants', () => {
    const plugin = nexusVite({ name: 'checkout', exposes: { CartPage: './src/CartPage.vue' } });
    const result = (plugin.config as Function)({});
    expect(result.define.__NEXUS_REMOTE_NAME__).toBe('"checkout"');
    expect(result.define.__NEXUS_EXPOSES__).toContain('CartPage');
  });

  it('does not generate catalog.json when catalog is empty', async () => {
    const plugin = nexusVite({ name: 'checkout', exposes: {} });
    // closeBundle should be a no-op — does not throw
    await expect((plugin.closeBundle as Function)()).resolves.toBeUndefined();
  });
});
