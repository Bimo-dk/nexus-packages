# @bimo-dk/nexus-bus

Typed publish/subscribe + request/response event bus for Bimo-Nexus federated components. Lets remotes and the host shell talk to each other without direct imports.

## Installation

```bash
npm install @bimo-dk/nexus-bus
```

Requires `@angular/core ^19` and `rxjs ^7.8` as peer dependencies.

## Quick start

```typescript
import { Component, inject } from '@angular/core';
import { NexusBus } from '@bimo-dk/nexus-bus';

interface CartAdded { sku: string; qty: number; }

@Component({ ... })
export class CartButton {
  private readonly bus = inject(NexusBus);

  add(): void {
    this.bus.publish<CartAdded>('cart:item-added', { sku: 'A1', qty: 2 });
  }
}

@Component({ ... })
export class CartBadge {
  private readonly bus = inject(NexusBus);
  count = 0;

  constructor() {
    this.bus.on<CartAdded>('cart:item-added').subscribe((e) => {
      this.count += e.payload.qty;
    });
  }
}
```

`CartButton` and `CartBadge` can live in totally different remotes — they never import each other.

## API

### `publish<T>(topic, payload, options?)`

Fire-and-forget event. Returns the envelope id.

```typescript
bus.publish('user:logged-out', undefined);
bus.publish('cart:item-added', { sku: 'A1', qty: 1 }, { source: 'remoteOne/CartButton' });
```

### `on<T>(topic)` / `onPayload<T>(topic)`

Subscribe to events. Topic supports glob:
- `cart:item-added` — exact match
- `cart:*` — match a single segment after `cart:`
- `cart:**` — match across colons (everything starting with `cart:`)

```typescript
bus.on<CartAdded>('cart:item-added').subscribe((e) => { ... });
bus.on('cart:*').subscribe((e) => console.log(e.topic, e.payload));
bus.onPayload<UserSession>('auth:logged-in').subscribe((session) => { ... });
```

### `request<TReq, TRes>(topic, payload, options?)`

RPC-style request. Returns a Promise that resolves with the responder's value.

```typescript
const total = await bus.request<void, number>('cart:get-total');
const user = await bus.request<{ id: string }, User>('user:get', { id: 'u42' }, { timeoutMs: 2000 });
```

Default timeout is 5000ms — rejects with `Error('[nexus-bus] request "<topic>" timed out...')`.

### `respond<TReq, TRes>(topic, handler)`

Register a handler for incoming requests on `topic`. Only one handler per topic (last-registered wins). Returns an unsubscribe function.

```typescript
const off = bus.respond<void, number>('cart:get-total', () => this.calculateTotal());
// later:
off();
```

Async handlers and Promises are supported:

```typescript
bus.respond<{ id: string }, User>('user:get', async ({ id }) => {
  return await firstValueFrom(this.http.get<User>(`/api/users/${id}`));
});
```

## Conventions

- **Topic naming:** `<domain>:<action>` — keep verbs in past tense for events (`item-added`, `logged-out`) and imperative for requests (`get-total`, `delete-item`).
- **One responder per topic** — for multiple subscribers use `publish/on`. `respond` is for single-source-of-truth RPC.
- **`source` field** — fill it in for easier debugging: `{ source: 'remoteOne/CartButton' }`.
- **Never put DOM nodes or class instances in payloads** — events may cross federation boundaries; keep payloads JSON-serializable.

## Why a separate package

`@bimo-dk/nexus-bus` ships independently of `@bimo-dk/nexus-runtime` so:

1. Smaller bundle for consumers who don't need a host shell (e.g. a standalone remote that just wants to publish events)
2. Independent versioning — bus semantics are stable; runtime can iterate faster
3. Both host AND remotes import the same package → same `NexusBus` instance is shared via Angular's `providedIn: 'root'`

## License

MIT
