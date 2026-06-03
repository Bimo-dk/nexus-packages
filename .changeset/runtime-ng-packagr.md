---
'@bimo-dk/nexus-runtime': minor
---

Convert build from tsup to ng-packagr so the package emits Angular Ivy partial-compilation metadata. Fixes "JIT compiler unavailable" errors in consumers' AOT builds that previously had no way to generate factories for our `@Injectable` services.

Adds 3 component-loading helpers:

- `<nexus-component remote="X" expose="Y" />` — drop-in tag with built-in fetch/cache/error handling
- `nexusRoute({ path, remote, expose })` / `nexusRoutes([...])` — build Angular `Route` objects that lazy-load federated components for `app.routes.ts`
- `ComponentLoaderService.loadComponent(remote, expose)` — programmatic API for advanced wiring

Together these replace ~200 lines of hand-written federation glue per host project.
