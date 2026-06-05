import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SelfRegistrationService } from './self-registration-service.js';
import { RegistryError } from '@bimo-dk/nexus-core';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);
vi.stubGlobal('window', undefined);

const BASE_OPTIONS = {
  name: 'checkout',
  url: 'http://localhost:4201/remoteEntry.json',
  exposedModule: './CheckoutModule',
  routePath: 'checkout',
  registryUrl: 'http://localhost:8670',
  token: 'test-token',
};

describe('SelfRegistrationService', () => {
  let svc: SelfRegistrationService;

  beforeEach(() => {
    svc = new SelfRegistrationService();
    mockFetch.mockReset();
  });

  it('POSTs to /remotes on first registration', async () => {
    mockFetch.mockResolvedValue({ ok: true, status: 201 });

    await svc.register(BASE_OPTIONS);

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe('http://localhost:8670/remotes');
    expect(init.method).toBe('POST');
  });

  it('falls back to PUT on 409 conflict', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: false, status: 409 })
      .mockResolvedValueOnce({ ok: true, status: 200 });

    await svc.register(BASE_OPTIONS);

    expect(mockFetch).toHaveBeenCalledTimes(2);
    const [putUrl, putInit] = mockFetch.mock.calls[1];
    expect(putUrl).toContain('/remotes/checkout');
    expect(putInit.method).toBe('PUT');
  });

  it('throws RegistryError when PUT also fails', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: false, status: 409 })
      .mockResolvedValueOnce({ ok: false, status: 500 });

    await expect(svc.register(BASE_OPTIONS)).rejects.toBeInstanceOf(RegistryError);
  });
});
