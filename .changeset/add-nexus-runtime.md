---
'@bimo-dk/nexus-runtime': minor
---

Initial release of `@bimo-dk/nexus-runtime`. Angular providers `provideNexusConfig()`, `provideNexusRemote()` (self-registers a remote with the registry at bootstrap) and `provideNexusHost()` (bundles `DynamicNexusService` + `RegistryService` + `RegistryWebSocketService` + auth/correlation interceptors). Brings remote/host bootstrap to ~5 lines of pure business logic.
