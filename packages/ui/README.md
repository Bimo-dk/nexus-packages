# @bimo-dk/nexus-ui

Angular 19 komponent-bibliotek til Bimo-Nexus. Standalone-komponenter med Angular Material under hjælmen.

## Installation

```bash
npm install @bimo-dk/nexus-ui @angular/material @angular/cdk
```

## Komponenter

### `<bimo-health-badge>`

```typescript
import { HealthBadgeComponent } from '@bimo-dk/nexus-ui';

@Component({
  imports: [HealthBadgeComponent],
  template: `<bimo-health-badge [status]="remote.healthStatus" />`,
})
```

Inputs: `status?: 'healthy' | 'degraded' | 'down' | 'unknown'`. Farvekodet pill: grøn/gul/rød/grå.

### `<bimo-offline-banner>`

```typescript
template: `<bimo-offline-banner [isOffline]="!registryOnline()" />`
```

Inputs: `isOffline: boolean`. Vises kun når `isOffline = true`.

### `<bimo-loading-spinner>`

```typescript
template: `<bimo-loading-spinner size="large" />`
```

Inputs: `size: 'small' | 'medium' | 'large'` (default `'medium'`).

### `<bimo-remote-status-card>`

```typescript
template: `
  <bimo-remote-status-card
    [remote]="remote"
    (toggle)="onToggle($event)"
    (navigate)="onNavigate($event)" />
`
```

Inputs: `remote: RemoteConfig` (påkrævet).
Outputs: `toggle: EventEmitter<RemoteConfig>`, `navigate: EventEmitter<RemoteConfig>`.

## Peer dependencies

- `@angular/core` ^19.0.0
- `@angular/common` ^19.0.0
- `@angular/material` ^19.0.0
- `@angular/cdk` ^19.0.0
