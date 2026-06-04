---
'@bimo-dk/nexus-runtime': minor
---

Add auth primitives so federated components can know who the user is and call protected APIs:

- **`USER_CONTEXT`** — `InjectionToken<Signal<UserContext | null>>`. Federated components do `const u = inject(USER_CONTEXT)` and read `u()` for `{ id, name, email?, roles, claims? }`.
- **`NEXUS_AUTH`** + `NexusAuthService` interface — abstract contract over OIDC/Auth0/Keycloak/etc. so federated components never bind to a specific IdP. Methods: `user$`, `currentUser()`, `getAccessToken()`, `login()`, `logout()`.
- **`bearerTokenInterceptor`** — HTTP interceptor that calls `NEXUS_AUTH.getAccessToken()` and attaches `Authorization: Bearer <token>` automatically (with sane skip rules + optional injection so anonymous apps keep working).
- **`requireRole(['admin', ...])`** + **`requireAuth()`** — `CanActivateFn` route guards usable on regular routes AND on `nexusRoute()`-built routes.
- **`userHasAnyRole` / `userHasAllRoles`** — pure-function helpers for inline checks in templates.
