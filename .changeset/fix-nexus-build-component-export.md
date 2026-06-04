---
"@bimo-dk/nexus-build": patch
---

Ensure NexusComponent decorator is included in the published dist.

The 0.2.0 publish may have bundled an incomplete dist that dropped the
NexusComponent export. This release forces a clean rebuild so consumers can
use `@NexusComponent({ title, ... })` alongside `@NexusRemote()`.
