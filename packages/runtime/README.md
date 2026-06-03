# @bimo-dk/nexus-runtime

Angular providers for Bimo-Nexus remotes and hosts. Bundles runtime config, self-registration, HTTP interceptors and dynamic federation into one-call providers — so your `bootstrap.ts` stays focused on business logic.

## Installation

```bash
npm install @bimo-dk/nexus-runtime @bimo-dk/nexus-build
```

Peer dependencies (must be installed in your app):
- `@angular/core`, `@angular/common`, `@angular/router` (^19)
- `@angular-architects/native-federation` (^19) — only required for hosts
- `rxjs` (^7.8)

## Remote (5-line bootstrap)

```typescript
// src/bootstrap.ts
import { bootstrapApplication } from '@angular/platform-browser';
import { provideNexusRemote } from '@bimo-dk/nexus-runtime';
import EntryComponent from './app/remote-entry/entry.component';

bootstrapApplication(EntryComponent, {
  providers: [
    provideNexusRemote({
      entry: EntryComponent,
      configDefaults: {
        registryUrl: 'http://localhost:3000',
        nexusToken: 'dev-token',
      },
    }),
  ],
});
```

```typescript
// src/app/remote-entry/entry.component.ts
import { Component } from '@angular/core';
import { NexusRemote } from '@bimo-dk/nexus-build';

@NexusRemote()                         // name & route auto-inferred
@Component({ template: '<h1>OK</h1>' })
export default class EntryComponent {}
```

At bootstrap:
1. `/assets/config.json` is fetched and merged on top of `configDefaults`
2. The remote POSTs itself to `${registryUrl}/remotes` (or PUTs if already registered)
3. Name/route/exposedModule are read from the `@NexusRemote` decorator metadata
4. URL is derived from `window.location` (or `publicUrl` if set in runtime config)

## Host (1 provider, full dynamic federation)

```typescript
// src/bootstrap.ts
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { provideNexusHost } from '@bimo-dk/nexus-runtime';
import { AppShell } from './app/app-shell.component';

bootstrapApplication(AppShell, {
  providers: [
    provideRouter([]),    // start with empty routes; nexus fills them in
    provideNexusHost({
      configDefaults: {
        registryUrl: '/api',
        nexusToken: 'dev-token',
        staticBackupUrl: '/assets/registry-backup/remotes.json',
      },
    }),
  ],
});
```

At bootstrap the host:
1. Fetches enabled remotes from registry (with cache → static backup fallback chain)
2. Opens a WebSocket to `/ws` for live updates
3. Calls `loadRemoteModule()` for each remote, registers a route
4. Reacts to WebSocket broadcasts to add/remove routes without reload

Read state from `DynamicNexusService` in your shell:

```typescript
import { Component, inject } from '@angular/core';
import { DynamicNexusService } from '@bimo-dk/nexus-runtime';

@Component({ ... })
export class AppShell {
  readonly nexus = inject(DynamicNexusService);
  // nexus.loadedRemotes() — signal<RemoteConfig[]>
  // nexus.failedRemotes() — signal<Map<string, string>>
  // nexus.registryOnline() — computed signal
}
```

## Runtime config (`/assets/config.json`)

Both providers fetch `/assets/config.json` at bootstrap. Typical template (substituted by nginx entrypoint at container start):

```json
{
  "registryUrl": "${REGISTRY_URL}",
  "nexusToken": "${NEXUS_TOKEN}"
}
```

`NexusRuntimeConfig` fields:

| Field | Description |
|---|---|
| `registryUrl` | Base URL of the registry API |
| `nexusToken` | Token for `X-Nexus-Token` header |
| `configAssetPath` | Override `/assets/config.json` path |
| `publicUrl` | Override the URL a remote announces to the registry |
| `staticBackupUrl` | Host-only: path to the backup remotes JSON |

## What's bundled

Both providers register the same baseline:
- `NEXUS_CONFIG` injection token populated from runtime config
- `HttpClient` with `nexusAuthInterceptor` + `correlationIdInterceptor`

Then they add their role-specific pieces:
- **Remote** → `SelfRegisterService` runs once at bootstrap
- **Host** → `RegistryService` + `RegistryWebSocketService` + `DynamicNexusService` are started and route registration begins

## Manual wiring (escape hatch)

If you need more control, all the building blocks are exported:

```typescript
import {
  NEXUS_CONFIG,
  provideNexusConfig,
  SelfRegisterService,
  DynamicNexusService,
  RegistryService,
  RegistryWebSocketService,
  nexusAuthInterceptor,
  correlationIdInterceptor,
} from '@bimo-dk/nexus-runtime';
```
