import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { USER_CONTEXT, userHasAnyRole } from './user-context';

/**
 * Route guard factory: only allows navigation if the current user holds at
 * least one of the listed roles. Anonymous users (USER_CONTEXT returning
 * null) are also blocked.
 *
 * Redirects to `redirectTo` (default `/`) when denied.
 *
 * @example
 *   {
 *     path: 'admin',
 *     canActivate: [requireRole(['admin', 'superuser'])],
 *     loadComponent: () => import('./admin.component').then(m => m.AdminComponent),
 *   }
 *
 *   // Combine with nexusRoute:
 *   nexusRoute({ path: 'settings', remote: 'settings', expose: 'Page',
 *                guards: [requireRole(['admin'])] })  // (future API)
 */
export function requireRole(roles: readonly string[], redirectTo: string = '/'): CanActivateFn {
  return () => {
    const user = inject(USER_CONTEXT, { optional: true });
    const router = inject(Router);
    const snapshot = user?.() ?? null;
    if (userHasAnyRole(snapshot, roles)) return true;
    return router.parseUrl(redirectTo);
  };
}

/**
 * Pass-through guard that just requires the user to be authenticated
 * (any non-null UserContext).
 */
export function requireAuth(redirectTo: string = '/'): CanActivateFn {
  return () => {
    const user = inject(USER_CONTEXT, { optional: true });
    const router = inject(Router);
    if (user?.()) return true;
    return router.parseUrl(redirectTo);
  };
}
