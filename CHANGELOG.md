# @bimo-dk/* packages

This monorepo publishes ten npm packages. Per-package change notes follow.

## 1.0.0

First stable release for every `@bimo-dk/*` package. The boundary between
runtime, build, and adapter layers is now stable and follows semver from
here on.

### `@bimo-dk/nexus-build` 1.0.0

- `defineNexusComponent(meta, comp)` HOF marks Vue and React components
  with catalog metadata so the function-component frameworks have parity
  with Angular's `@NexusComponent` decorator.
- `nexusViteAuto({ name })` Vite plugin scans `src/` for
  `defineNexusComponent` call sites and auto-generates the federation
  `exposes`, the Rollup `input` map, and the `catalog.json` manifest.
  Net effect: a remote's `vite.config.ts` becomes two lines and never
  changes when you add a component.
- `scanForDefineNexusComponent()` exported from `./scanner` for tools
  that need the discovered list directly (test harnesses, codemods).
- `nexusVite()` (the explicit-config variant) keeps working unchanged
  for projects that prefer hand-written `exposes` blocks.
- Fix (B-21): `remoteEntry.json` emits exposes as an array of
  `{ key, outFileName }` objects to match the native-federation shape
  the runtime adapter expects.
- Fix (B-26): build sets `preserveEntrySignatures: 'strict'` so component
  modules are not tree-shaken away.
- Fix (B-28): generated catalog.json includes full metadata (title,
  description, category, tags) on every entry, matched on Windows paths
  via case-insensitive forward-slash normalisation.

### `@bimo-dk/nexus-core` 1.0.0

- Stable schema and validation surface for `RemoteConfig`, `HostConfig`,
  `GateConfig`, and the registry payload types every other package
  shares.
- `isValidRemoteName`, `isValidRoutePath`, `isValidHostName`,
  `isValidGateName` validators used by the CLI and portal.
- No runtime dependencies — safe in any bundler.

### `@bimo-dk/nexus-client` 1.0.0

- `RegistryClient`: REST client for the registry (`getRemotes`,
  `addRemote`, `updateRemote`, `getHosts`, `getGates`, plus the config
  endpoints). All methods take a single base URL and an optional token.
- `RegistryWebSocket`: typed WebSocket subscription with auto-reconnect,
  exposing `welcome`, `remotes_changed`, `host_changed`, `system_health`,
  and `log` message types.
- Fix (B-23): apiUrl always normalises to `<base>/api` so callers can
  pass either form without producing `/api/api/` double prefixes when
  used from a browser.

### `@bimo-dk/nexus-runtime-core` 1.0.0

- Framework-agnostic host plumbing: federation manifest fetch, the
  shared share-scope initialisation, the `loadRemoteModule()` cache,
  and the BYOF `mount(el)` detection logic that all three adapter
  packages share.

### `@bimo-dk/nexus-runtime` 1.0.0 (Angular 19 adapter)

- `provideNexusHost()` to wire a standalone Angular host.
- `DynamicNexusService.addRoute()` registers remotes against
  `Router.config` at runtime, sorting `**` last and de-duplicating by
  path.
- `NexusByofWrapperComponent` lazy-loaded wrapper that hosts a remote
  exposing `mount(el)` from any framework (Vue, React, vanilla)
  without Angular bringing in its Zone runtime.
- `CatalogService.refresh()` aggregates `catalog.json` from every
  registered remote.

### `@bimo-dk/nexus-runtime-vue` 1.0.0 (Vue 3 adapter)

- `registerRemoteRoutes(router, remotes)` adds Vue Router routes that
  load federated remotes via `loadRemoteModule`. Renders the BYOF
  `mount(el)` for non-Vue remotes, or the default Vue component for
  legacy remotes.
- `initFederation` wrapper that processes Angular-style sub-path
  shared imports (rxjs/operators, @angular/core/primitives/*) into the
  global import map so cross-framework loading works without zone.js
  in the host.

### `@bimo-dk/nexus-runtime-react` 1.0.0 (React 18 adapter)

- `useNexusRemotes()` hook that mirrors the Vue runtime's
  `registerRemoteRoutes`: BrowserRouter routes, BYOF mount, legacy
  default-component fallback.
- `initFederation` with the same import-map handling as the Vue
  adapter.

### `@bimo-dk/nexus-ui` 1.0.0

- The shared Angular components that drive the portal pages (table,
  detail card, status pill, JSON viewer). Tree-shakeable.

### `@bimo-dk/nexus-testing` 1.0.0

- `setupNexusTestStack()` for integration tests that need a fake
  registry, gateway, and host. Built on `@bimo-dk/nexus-client`.

### `@bimo-dk/nexus-bus` 1.0.0

- `NexusBus` cross-remote event bus. Hosts and remotes import the same
  package and share the bus via Angular's `providedIn: 'root'`.

### License

Relicensed from MIT to GNU Affero General Public License v3.0 or any
later version (AGPL-3.0-or-later). A commercial license is available
for organisations that cannot adopt AGPL — contact svp@bimo.dk.
