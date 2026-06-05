const REMOTE_NAME_PATTERN = /^[a-z][a-zA-Z0-9]*$/;
const ROUTE_PATH_PATTERN = /^[a-z][a-z0-9-]*$/;
const DOMAIN_PATTERN = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*(:\d{1,5})?$/;

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

/** Validates a hostname with optional port, no protocol prefix. */
export function isValidDomain(domain: string): boolean {
  if (typeof domain !== 'string' || domain.length === 0) return false;
  return DOMAIN_PATTERN.test(domain);
}

/** Validates visibility: either 'global' or 'host:<non-empty-id>'. */
export function isValidVisibility(value: string): boolean {
  if (typeof value !== 'string') return false;
  if (value === 'global') return true;
  if (value.startsWith('host:') && /\S/.test(value.slice(5))) return true;
  return false;
}

/** Validates framework is one of the supported values. */
export function isValidFramework(value: string): value is 'angular' | 'vue' | 'react' {
  return value === 'angular' || value === 'vue' || value === 'react';
}

/** Validates host name — same camelCase pattern as remote names. */
export function isValidHostName(name: string): boolean {
  if (typeof name !== 'string' || name.length === 0) return false;
  return REMOTE_NAME_PATTERN.test(name);
}

/** Validates gate name — same camelCase pattern as remote names. */
export function isValidGateName(name: string): boolean {
  if (typeof name !== 'string' || name.length === 0) return false;
  return REMOTE_NAME_PATTERN.test(name);
}
