---
"@bimo-dk/nexus-runtime": minor
---

Add setUserSignal and getUserSignal to user-context

Hosts call setUserSignal() once at startup; any federated remote can call
getUserSignal() and receive the same signal regardless of module identity.
Uses globalThis as a shared bridge so token injection works across federation
bundle boundaries.
