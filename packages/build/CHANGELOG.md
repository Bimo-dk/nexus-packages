# @bimo-dk/nexus-build

## 0.2.1

### Patch Changes

- b7e165b: Ensure NexusComponent decorator is included in the published dist.

  The 0.2.0 publish may have bundled an incomplete dist that dropped the
  NexusComponent export. This release forces a clean rebuild so consumers can
  use `@NexusComponent({ title, ... })` alongside `@NexusRemote()`.

- Updated dependencies [b3798da]
  - @bimo-dk/nexus-core@0.1.1

## 0.2.0

### Minor Changes

- 917b1ff: Initial release of `@bimo-dk/nexus-build`. Provides the `@NexusRemote()` class decorator and a `nexus-build` CLI that scans `src/**/*.ts` via the TypeScript Compiler API and auto-generates `federation.config.json`. Use as a `prebuild` npm-script — eliminates manual federation config in remotes.
- d0e0462: Add a cross-domain Component Catalog system.

  **nexus-build:**

  - New `@NexusComponent({ title, description, category, tags, icon, inputs, experimental })` decorator carries catalog metadata
  - Scanner now reads both `@NexusRemote` and `@NexusComponent` from the same class
  - `nexus-build` CLI also writes `public/catalog.json` per remote (skip with `--no-catalog`)

  **nexus-runtime:**

  - New `CatalogService` aggregates `/catalog.json` from every registered remote into one searchable signal
  - Exposes `entries()`, `categories()`, `tags()` computed signals + `filter({ query, category, tag, remote })` helper
  - Backs the portal's `/catalog` Component Catalog page (consumer feature)

### Patch Changes

- be4f717: Fix browser bundlers (esbuild via Native Federation) failing to resolve `fs`/`path`/`typescript` when importing `NexusRemote`. The main entry now contains ONLY the runtime decorator + types — no transitive Node imports. Build-time helpers (`scanForRemotes`, `writeFederationConfig`, naming utilities) remain available via `@bimo-dk/nexus-build/scanner`.
- fe5a7a7: Fix `@NexusRemote()` decorator returning the class, which made Angular's ngc treat the class as replaced and drop the ivy metadata added by `@Component`. The result was "JIT compiler unavailable" at runtime when the federated component was rendered via NgComponentOutlet. The decorator is now mutation-only and returns void.
