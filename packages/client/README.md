# @bimo-dk/nexus-client

HTTP + WebSocket client for the Bimo-Nexus registry API.

## Installation

```bash
npm install @bimo-dk/nexus-client
```

## RegistryClient

```typescript
import { RegistryClient } from '@bimo-dk/nexus-client';

const client = new RegistryClient({
  registryUrl: 'http://localhost:3000',
  token: process.env.NEXUS_TOKEN!,
});

// Read
const remotes = await client.getRemotes();

// Write
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
  token: process.env.NEXUS_TOKEN!,
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

Auto-reconnect with exponential backoff (1s -> 2s -> 4s -> ... -> 30s max).

## Re-exports

All types + constants from `@bimo-dk/nexus-core` are re-exported so you only need one import:

```typescript
import { RegistryClient, RemoteConfig, NEXUS_DEFAULTS } from '@bimo-dk/nexus-client';
```
