import { inject, runInInjectionContext, type EnvironmentInjector, type Type } from '@angular/core';
import type { Route } from '@angular/router';
import { ComponentLoaderService } from './component-loader.service';

export interface NexusRouteSpec {
  /** URL path the route resolves to (no leading slash) */
  path: string;
  /** Remote name as registered in the registry */
  remote: string;
  /** Exposed module on the remote (without leading './'). */
  expose: string;
  /** Optional route data — forwarded as Angular Route.data. */
  data?: Record<string, unknown>;
}

/**
 * Build an Angular `Route` that lazy-loads a federated component.
 *
 * @example
 *   // in app.routes.ts
 *   import { nexusRoute } from '@bimo-dk/nexus-runtime';
 *
 *   export const routes: Routes = [
 *     nexusRoute({ path: 'checkout', remote: 'checkout', expose: 'CartPage' }),
 *     nexusRoute({ path: 'orders/:id', remote: 'orders', expose: 'OrderDetail' }),
 *   ];
 *
 * The component is fetched once on first navigation and cached for subsequent visits.
 */
export function nexusRoute(spec: NexusRouteSpec): Route {
  return {
    path: spec.path,
    loadComponent: () => {
      const loader = inject(ComponentLoaderService);
      return loader.loadComponent(spec.remote, spec.expose) as Promise<Type<unknown>>;
    },
    data: spec.data,
  };
}

/**
 * Bulk-load a set of nexusRoute() specs. Useful when you want to read the
 * specs from a config file or the catalog at runtime.
 */
export function nexusRoutes(specs: NexusRouteSpec[]): Route[] {
  return specs.map(nexusRoute);
}

/**
 * Internal helper for callers that want to resolve a loader inside their own
 * loadComponent — e.g. when wrapping with additional logic.
 */
export async function loadFromRemote(
  injector: EnvironmentInjector,
  remote: string,
  expose: string,
): Promise<Type<unknown>> {
  return runInInjectionContext(injector, () => {
    const loader = inject(ComponentLoaderService);
    return loader.loadComponent(remote, expose);
  });
}
