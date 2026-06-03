# @bimo-dk/nexus-client

HTTP + WebSocket klient til Bimo-Nexus registry API.

## Installation

```bash
npm install @bimo-dk/nexus-client
```

## RegistryClient

```typescript
import { RegistryClient } from '@bimo-dk/nexus-client';

const client = new RegistryClient({
  registryUrl: 'http://localhost:3000',
  token: process.env.BIMO_TOKEN!,
});

// Læs
const remotes = await client.getRemotes();

// Skriv
await client.addRemote({
  name: 'myRemote',
  url: '/remotes/myRemote/remoteEntry.json',
  routePath: 'my-remote',
});

await client.toggleRemote('myRemote');
await client.deleteRemote('myRemote');

// Health
const health = await client.checkHealth('http://remote-one/health');
```

## RegistryWebSocket

```typescript
import { RegistryWebSocket } from '@bimo-dk/nexus-client';

const ws = new RegistryWebSocket({
  registryUrl: 'http://localhost:3000',
  token: process.env.BIMO_TOKEN!,
});

ws.onMessage((msg) => {
  if (msg.type === 'registry_updated') {
    console.log('Registry changed:', msg.remotes);
  }
});

ws.connect();
// ... later
ws.disconnect();
```

Auto-reconnect med exponential backoff (1s → 2s → 4s → ... → 30s max).

## Re-exports

Alle typer + konstanter fra `@bimo-dk/nexus-core` er re-eksporteret så du kun behøver én import:

```typescript
import { RegistryClient, RemoteConfig, NEXUS_DEFAULTS } from '@bimo-dk/nexus-client';
```
