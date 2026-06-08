import type { NexusComponentOptions } from './types';

const NEXUS_COMPONENT_META = Symbol.for('nexus.component');

/**
 * Function / SFC equivalent of `@NexusComponent`. Use this for Vue and
 * React components — the call site is what `nexusViteAuto()` scans for,
 * so wiring up federation `exposes`, the `mount(el)` wrapper, and the
 * catalog entry is done by build tooling instead of `vite.config.ts`.
 *
 * @example
 *   import { defineNexusComponent } from '@bimo-dk/nexus-build';
 *
 *   export const Cart = defineNexusComponent(
 *     {
 *       title: 'Cart Widget',
 *       description: 'Sticky cart with item count and clear-cart action.',
 *       category: 'commerce',
 *       tags: ['vue', 'cart'],
 *     },
 *     defineComponent({ ... }),
 *   );
 *
 * The first argument is the catalog metadata; the second is whatever
 * component the framework needs (a Vue component definition, a React
 * function, an Angular standalone class — same shape across all three).
 * The HOF returns the component unchanged so the developer keeps full
 * type safety. The metadata is stamped on the component via a
 * `Symbol.for('nexus.component')` slot so the scanner can both walk
 * source (compile-time) and inspect runtime modules (test mode).
 *
 * The scan is purely syntactic — the metadata object literal is read
 * straight out of the AST. Pass a literal, not a variable, or the
 * scanner will skip the file.
 */
export function defineNexusComponent<T>(meta: NexusComponentOptions, component: T): T {
  if (component != null && (typeof component === 'object' || typeof component === 'function')) {
    (component as unknown as Record<symbol, NexusComponentOptions>)[NEXUS_COMPONENT_META] = meta;
  }
  return component;
}

/** Read catalog metadata stamped by `defineNexusComponent`, if present. */
export function getDefinedNexusComponentMetadata(component: unknown): NexusComponentOptions | undefined {
  if (component != null && (typeof component === 'object' || typeof component === 'function')) {
    return (component as unknown as Record<symbol, NexusComponentOptions>)[NEXUS_COMPONENT_META];
  }
  return undefined;
}
