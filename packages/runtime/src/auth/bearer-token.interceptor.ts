import { inject } from '@angular/core';
import type { HttpInterceptorFn } from '@angular/common/http';
import { from, switchMap } from 'rxjs';
import { NEXUS_AUTH, type NexusAuthService } from './auth.service';

/**
 * Attaches `Authorization: Bearer <token>` to outgoing HTTP requests by
 * asking the NEXUS_AUTH service for a current access token.
 *
 * Skipped for:
 *   - requests that already carry an Authorization header
 *   - requests to relative paths starting with `/assets/` (static assets)
 *   - requests where the auth service returns null (anonymous mode)
 *
 * Wire it up in your app config:
 *
 *   provideHttpClient(withInterceptors([bearerTokenInterceptor]))
 */
export const bearerTokenInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.headers.has('Authorization')) return next(req);
  if (req.url.startsWith('/assets/')) return next(req);

  // Tolerate missing NEXUS_AUTH (anonymous apps that haven't wired auth yet).
  const auth: NexusAuthService | null = inject(NEXUS_AUTH, { optional: true });
  if (!auth) return next(req);

  return from(auth.getAccessToken()).pipe(
    switchMap((token) => {
      if (!token) return next(req);
      return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
    }),
  );
};
