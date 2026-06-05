import type { App } from 'vue';
import { SelfRegistrationService, type RegisterOptions } from '@bimo-dk/nexus-runtime-core';

/**
 * Vue plugin for remote bootstrap files.
 *
 * Usage in remote's main.ts:
 *   app.use(VueNexusRemotePlugin, { name: 'checkout', url: '...', ... })
 */
export const VueNexusRemotePlugin = {
  install(_app: App, options: RegisterOptions): void {
    const svc = new SelfRegistrationService();
    svc.register(options).catch((err) => {
      console.error('[nexus-vue] Self-registration failed:', err);
    });
  },
};
