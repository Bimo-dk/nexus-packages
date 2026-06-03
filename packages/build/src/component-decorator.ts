import type { NexusComponentOptions } from './types';

const NEXUS_COMPONENT_META = Symbol.for('nexus.component');

interface NexusComponentMarked {
  [NEXUS_COMPONENT_META]?: NexusComponentOptions;
}

/**
 * Attach catalog metadata to a federated component.
 *
 * Stack with @NexusRemote() on the same class — they serve different purposes:
 *   - @NexusRemote() marks the class for federation (scanner -> federation.config.json)
 *   - @NexusComponent() adds catalog metadata (scanner -> catalog.json next to federation.config.json)
 *
 * The portal's Component Catalog page reads catalog.json from each remote to
 * present a searchable cross-domain index.
 *
 * @example
 *   @NexusRemote()
 *   @NexusComponent({
 *     title: 'Order Table',
 *     description: 'Paginated table of orders with status filter',
 *     category: 'data-display',
 *     tags: ['orders', 'commerce', 'table'],
 *     icon: 'shopping_cart',
 *     inputs: {
 *       filter:   { type: 'string',  default: 'all',    description: 'Status filter' },
 *       pageSize: { type: 'number',  default: 25,       description: 'Rows per page' },
 *       readonly: { type: 'boolean', default: false },
 *     },
 *   })
 *   @Component({ ... })
 *   export default class OrderTableComponent {}
 */
export function NexusComponent(options: NexusComponentOptions): ClassDecorator {
  return ((target: object): void => {
    (target as NexusComponentMarked)[NEXUS_COMPONENT_META] = options;
  }) as ClassDecorator;
}

/** Read catalog metadata stamped by `@NexusComponent` from a class, if present. */
export function getNexusComponentMetadata(target: object): NexusComponentOptions | undefined {
  return (target as NexusComponentMarked)[NEXUS_COMPONENT_META];
}
