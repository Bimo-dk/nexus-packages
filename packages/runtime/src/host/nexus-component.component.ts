import {
  ChangeDetectionStrategy,
  Component,
  Type,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { NgComponentOutlet } from '@angular/common';
import { ComponentLoaderService } from './component-loader.service';

/**
 * Drop-in tag that loads + renders a federated component by name.
 *
 * @example
 *   <nexus-component remote="checkout" expose="CartPage" />
 *
 *   <nexus-component
 *     remote="orders"
 *     expose="OrderTable"
 *     [inputs]="{ filter: 'pending', pageSize: 25 }" />
 *
 * Handles fetch, cache, loading state and errors so consumers never touch
 * `loadRemoteModule` or `NgComponentOutlet` directly. The remote must already
 * be registered with the registry (DynamicNexusService.loadedRemotes()).
 */
@Component({
  selector: 'nexus-component',
  standalone: true,
  imports: [NgComponentOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @switch (state()) {
      @case ('loaded') {
        <ng-container *ngComponentOutlet="loaded()!; inputs: inputs()" />
      }
      @case ('error') {
        <div class="nx-error">Failed to load {{ remote() }}/{{ expose() }}: {{ error() }}</div>
      }
      @default {
        <div class="nx-loading">Loading {{ expose() }}...</div>
      }
    }
  `,
  styles: [`
    :host { display: block; }
    .nx-loading { padding: 16px; text-align: center; color: #94a3b8; font-size: 13px; font-style: italic; }
    .nx-error { padding: 12px; background: #fee2e2; color: #991b1b; border-radius: 6px; font-size: 12px; font-family: monospace; }
  `],
})
export class NexusComponent {
  private readonly loader = inject(ComponentLoaderService);

  readonly remote = input.required<string>();
  readonly expose = input.required<string>();
  readonly inputs = input<Record<string, unknown>>({});

  readonly loaded = signal<Type<unknown> | null>(null);
  readonly error = signal<string | null>(null);
  readonly state = computed<'loading' | 'loaded' | 'error'>(() => {
    if (this.error()) return 'error';
    if (this.loaded()) return 'loaded';
    return 'loading';
  });

  constructor() {
    effect(() => {
      const r = this.remote();
      const e = this.expose();
      this.fetch(r, e);
    });
  }

  private async fetch(remote: string, expose: string): Promise<void> {
    this.loaded.set(null);
    this.error.set(null);
    try {
      const cmp = await this.loader.loadComponent(remote, expose);
      this.loaded.set(cmp);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : String(err));
    }
  }
}
