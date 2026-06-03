---
'@bimo-dk/nexus-build': patch
---

Fix `@NexusRemote()` decorator returning the class, which made Angular's ngc treat the class as replaced and drop the ivy metadata added by `@Component`. The result was "JIT compiler unavailable" at runtime when the federated component was rendered via NgComponentOutlet. The decorator is now mutation-only and returns void.
