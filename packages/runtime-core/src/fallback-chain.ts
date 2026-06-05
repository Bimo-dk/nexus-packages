/**
 * Tries each loader in order and returns the result of the first that succeeds.
 * If all loaders fail, the last error is re-thrown.
 *
 * Used by host adapters for the three-layer fallback:
 *   live registry → sessionStorage cache → static backup
 */
export class FallbackChain {
  async load<T>(loaders: Array<() => Promise<T>>): Promise<T> {
    let lastError: unknown;
    for (const loader of loaders) {
      try {
        return await loader();
      } catch (err) {
        lastError = err;
      }
    }
    throw lastError;
  }
}
