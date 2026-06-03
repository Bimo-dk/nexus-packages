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
  // Pure mutation — do NOT return the class. Returning a value tells Angular's
  // ngc/AOT pipeline that the class has been replaced, which can drop the ivy
  // metadata that @Component adds (leading to "JIT compiler unavailable" at
  // runtime when the federated component is rendered via NgComponentOutlet).
  return ((target: object): void => {
    (target as NexusMarked)[NEXUS_REMOTE_META] = options;
  }) as ClassDecorator;
}

/** Read the metadata stamped by `@NexusRemote` from a class, if present. */
export function getNexusRemoteMetadata(target: object): NexusRemoteOptions | undefined {
  return (target as NexusMarked)[NEXUS_REMOTE_META];
}
