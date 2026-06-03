/**
 * Decoupled helper to read @NexusRemote metadata at runtime.
 *
 * We can't depend on @bimo-dk/nexus-build (which only exports the decorator
 * + build-time scanner) because that would create a circular runtime dep.
 * Instead, both packages agree on the symbol key, so the runtime can read
 * whatever the build package stamped onto the class.
 */
const NEXUS_REMOTE_META = Symbol.for('nexus.remote');

export interface RemoteDecoratorMeta {
  name?: string;
  route?: string;
  exposeAs?: string;
}

export function readRemoteMetadata(target: object): RemoteDecoratorMeta | undefined {
  const ctor = (target as { constructor?: object }).constructor ?? target;
  const meta = (ctor as Record<symbol, unknown>)[NEXUS_REMOTE_META];
  return (meta ?? undefined) as RemoteDecoratorMeta | undefined;
}
