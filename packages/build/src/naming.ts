const CAMEL_CASE_REMOTE = /^[a-z][a-zA-Z0-9]*$/;

/** Strip a trailing "Component", "Entry" or "EntryComponent" suffix from a class name. */
export function stripClassSuffix(className: string): string {
  return className
    .replace(/EntryComponent$/, '')
    .replace(/Component$/, '')
    .replace(/Entry$/, '');
}

/** Convert "MyRemote", "my-remote", "my_remote" to "myRemote". Leaves valid camelCase unchanged. */
export function toCamelCase(value: string): string {
  if (!value) return value;
  const cleaned = value
    .replace(/[_-]+(.)/g, (_, c: string) => c.toUpperCase())
    .replace(/^([A-Z])/, (_, c: string) => c.toLowerCase());
  return cleaned;
}

/** Convert "myRemote" / "MyRemote" / "HTTPClient" to "my-remote" / "http-client". */
export function toKebabCase(value: string): string {
  return value
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[_\s]+/g, '-')
    .toLowerCase();
}

/**
 * Resolve the final remote name from (in priority order):
 *   1. explicit option from decorator
 *   2. package.json#name if it matches camelCase (handles scoped names like @bimo-dk/foo -> foo)
 *   3. class name with Component/Entry suffix stripped, camelCased
 *   4. provided default
 */
export function resolveName(args: {
  explicit?: string;
  packageName?: string;
  className: string;
  fallback?: string;
}): { name: string; explicit: boolean } {
  if (args.explicit && args.explicit.trim()) {
    return { name: args.explicit.trim(), explicit: true };
  }
  if (args.packageName) {
    const unscoped = args.packageName.includes('/')
      ? args.packageName.split('/').pop()!
      : args.packageName;
    const camel = toCamelCase(unscoped);
    if (CAMEL_CASE_REMOTE.test(camel)) {
      return { name: camel, explicit: false };
    }
  }
  const fromClass = toCamelCase(stripClassSuffix(args.className));
  if (CAMEL_CASE_REMOTE.test(fromClass)) {
    return { name: fromClass, explicit: false };
  }
  if (args.fallback) {
    return { name: args.fallback, explicit: false };
  }
  return { name: fromClass || args.className.toLowerCase(), explicit: false };
}

/** Default `shared` block used when federation.config.json has none and no override is provided. */
export function defaultSharedBlock(): Record<string, unknown> {
  const peer = { singleton: true, strictVersion: true, requiredVersion: 'auto' };
  return {
    '@angular/core': peer,
    '@angular/common': peer,
    '@angular/common/http': peer,
    '@angular/router': peer,
    '@angular/forms': peer,
    rxjs: peer,
  };
}
