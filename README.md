# nexus-packages

Turborepo monorepo with the core packages for the **Bimo-Nexus** micro frontend platform. Packages are shared across all Bimo-Nexus repos (registry, host, portal, remotes) so each service does not have to reimplement types, client logic, UI components or test utilities itself.

## Packages

| Package | Description |
|---|---|
| **`@bimo-dk/nexus-core`** | TypeScript types + constants. Single source of truth. No runtime deps. |
| **`@bimo-dk/nexus-client`** | RegistryClient + RegistryWebSocket — HTTP/WS client for the registry API. |
| **`@bimo-dk/nexus-ui`** | Angular 19 component library (HealthBadge, OfflineBanner, LoadingSpinner, RemoteStatusCard). |
| **`@bimo-dk/nexus-testing`** | Mock factories + in-memory MockRegistryServer + Angular test helpers. |
| **`@bimo-dk/nexus-cli`** | `bnx` command-line tool for generate, publish, status, health, dev. |

## Dependencies between packages

```
core ◄────────────────┐
  ▲                   │
  ├─── client ◄───────┤
  ├─── ui ◄───────────┤
  └─── testing ◄──────┤
                client─┴── cli
```

`core` is the root. `client` depends on core. `ui` depends on core. `testing` depends on core + client. `cli` depends on core + client.

## Quick start

```bash
# 1. Clone + install
git clone https://github.com/Bimo-dk/nexus-packages.git
cd nexus-packages
npm install

# 2. Build everything
npm run build

# 3. Test
npm test
```

## Release workflow (Changesets)

```bash
# 1. Make changes in one or more packages
# 2. Add a changeset
npm run changeset
#    Select packages, bump-type (patch/minor/major), write a description.

# 3. Commit + push
git add . && git commit -m "feat(core): add NEW_FEATURE" && git push

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

# In your consuming repo (e.g. nexus-example/host-template)
npm link @bimo-dk/nexus-core

# When you're done:
npm unlink @bimo-dk/nexus-core
```

## Environment variables

| Variable | Where | Description |
|---|---|---|
| `NPM_TOKEN` | GitHub Actions secret | npm registry token for `changeset publish` |
| `GITHUB_TOKEN` | Auto (GitHub Actions) | Creates releases + posts PR comments |
| `NEXUS_TOKEN` | Local `.env` / CI secret | Used by `bnx` CLI for registry calls |
| `REGISTRY_URL` | Local `.env` / CI secret | Where `bnx` calls the registry (default `http://localhost:3000`) |
| `REMOTE_URL` | Set per publish | URL where the remote's remoteEntry.json is hosted |

## CI/CD

Three GitHub Actions workflows:

| Workflow | Trigger | What |
|---|---|---|
| `ci.yml` | Pull request -> `main` | `turbo build && turbo test && turbo lint`, posts PR status |
| `publish.yml` | Push to `main` | Changesets version bump + `changeset publish` to npm + GitHub release |
| `release.yml` | Manual (workflow_dispatch) | Hotfix release of a single package by specifying name + version |

The `verify/` folder runs after publish to smoke-test that the published tarballs actually work.

## Verification in nexus-example

After publish, these repos can point at the packages:

| Repo | Packages |
|---|---|
| `nexus-example/nexus-registry` | `@bimo-dk/nexus-core` |
| `nexus-example/host-template` | `@bimo-dk/nexus-core`, `@bimo-dk/nexus-client`, `@bimo-dk/nexus-ui` |
| `nexus-example/nexus-portal` | `@bimo-dk/nexus-core`, `@bimo-dk/nexus-client`, `@bimo-dk/nexus-ui` |
| `nexus-remote-templat` | `@bimo-dk/nexus-core`, `@bimo-dk/nexus-ui` |
