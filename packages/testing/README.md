# @bimo-dk/nexus-testing

Test utilities, mock fabrikker og in-memory MockRegistryServer for Bimo-Nexus.

**Kun til devDependencies — aldrig production deps.**

## Installation

```bash
npm install -D @bimo-dk/nexus-testing
```

## Eksempler

### Mock factories

```typescript
import { createMockRemoteConfig, createMockRegistryResponse } from '@bimo-dk/nexus-testing';

const remote = createMockRemoteConfig({ name: 'checkout' });
const response = createMockRegistryResponse(5); // 5 mock remotes
```

### MockRegistryServer (integrationstests)

```typescript
import { MockRegistryServer } from '@bimo-dk/nexus-testing';
import { RegistryClient } from '@bimo-dk/nexus-client';

let server: MockRegistryServer;
let client: RegistryClient;

beforeAll(async () => {
  server = new MockRegistryServer({ token: 'test-token' });
  const port = await server.start();
  client = new RegistryClient({
    registryUrl: `http://localhost:${port}`,
    token: 'test-token',
  });
});

afterAll(() => server.stop());

it('roundtrips a remote', async () => {
  await client.addRemote({ name: 'foo', url: '/foo/remoteEntry.json', routePath: 'foo' });
  const list = await client.getRemotes();
  expect(list.some((r) => r.name === 'foo')).toBe(true);
});
```

### createMockRegistryClient (unit tests)

```typescript
import { createMockRegistryClient, createMockRemoteConfig } from '@bimo-dk/nexus-testing';

const mockClient = createMockRegistryClient([
  createMockRemoteConfig({ name: 'checkout' }),
]);

const remotes = await mockClient.getRemotes();
expect(remotes).toHaveLength(1);
```

### Angular TestBed integration

```typescript
import { provideMockRegistry } from '@bimo-dk/nexus-testing/angular';
import { RegistryClient } from '@bimo-dk/nexus-client';

TestBed.configureTestingModule({
  providers: [provideMockRegistry(RegistryClient, [createMockRemoteConfig()])],
});
```
