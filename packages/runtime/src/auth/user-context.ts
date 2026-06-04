import { InjectionToken, type Signal } from '@angular/core';

/** Subset of user info every federated component can safely depend on. */
export interface UserContext {
  /** Stable user id (sub claim in OIDC, primary key elsewhere). */
  id: string;
  /** Display name. */
  name: string;
  /** Email if known. */
  email?: string;
  /** Roles the user holds (free-form strings, app-defined). */
  roles: readonly string[];
  /** Free-form claims passed through from the identity provider. */
  claims?: Readonly<Record<string, unknown>>;
}

/**
 * Reactive token: hosts provide a `Signal<UserContext | null>` that components
 * can read with `inject(USER_CONTEXT)()`. Returns `null` for anonymous users.
 *
 * @example
 *   // In host bootstrap:
 *   const user = signal<UserContext | null>(null);
 *   auth.user$.subscribe((u) => user.set(u));
 *
 *   bootstrapApplication(AppShell, {
 *     providers: [{ provide: USER_CONTEXT, useValue: user }],
 *   });
 *
 *   // In any federated component:
 *   private readonly user = inject(USER_CONTEXT);
 *   template: `@if (user(); as u) { Hello, {{ u.name }} }`
 */
export const USER_CONTEXT = new InjectionToken<Signal<UserContext | null>>('USER_CONTEXT');

/** True if the user holds at least one of the required roles. */
export function userHasAnyRole(user: UserContext | null, required: readonly string[]): boolean {
  if (!user) return false;
  if (required.length === 0) return true;
  return required.some((r) => user.roles.includes(r));
}

/** True if the user holds all of the required roles. */
export function userHasAllRoles(user: UserContext | null, required: readonly string[]): boolean {
  if (!user) return false;
  return required.every((r) => user.roles.includes(r));
}
