# @bimo-dk/nexus-build

Auto-generate Native Federation config from `@NexusRemote` class decorators. No more hand-editing `federation.config.json` — annotate one component and `nexus-build` figures out the rest.

## Installation

```bash
npm install -D @bimo-dk/nexus-build
```

## Usage (the only two changes you need)

### 1. Annotate your entry component

```typescript
// src/app/remote-entry/entry.component.ts
import { Component } from '@angular/core';
import { NexusRemote } from '@bimo-dk/nexus-build';

@NexusRemote()
@Component({
  selector: 'app-checkout',
  template: `<h1>Checkout</h1>`,
})
export default class CheckoutComponent {}
```

That's it. No `name`, no `route`, no `exposes` block.

### 2. Run `nexus-build` before your Angular build

```jsonc
// package.json
{
  "scripts": {
    "prebuild": "nexus-build",
    "build": "ng build"
  }
}
```

When you `npm run build`, `nexus-build` scans `src/**/*.ts`, finds `@NexusRemote`, and writes:

```json
{
  "name": "checkout",
  "exposes": {
    "./RemoteEntry": "./src/app/remote-entry/entry.component.ts"
  },
  "shared": { "@angular/core": { "singleton": true, ... } }
}
```

## How auto-detection works

When you write `@NexusRemote()` without arguments, the name is resolved in this order:

1. **Explicit option** — `@NexusRemote({ name: 'checkout' })` always wins.
2. **`package.json#name`** — if it matches camelCase (e.g. `"name": "checkout"`, or the unscoped tail of `@bimo-dk/checkout`).
3. **Class name** — `CheckoutComponent` → strip `Component`/`Entry` suffix → camelCase → `checkout`.

The route is derived from the name by converting camelCase to kebab-case (`checkoutPage` → `checkout-page`), unless you set `route` explicitly.

## Decorator options (all optional)

| Option | Type | Default | Description |
|---|---|---|---|
| `name` | `string` | inferred | Remote name (camelCase) |
| `route` | `string` | inferred from `name` | Route path under the host shell (kebab-case) |
| `exposeAs` | `string` | `'RemoteEntry'` | Module name in the `exposes` block |

## CLI

```bash
nexus-build                  # scan + write federation.config.json
nexus-build --dry-run        # print resolved config without writing
nexus-build scan             # list discovered remotes as JSON (no write)
nexus-build --root ./apps/checkout --src src
```

## Programmatic API

```typescript
import { scanForRemotes, writeFederationConfig } from '@bimo-dk/nexus-build';

const remotes = await scanForRemotes({ projectRoot: process.cwd() });
const result = await writeFederationConfig(remotes, process.cwd(), {
  shared: { '@angular/core': { singleton: true, requiredVersion: 'auto' } },
});
console.log(result.config);
```

## How it fits into the Nexus build pipeline

```
ng build
  ├─ prebuild (npm-script)
  │    └─ nexus-build
  │         ├─ scan src/**/*.ts for @NexusRemote
  │         ├─ resolve name/route/exposeAs
  │         └─ write federation.config.json
  └─ ng build (reads federation.config.js -> federation.config.json)
```

`federation.config.js` stays as-is — it's Native Federation library convention. It just reads the JSON that `nexus-build` regenerates.

## Conflict handling

- **Same exposeAs from two files** -> error. Set distinct `exposeAs` values to disambiguate.
- **Two decorators with different names but same exposeAs** -> error. Pick one name.
- **`shared` block already in federation.config.json** -> preserved (not overwritten) unless you pass a `shared` override.
