---
"@bimo-dk/nexus-runtime": minor
"@bimo-dk/nexus-bus": patch
---

Fix ng-packagr packages publishing from source root instead of compiled dist.

Added `publishConfig.directory: "dist"` so Changesets publishes the ng-packagr
output in `dist/` rather than the TypeScript source root. Without this, consumers
got no `types`, `exports`, or compiled JS — only raw source files.

Also re-ships `nexus-runtime` with the user-signal bridge: `setUserSignal` and
`getUserSignal` let hosts register a shared user signal that federated remotes
can read across bundle boundaries via `globalThis`.
