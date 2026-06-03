# @bimo-dk/nexus-core

TypeScript types, constants and validators for the Bimo-Nexus platform. No runtime dependencies — TypeScript only.

## Installation

```bash
npm install @bimo-dk/nexus-core
```

## Usage

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
- **Constants**: `NEXUS_DEFAULTS` (frozen object with port/header defaults)
- **Errors**: `RegistryError` (typed exception with statusCode + correlationId)
- **Validators**: `isValidRemoteName`, `isValidRoutePath`, `isValidUrl`, `isValidUrlOrPath`
