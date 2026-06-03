# @bimo-dk/nexus-ui

Angular 19 component library for Bimo-Nexus. Standalone components with Angular Material under the hood.

## Installation

```bash
npm install @bimo-dk/nexus-ui @angular/material @angular/cdk
```

## Components

### `<bimo-health-badge>`

```typescript
import { HealthBadgeComponent } from '@bimo-dk/nexus-ui';

@Component({
  imports: [HealthBadgeComponent],
  template: `<bimo-health-badge [status]="remote.healthStatus" />`,
})
```

Inputs: `status?: 'healthy' | 'degraded' | 'down' | 'unknown'`. Color-coded pill: green/yellow/red/gray.

### `<bimo-offline-banner>`

```typescript
template: `<bimo-offline-banner [isOffline]="!registryOnline()" />`
```

Inputs: `isOffline: boolean`. Only displayed when `isOffline = true`.

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

Inputs: `remote: RemoteConfig` (required).
Outputs: `toggle: EventEmitter<RemoteConfig>`, `navigate: EventEmitter<RemoteConfig>`.

## Peer dependencies

- `@angular/core` ^19.0.0
- `@angular/common` ^19.0.0
- `@angular/material` ^19.0.0
- `@angular/cdk` ^19.0.0
