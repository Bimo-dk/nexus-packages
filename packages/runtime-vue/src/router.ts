import { defineComponent, h } from 'vue';
import type { RouteRecordRaw } from 'vue-router';
import { NexusLoader } from '@bimo-dk/nexus-runtime-core';

const loader = new NexusLoader();

export interface NexusRouteOptions {
  remote: string;
  expose: string;
  path: string;
  meta?: Record<string, unknown>;
}

/**
 * Returns a Vue Router RouteRecordRaw that lazy-loads a federated component.
 *
 * Example:
 *   router.addRoute(nexusRoute({ remote: 'checkout', expose: './CheckoutPage', path: '/checkout' }))
 */
export function nexusRoute(options: NexusRouteOptions): RouteRecordRaw {
  return {
    path: options.path,
    meta: options.meta,
    component: defineComponent({
      name: `NexusRoute_${options.remote}_${options.expose}`,
      async setup() {
        const mod = await loader.loadRemoteModule(options.remote, options.expose);
        const m = mod as Record<string, unknown>;
        const Comp = (m['default'] ?? m[Object.keys(m)[0]]) as ReturnType<typeof defineComponent>;
        return () => h(Comp);
      },
    }),
  } as RouteRecordRaw;
}
