import { InjectionToken, signal, type Signal } from '@angular/core';

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

const g = globalThis as Record<string, unknown>;
const USER_SIGNAL_KEY = '__nexus_user_signal__';
const NULL_USER: Signal<UserContext | null> = signal(null).asReadonly();

/**
 * Register the host's user signal so federated remotes can read it via
 * getUserSignal(). Call this once in the host shell before federation loads.
 * Uses globalThis so all bundles (host + remotes) share the same signal
 * regardless of module identity.
 */
export function setUserSignal(s: Signal<UserContext | null>): void {
  g[USER_SIGNAL_KEY] = s;
}

/**
 * Read the user signal registered by the host via setUserSignal().
 * Returns a null signal if no host has registered one yet.
 * Safe to call from any federated remote.
 */
export function getUserSignal(): Signal<UserContext | null> {
  return (g[USER_SIGNAL_KEY] as Signal<UserContext | null> | undefined) ?? NULL_USER;
}

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
