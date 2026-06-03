---
'@bimo-dk/nexus-build': patch
---

Fix browser bundlers (esbuild via Native Federation) failing to resolve `fs`/`path`/`typescript` when importing `NexusRemote`. The main entry now contains ONLY the runtime decorator + types — no transitive Node imports. Build-time helpers (`scanForRemotes`, `writeFederationConfig`, naming utilities) remain available via `@bimo-dk/nexus-build/scanner`.
