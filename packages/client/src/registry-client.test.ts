import { describe, expect, it, vi } from 'vitest';
import { RegistryClient } from './registry-client.js';
import { RegistryError } from '@bimo-nexus/core';

function mockFetch(responses: Array<{ ok: boolean; status: number; body: unknown }>): typeof fetch {
  let i = 0;
  return vi.fn(async (_url: string | URL | Request, _init?: RequestInit) => {
    const r = responses[Math.min(i, responses.length - 1)];
    i++;
    return {
      ok: r.ok,
      status: r.status,
      json: async () => r.body,
      text: async () => JSON.stringify(r.body),
    } as unknown as Response;
  }) as typeof fetch;
}

describe('RegistryClient', () => {
  it('sends X-Bimo-Token and X-Request-ID on getRemotes', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ remotes: [], total: 0, enabled: 0 }),
      text: async () => '',
    } as unknown as Response));
    const client = new RegistryClient({
      registryUrl: 'http://localhost:3000',
      token: 'secret-token',
      fetchImpl: fetchImpl as typeof fetch,
    });
    await client.getRemotes();
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers['X-Bimo-Token']).toBe('secret-token');
    expect(headers['X-Request-ID']).toMatch(/^[a-z0-9]+-\d+$/);
  });

  it('throws RegistryError with correlationId on non-2xx', async () => {
    const client = new RegistryClient({
      registryUrl: 'http://localhost:3000',
      token: 'x',
      fetchImpl: mockFetch([{ ok: false, status: 401, body: { message: 'Bad token', correlationId: 'reg-123' } }]),
    });
    await expect(client.getRemotes()).rejects.toThrowError(RegistryError);
    try {
      await client.getRemotes();
    } catch (err) {
      expect(err).toBeInstanceOf(RegistryError);
      expect((err as RegistryError).statusCode).toBe(401);
      expect((err as RegistryError).correlationId).toBe('reg-123');
    }
  });

  it('returns RemoteConfig[] on successful getRemotes', async () => {
    const remotes = [{
      name: 'remoteOne',
      url: '/remotes/remoteOne/remoteEntry.json',
      exposedModule: './RemoteEntry',
      routePath: 'remote-one',
      enabled: true,
      addedAt: '2026-01-01T00:00:00.000Z',
    }];
    const client = new RegistryClient({
      registryUrl: 'http://localhost:3000',
      token: 'x',
      fetchImpl: mockFetch([{ ok: true, status: 200, body: { remotes, total: 1, enabled: 1 } }]),
    });
    const result = await client.getRemotes();
    expect(result).toEqual(remotes);
  });

  it('rejects construction without registryUrl', () => {
    expect(() => new RegistryClient({ registryUrl: '', token: 'x' })).toThrow();
    expect(() => new RegistryClient({ registryUrl: 'http://x', token: '' })).toThrow();
  });
});
