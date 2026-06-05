# nexus-packages

Turborepo monorepo with the SDK packages for the **Bimo-Nexus** micro frontend platform. Packages are shared across every Nexus repo (registry, gateway, host templates, remote templates, portal) so each service does not have to reimplement types, client logic, runtime loaders, UI components, or test utilities itself.

## Packages

| Package | Description |
|---|---|
| **`@bimo-dk/nexus-core`** | TypeScript types, constants, validators. Zero runtime deps. |
| **`@bimo-dk/nexus-client`** | `RegistryClient` + `RegistryWebSocket` — HTTP/WS client for the registry API. |
| **`@bimo-dk/nexus-runtime-core`** | Framework-agnostic federation loader, self-registration, fallback chain, reconnect. |
| **`@bimo-dk/nexus-runtime`** | Angular 19 adapter — `provideNexusHost`, `provideNexusRemote`, `nexusRoute`, `<nexus-component>`. |
| **`@bimo-dk/nexus-runtime-vue`** | Vue 3 adapter — `createNexusPlugin`, `useNexusHost`, `useNexusRemote`, `<NexusComponent>`. |
| **`@bimo-dk/nexus-runtime-react`** | React 18 adapter — `NexusProvider`, `useNexusComponent`, `<NexusComponent>`, `createNexusRoute`. |
| **`@bimo-dk/nexus-build`** | `@NexusRemote` + `@NexusComponent` decorators (Angular), `nexusVite` plugin (Vue/React), `nexus-build` CLI. |
| **`@bimo-dk/nexus-testing`** | Mock factories + in-memory `MockRegistryServer` + Angular TestBed helpers. |
| **`@bimo-dk/nexus-ui`** | Angular 19 component library (HealthBadge, OfflineBanner, LoadingSpinner, RemoteStatusCard). |

## Dependency graph

```
core
 ├─ client
 │   ├─ runtime-core
 │   │   ├─ runtime         (Angular adapter)
 │   │   ├─ runtime-vue     (Vue adapter)
 │   │   └─ runtime-react   (React adapter)
 │   ├─ testing
 │   └─ ui
 └─ build                   (uses core only)
```

`core` is the root. `client` depends on core. `runtime-core` depends on core + client. Each framework adapter (`runtime`, `runtime-vue`, `runtime-react`) depends on `runtime-core`. `build`, `testing`, `ui` are utility packages that depend on the slice of the graph they need.

## Quick start

```bash
# 1. Clone + install
git clone https://github.com/Bimo-dk/nexus-packages.git
cd nexus-packages
npm install

# 2. Build everything (Turbo handles topological order)
npm run build

# 3. Test
npm test
```

`pnpm` and `yarn` both work — Turbo is package-manager-agnostic.

## What to install (consumer side)

| Building | Install |
|---|---|
| Angular remote | `@bimo-dk/nexus-runtime` + `@bimo-dk/nexus-build` |
| Vue remote | `@bimo-dk/nexus-runtime-vue` + `@bimo-dk/nexus-build` (for `nexusVite`) |
| React remote | `@bimo-dk/nexus-runtime-react` + `@bimo-dk/nexus-build` (for `nexusVite`) |
| Angular host | `@bimo-dk/nexus-runtime` + `@bimo-dk/nexus-client` |
| Vue host | `@bimo-dk/nexus-runtime-vue` + `@bimo-dk/nexus-client` |
| React host | `@bimo-dk/nexus-runtime-react` + `@bimo-dk/nexus-client` |
| Node script for the registry | `@bimo-dk/nexus-client` |
| Tests | `@bimo-dk/nexus-testing` (devDependency only) |

## Release workflow (Changesets)

```bash
# 1. Make changes in one or more packages
# 2. Add a changeset
npm run changeset
#    Select packages, bump-type (patch/minor/major), write a description.

# 3. Commit + push
git add . && git commit -m "feat(runtime-vue): add useNexusComponent hook" && git push

# 4. When the PR is merged to main, publish.yml runs automatically:
#    - npm run version-packages (bumps versions + updates CHANGELOGs)
#    - turbo build + turbo test
#    - changeset publish (only publishes packages with a version bump)
#    - GitHub release is created automatically
```

## Local development with npm link

If you work on a package in parallel with another repo (e.g. `nexus-example`), use `npm link` to see changes live without publishing:

```bash
# In nexus-packages/packages/core (or another package)
cd packages/core && npm link

# In your consuming repo
npm link @bimo-dk/nexus-core

# When you're done
npm unlink @bimo-dk/nexus-core
```

## Environment variables

| Variable | Where | Description |
|---|---|---|
| `NODE_AUTH_TOKEN` | GitHub Actions secret / `.npmrc` | GitHub Packages PAT (`read:packages` for installs, `write:packages` for publishes) |
| `GITHUB_TOKEN` | Auto (GitHub Actions) | Creates releases + posts PR comments |
| `NEXUS_TOKEN` | Local `.env` / CI secret | Used by `bnx` CLI for registry calls |
| `REGISTRY_URL` | Local `.env` / CI secret | Where `bnx` calls the registry (default `http://localhost:8668`) |
| `REMOTE_URL` | Set per publish | URL where the remote's `remoteEntry.json` is hosted |

## CI/CD

Three GitHub Actions workflows:

| Workflow | Trigger | What |
|---|---|---|
| `ci.yml` | Pull request → `main` | `turbo build && turbo test && turbo lint`, posts PR status |
| `publish.yml` | Push to `main` | Changesets version bump + `changeset publish` to GitHub Packages + GitHub release |
| `release.yml` | Manual (`workflow_dispatch`) | Hotfix release of a single package by specifying name + version |

The `verify/` folder runs after publish to smoke-test that the published tarballs actually work in fresh app skeletons (one per framework).

## Verification in nexus-example

After publish, these repos can point at the packages:

| Repo | Packages |
|---|---|
| `nexus-host-template` | `core`, `client`, `runtime`, `runtime-core`, `ui` |
| `nexus-host-template-vue` | `core`, `client`, `runtime-vue`, `runtime-core` |
| `nexus-remote-templat` | `core`, `runtime`, `runtime-core`, `build` |
| `nexus-remote-templat-vue` | `core`, `runtime-vue`, `runtime-core`, `build` |
| `nexus-remote-templat-react` | `core`, `runtime-react`, `runtime-core`, `build` |
| `nexus-portal` | `core`, `client`, `runtime`, `ui` |
