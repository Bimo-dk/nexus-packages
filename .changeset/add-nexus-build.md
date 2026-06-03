---
'@bimo-dk/nexus-build': minor
---

Initial release of `@bimo-dk/nexus-build`. Provides the `@NexusRemote()` class decorator and a `nexus-build` CLI that scans `src/**/*.ts` via the TypeScript Compiler API and auto-generates `federation.config.json`. Use as a `prebuild` npm-script — eliminates manual federation config in remotes.
