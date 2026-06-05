# @bimo-dk/nexus-bus

## 0.2.1

### Patch Changes

- b7e165b: Fix ng-packagr packages publishing from source root instead of compiled dist.

  Added `publishConfig.directory: "dist"` so Changesets publishes the ng-packagr
  output in `dist/` rather than the TypeScript source root. Without this, consumers
  got no `types`, `exports`, or compiled JS — only raw source files.

  Also re-ships `nexus-runtime` with the user-signal bridge: `setUserSignal` and
  `getUserSignal` let hosts register a shared user signal that federated remotes
  can read across bundle boundaries via `globalThis`.

## 0.2.0

### Minor Changes

- 006ef09: New package `@bimo-dk/nexus-bus` — typed publish/subscribe + request/response event bus for cross-component communication in a federated app. Federated remotes can talk to each other (and to the host) without direct imports by injecting a shared `NexusBus` service.

  Features:

  - `publish<T>(topic, payload)` / `on<T>(topic)` fire-and-forget pub/sub
  - `request<TReq, TRes>(topic, payload, { timeoutMs })` RPC-style with timeout
  - `respond<TReq, TRes>(topic, handler)` register a request handler
  - Topic globbing: `cart:*` (single segment) / `cart:**` (cross-segment)
  - Source attribution + correlation ids for tracing
