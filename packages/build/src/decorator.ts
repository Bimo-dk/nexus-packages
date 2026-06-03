import type { NexusRemoteOptions } from './types.js';

const NEXUS_REMOTE_META = Symbol.for('nexus.remote');

interface NexusMarked {
  [NEXUS_REMOTE_META]?: NexusRemoteOptions;
}

/**
 * Marks a class as the entry point of a Bimo-Nexus remote.
 *
 * At runtime this is a near no-op — it only attaches the options to the class
 * via a well-known symbol so introspection tools can find it. The actual
 * federation.config.json generation is done at build time by `nexus-build`,
 * which statically scans source files for `@NexusRemote(...)` usages.
 *
 * @example
 *   // Auto-detected name from class name (CheckoutComponent -> checkout)
 *   @NexusRemote()
 *   @Component({ ... })
 *   export default class CheckoutComponent {}
 *
 *   // Explicit name + route
 *   @NexusRemote({ name: 'checkout', route: 'shop/checkout' })
 *   @Component({ ... })
 *   export default class CheckoutComponent {}
 */
export function NexusRemote(options: NexusRemoteOptions = {}): ClassDecorator {
  return ((target: object) => {
    (target as NexusMarked)[NEXUS_REMOTE_META] = options;
    return target;
  }) as ClassDecorator;
}

/** Read the metadata stamped by `@NexusRemote` from a class, if present. */
export function getNexusRemoteMetadata(target: object): NexusRemoteOptions | undefined {
  return (target as NexusMarked)[NEXUS_REMOTE_META];
}
