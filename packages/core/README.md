# @bimo-dk/nexus-core

TypeScript-typer, konstanter og validators til Bimo-Nexus platformen. Ingen runtime dependencies — kun TypeScript.

## Installation

```bash
npm install @bimo-dk/nexus-core
```

## Brug

```typescript
import {
  RemoteConfig,
  RegistryResponse,
  NEXUS_DEFAULTS,
  RegistryError,
  isValidRemoteName,
} from '@bimo-dk/nexus-core';

if (isValidRemoteName('myRemote')) {
  // ...
}

console.log(NEXUS_DEFAULTS.TOKEN_HEADER); // 'X-Bimo-Token'
```

## Exports

- **Types**: `RemoteConfig`, `RegistryResponse`, `HealthStatus`, `WebSocketMessage`, `RemoteHealthStatus`, `AddRemoteRequest`, `UpdateRemoteRequest`
- **Constants**: `NEXUS_DEFAULTS` (frozen object med port/header-defaults)
- **Errors**: `RegistryError` (typed exception med statusCode + correlationId)
- **Validators**: `isValidRemoteName`, `isValidRoutePath`, `isValidUrl`, `isValidUrlOrPath`
