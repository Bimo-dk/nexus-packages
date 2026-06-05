# @bimo-dk/nexus-runtime

## 0.3.0

### Minor Changes

- b7e165b: Fix ng-packagr packages publishing from source root instead of compiled dist.

  Added `publishConfig.directory: "dist"` so Changesets publishes the ng-packagr
  output in `dist/` rather than the TypeScript source root. Without this, consumers
  got no `types`, `exports`, or compiled JS — only raw source files.

  Also re-ships `nexus-runtime` with the user-signal bridge: `setUserSignal` and
  `getUserSignal` let hosts register a shared user signal that federated remotes
  can read across bundle boundaries via `globalThis`.

### Patch Changes

- b3798da: Add upstreamUrl field and retry logic for dynamic remote routing.

  RemoteConfig and AddRemoteRequest gain an optional upstreamUrl field so the
  gateway knows the internal Docker URL to proxy traffic through. NexusRuntimeConfig
  also exposes upstreamUrl so remotes can announce it on self-registration.

  SelfRegisterService now retries with exponential backoff (up to 5 attempts,
  starting at 1 s) so remotes that start before the registry is ready still
  register successfully instead of silently dropping.

- Updated dependencies [b3798da]
  - @bimo-dk/nexus-core@0.1.1

## 0.2.0

### Minor Changes

- fc3c9f1: Add `ComponentLoaderService` for loading arbitrary exposed modules from registered remotes at runtime. Enables advanced patterns like NgComponentOutlet grids, on-demand button-triggered loading, dialog-hosted components — anywhere you need to load a specific module beyond the auto-registered routes.
- 917b1ff: Initial release of `@bimo-dk/nexus-runtime`. Angular providers `provideNexusConfig()`, `provideNexusRemote()` (self-registers a remote with the registry at bootstrap) and `provideNexusHost()` (bundles `DynamicNexusService` + `RegistryService` + `RegistryWebSocketService` + auth/correlation interceptors). Brings remote/host bootstrap to ~5 lines of pure business logic.
- 006ef09: Add auth primitives so federated components can know who the user is and call protected APIs:

  - **`USER_CONTEXT`** — `InjectionToken<Signal<UserContext | null>>`. Federated components do `const u = inject(USER_CONTEXT)` and read `u()` for `{ id, name, email?, roles, claims? }`.
  - **`NEXUS_AUTH`** + `NexusAuthService` interface — abstract contract over OIDC/Auth0/Keycloak/etc. so federated components never bind to a specific IdP. Methods: `user$`, `currentUser()`, `getAccessToken()`, `login()`, `logout()`.
  - **`bearerTokenInterceptor`** — HTTP interceptor that calls `NEXUS_AUTH.getAccessToken()` and attaches `Authorization: Bearer <token>` automatically (with sane skip rules + optional injection so anonymous apps keep working).
  - **`requireRole(['admin', ...])`** + **`requireAuth()`** — `CanActivateFn` route guards usable on regular routes AND on `nexusRoute()`-built routes.
  - **`userHasAnyRole` / `userHasAllRoles`** — pure-function helpers for inline checks in templates.

- d0e0462: Add a cross-domain Component Catalog system.

  **nexus-build:**

  - New `@NexusComponent({ title, description, category, tags, icon, inputs, experimental })` decorator carries catalog metadata
  - Scanner now reads both `@NexusRemote` and `@NexusComponent` from the same class
  - `nexus-build` CLI also writes `public/catalog.json` per remote (skip with `--no-catalog`)

  **nexus-runtime:**

  - New `CatalogService` aggregates `/catalog.json` from every registered remote into one searchable signal
  - Exposes `entries()`, `categories()`, `tags()` computed signals + `filter({ query, category, tag, remote })` helper
  - Backs the portal's `/catalog` Component Catalog page (consumer feature)

- d0e0462: Convert build from tsup to ng-packagr so the package emits Angular Ivy partial-compilation metadata. Fixes "JIT compiler unavailable" errors in consumers' AOT builds that previously had no way to generate factories for our `@Injectable` services.

  Adds 3 component-loading helpers:

  - `<nexus-component remote="X" expose="Y" />` — drop-in tag with built-in fetch/cache/error handling
  - `nexusRoute({ path, remote, expose })` / `nexusRoutes([...])` — build Angular `Route` objects that lazy-load federated components for `app.routes.ts`
  - `ComponentLoaderService.loadComponent(remote, expose)` — programmatic API for advanced wiring

  Together these replace ~200 lines of hand-written federation glue per host project.

- 41d6e1e: Add setUserSignal and getUserSignal to user-context

  Hosts call setUserSignal() once at startup; any federated remote can call
  getUserSignal() and receive the same signal regardless of module identity.
  Uses globalThis as a shared bridge so token injection works across federation
  bundle boundaries.
