import { describe, expect, it } from 'vitest';
import { isValidRemoteName, isValidRoutePath, isValidUrl, isValidVisibility, isValidFramework } from './validators.js';
import { NEXUS_DEFAULTS } from './constants.js';
import { RegistryError, NexusError } from './errors.js';

describe('validators', () => {
  it('accepts valid camelCase remote names', () => {
    expect(isValidRemoteName('remoteOne')).toBe(true);
    expect(isValidRemoteName('checkout')).toBe(true);
    expect(isValidRemoteName('paymentFlow123')).toBe(true);
  });

  it('rejects invalid remote names', () => {
    expect(isValidRemoteName('')).toBe(false);
    expect(isValidRemoteName('Remote-One')).toBe(false);
    expect(isValidRemoteName('RemoteOne')).toBe(false);
    expect(isValidRemoteName('123remote')).toBe(false);
    expect(isValidRemoteName('remote one')).toBe(false);
  });

  it('accepts valid kebab-case route paths', () => {
    expect(isValidRoutePath('remote-one')).toBe(true);
    expect(isValidRoutePath('payment-flow-v2')).toBe(true);
    expect(isValidRoutePath('checkout')).toBe(true);
  });

  it('rejects invalid route paths', () => {
    expect(isValidRoutePath('')).toBe(false);
    expect(isValidRoutePath('RemoteOne')).toBe(false);
    expect(isValidRoutePath('-leading-dash')).toBe(false);
    expect(isValidRoutePath('1-numeric-start')).toBe(false);
  });

  it('validates http(s) URLs', () => {
    expect(isValidUrl('http://example.com')).toBe(true);
    expect(isValidUrl('https://api.nexus.dk/path')).toBe(true);
    expect(isValidUrl('')).toBe(false);
    expect(isValidUrl('not a url')).toBe(false);
    expect(isValidUrl('ftp://example.com')).toBe(false);
  });
});

describe('isValidVisibility', () => {
  it('accepts global', () => {
    expect(isValidVisibility('global')).toBe(true);
  });

  it('accepts host: followed by a non-empty id', () => {
    expect(isValidVisibility('host:abc123')).toBe(true);
    expect(isValidVisibility('host:some-host-id')).toBe(true);
  });

  it('rejects host: with nothing after the colon', () => {
    expect(isValidVisibility('host:')).toBe(false);
    expect(isValidVisibility('host:   ')).toBe(false);
  });

  it('rejects any other string', () => {
    expect(isValidVisibility('')).toBe(false);
    expect(isValidVisibility('all')).toBe(false);
    expect(isValidVisibility('private')).toBe(false);
  });
});

describe('isValidFramework', () => {
  it('accepts angular, vue, react', () => {
    expect(isValidFramework('angular')).toBe(true);
    expect(isValidFramework('vue')).toBe(true);
    expect(isValidFramework('react')).toBe(true);
  });

  it('rejects other values', () => {
    expect(isValidFramework('svelte')).toBe(false);
    expect(isValidFramework('')).toBe(false);
    expect(isValidFramework('Angular')).toBe(false);
  });
});

describe('NEXUS_DEFAULTS', () => {
  it('exposes platform constants', () => {
    expect(NEXUS_DEFAULTS.TOKEN_HEADER).toBe('X-Nexus-Token');
    expect(NEXUS_DEFAULTS.REQUEST_ID_HEADER).toBe('X-Request-ID');
    expect(NEXUS_DEFAULTS.WEBSOCKET_PATH).toBe('/ws');
    expect(NEXUS_DEFAULTS.CACHE_TTL_MS).toBe(86_400_000);
  });

  it('is frozen — cannot be mutated', () => {
    expect(() => {
      (NEXUS_DEFAULTS as unknown as { REGISTRY_PORT: number }).REGISTRY_PORT = 9999;
    }).toThrow();
  });
});

describe('RegistryError', () => {
  it('preserves statusCode and correlationId', () => {
    const err = new RegistryError('Boom', 500, 'req-abc-1');
    expect(err.message).toBe('Boom');
    expect(err.statusCode).toBe(500);
    expect(err.correlationId).toBe('req-abc-1');
    expect(err.name).toBe('RegistryError');
    expect(err instanceof Error).toBe(true);
    expect(err instanceof RegistryError).toBe(true);
  });

  it('serializes to JSON', () => {
    const err = new RegistryError('fail', 404, 'reg-xyz');
    expect(err.toJSON()).toEqual({
      name: 'RegistryError',
      message: 'fail',
      statusCode: 404,
      correlationId: 'reg-xyz',
    });
  });
});

describe('NexusError', () => {
  it('extends RegistryError and carries errorCode', () => {
    const err = new NexusError('Banned', 429, 'ip_banned', 'req-1');
    expect(err instanceof Error).toBe(true);
    expect(err instanceof RegistryError).toBe(true);
    expect(err instanceof NexusError).toBe(true);
    expect(err.errorCode).toBe('ip_banned');
    expect(err.statusCode).toBe(429);
    expect(err.name).toBe('NexusError');
  });

  it('serializes errorCode to JSON', () => {
    const err = new NexusError('Too many', 429, 'rate_limited');
    expect(err.toJSON()).toMatchObject({ errorCode: 'rate_limited', statusCode: 429 });
  });
});
