# nexus-packages

Turborepo monorepo med kerne-pakkerne til **Bimo-Nexus** micro frontend-platformen. Pakkerne deles på tværs af alle Bimo-Nexus repos (registry, host, portal, remotes) så hver service ikke selv genimplementerer typer, klient-logik, UI-komponenter eller test-utilities.

## Pakker

| Pakke | Beskrivelse |
|---|---|
| **`@bimo-dk/nexus-core`** | TypeScript typer + konstanter. Single source of truth. Ingen runtime deps. |
| **`@bimo-dk/nexus-client`** | RegistryClient + RegistryWebSocket — HTTP/WS klient til registry API. |
| **`@bimo-dk/nexus-ui`** | Angular 19 komponent-bibliotek (HealthBadge, OfflineBanner, LoadingSpinner, RemoteStatusCard). |
| **`@bimo-dk/nexus-testing`** | Mock-fabrikker + in-memory MockRegistryServer + Angular test helpers. |
| **`@bimo-dk/nexus-cli`** | `bnx` kommandolinje-værktøj til generate, publish, status, health, dev. |

## Afhængigheder mellem pakker

```
core ◄────────────────┐
  ▲                   │
  ├─── client ◄───────┤
  ├─── ui ◄───────────┤
  └─── testing ◄──────┤
                client─┴── cli
```

`core` er rod. `client` afhænger af core. `ui` afhænger af core. `testing` afhænger af core + client. `cli` afhænger af core + client.

## Quick start

```bash
# 1. Klon + installer
git clone https://github.com/Bimo-dk/nexus-packages.git
cd nexus-packages
npm install

# 2. Byg alt
npm run build

# 3. Test
npm test
```

## Release workflow (Changesets)

```bash
# 1. Lav ændringer i en eller flere pakker
# 2. Tilføj en changeset
npm run changeset
#    Vælg pakker, bump-type (patch/minor/major), skriv beskrivelse.

# 3. Commit + push
git add . && git commit -m "feat(core): tilføj NEW_FEATURE" && git push

# 4. Når PR'en mergeres til main starter publish.yml automatisk:
#    - npm run version-packages (bumper versioner + opdaterer CHANGELOGs)
#    - turbo build + turbo test
#    - changeset publish (publisher kun pakker med version bump)
#    - GitHub release oprettes automatisk
```

## Lokal udvikling med npm link

Hvis du arbejder på en pakke parallelt med et andet repo (fx `nexus-example`), brug `npm link` for at se ændringer live uden at publishe:

```bash
# I nexus-packages/packages/core (eller anden pakke)
cd packages/core && npm link

# I dit forbrugende repo (fx nexus-example/host-template)
npm link @bimo-dk/nexus-core

# Når du er færdig:
npm unlink @bimo-dk/nexus-core
```

## Environment variables

| Variabel | Hvor | Beskrivelse |
|---|---|---|
| `NPM_TOKEN` | GitHub Actions secret | npm registry token til `changeset publish` |
| `GITHUB_TOKEN` | Auto (GitHub Actions) | Opretter releases + poster PR comments |
| `BIMO_TOKEN` | Lokal `.env` / CI secret | Bruges af `bnx` CLI til registry-kald |
| `REGISTRY_URL` | Lokal `.env` / CI secret | Hvor `bnx` kalder registry (default `http://localhost:3000`) |
| `REMOTE_URL` | Sættes pr. publish | URL hvor remotes remoteEntry.json hostes |

## CI/CD

Tre GitHub Actions workflows:

| Workflow | Trigger | Hvad |
|---|---|---|
| `ci.yml` | Pull request → `main` | `turbo build && turbo test && turbo lint`, poster PR-status |
| `publish.yml` | Push til `main` | Changesets versions-bump + `changeset publish` til npm + GitHub release |
| `release.yml` | Manuelt (workflow_dispatch) | Hotfix-release af enkelt pakke ved at angive navn + version |

`verify/` mappen kører efter publish for at smoke-teste at de publicerede tarballs faktisk virker.

## Verifikation i nexus-example

Efter publish kan disse repos peg på pakkerne:

| Repo | Pakker |
|---|---|
| `nexus-example/nexus-registry` | `@bimo-dk/nexus-core` |
| `nexus-example/host-template` | `@bimo-dk/nexus-core`, `@bimo-dk/nexus-client`, `@bimo-dk/nexus-ui` |
| `nexus-example/nexus-portal` | `@bimo-dk/nexus-core`, `@bimo-dk/nexus-client`, `@bimo-dk/nexus-ui` |
| `nexus-remote-templat` | `@bimo-dk/nexus-core`, `@bimo-dk/nexus-ui` |
