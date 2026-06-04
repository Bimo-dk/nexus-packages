import { InjectionToken } from '@angular/core';
import type { Observable } from 'rxjs';
import type { UserContext } from './user-context';

/**
 * Abstract auth contract — the host wires up a concrete implementation
 * (OIDC, Auth0, Keycloak, custom) and provides it via NEXUS_AUTH.
 *
 * Federated components NEVER bind to a specific identity provider; they ask
 * the runtime for the current user / token through this interface.
 */
export interface NexusAuthService {
  /** Reactive stream of the current user (null when anonymous). */
  readonly user$: Observable<UserContext | null>;
  /** Snapshot of the current user (synchronous). */
  currentUser(): UserContext | null;
  /** Return a Bearer access token to attach to outgoing API calls. */
  getAccessToken(): Promise<string | null>;
  /** Trigger the IdP login flow. */
  login(): Promise<void>;
  /** Sign the user out and revoke session. */
  logout(): Promise<void>;
}

export const NEXUS_AUTH = new InjectionToken<NexusAuthService>('NEXUS_AUTH');
