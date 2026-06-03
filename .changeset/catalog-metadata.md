---
'@bimo-dk/nexus-build': minor
'@bimo-dk/nexus-runtime': minor
---

Add a cross-domain Component Catalog system.

**nexus-build:**
- New `@NexusComponent({ title, description, category, tags, icon, inputs, experimental })` decorator carries catalog metadata
- Scanner now reads both `@NexusRemote` and `@NexusComponent` from the same class
- `nexus-build` CLI also writes `public/catalog.json` per remote (skip with `--no-catalog`)

**nexus-runtime:**
- New `CatalogService` aggregates `/catalog.json` from every registered remote into one searchable signal
- Exposes `entries()`, `categories()`, `tags()` computed signals + `filter({ query, category, tag, remote })` helper
- Backs the portal's `/catalog` Component Catalog page (consumer feature)
