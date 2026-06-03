import { inject } from '@angular/core';
import type { HttpInterceptorFn } from '@angular/common/http';
import { NEXUS_CONFIG } from '../tokens.js';

/**
 * Adds X-Nexus-Token to any request that targets the registry URL.
 * Reads token from NEXUS_CONFIG so it works with runtime-injected config.
 */
export const nexusAuthInterceptor: HttpInterceptorFn = (req, next) => {
  const cfg = inject(NEXUS_CONFIG);
  if (!cfg.nexusToken) return next(req);

  const targetsRegistry = req.url.startsWith(cfg.registryUrl) || req.url.startsWith('/api');
  if (!targetsRegistry) return next(req);

  const authed = req.clone({ setHeaders: { 'X-Nexus-Token': cfg.nexusToken } });
  return next(authed);
};
