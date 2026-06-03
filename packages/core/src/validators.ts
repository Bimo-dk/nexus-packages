const REMOTE_NAME_PATTERN = /^[a-z][a-zA-Z0-9]*$/;
const ROUTE_PATH_PATTERN = /^[a-z][a-z0-9-]*$/;

/** Validerer at remote-navn er camelCase startende med lille bogstav. */
export function isValidRemoteName(name: string): boolean {
  if (typeof name !== 'string' || name.length === 0) return false;
  return REMOTE_NAME_PATTERN.test(name);
}

/** Validerer at route-path er kebab-case startende med lille bogstav. */
export function isValidRoutePath(path: string): boolean {
  if (typeof path !== 'string' || path.length === 0) return false;
  return ROUTE_PATH_PATTERN.test(path);
}

/** Validerer at URL er en gyldig http(s)-adresse. */
export function isValidUrl(url: string): boolean {
  if (typeof url !== 'string' || url.length === 0) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/** Validerer at en value er enten en absolut http(s)-URL eller en absolut path (starter med /). */
export function isValidUrlOrPath(value: string): boolean {
  if (typeof value !== 'string' || value.length === 0) return false;
  if (value.startsWith('/')) return true;
  return isValidUrl(value);
}
