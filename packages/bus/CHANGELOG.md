# @bimo-dk/nexus-bus

## 0.2.0

### Minor Changes

- 006ef09: New package `@bimo-dk/nexus-bus` — typed publish/subscribe + request/response event bus for cross-component communication in a federated app. Federated remotes can talk to each other (and to the host) without direct imports by injecting a shared `NexusBus` service.

  Features:

  - `publish<T>(topic, payload)` / `on<T>(topic)` fire-and-forget pub/sub
  - `request<TReq, TRes>(topic, payload, { timeoutMs })` RPC-style with timeout
  - `respond<TReq, TRes>(topic, handler)` register a request handler
  - Topic globbing: `cart:*` (single segment) / `cart:**` (cross-segment)
  - Source attribution + correlation ids for tracing
