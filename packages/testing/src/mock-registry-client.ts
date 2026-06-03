import type { RegistryClient } from '@bimo-dk/nexus-client';
import type { HealthStatus, RemoteConfig } from '@bimo-dk/nexus-core';
import { createMockRemoteConfig } from './mock-remote-config.js';

type MockFn<T extends (...args: never[]) => unknown> = T & {
  mock: { calls: Parameters<T>[][]; results: Array<{ value: ReturnType<T> }> };
  mockResolvedValue: (v: Awaited<ReturnType<T>>) => MockFn<T>;
  mockResolvedValueOnce: (v: Awaited<ReturnType<T>>) => MockFn<T>;
  mockRejectedValue: (e: unknown) => MockFn<T>;
  mockImplementation: (impl: T) => MockFn<T>;
};

function mockFn<T extends (...args: never[]) => unknown>(defaultImpl?: T): MockFn<T> {
  const calls: Parameters<T>[][] = [];
  const results: Array<{ value: ReturnType<T> }> = [];
  let impl = defaultImpl;
  const onceQueue: T[] = [];

  const fn = ((...args: Parameters<T>) => {
    calls.push([args] as unknown as Parameters<T>[]);
    const useImpl = onceQueue.length > 0 ? onceQueue.shift()! : impl;
    if (!useImpl) {
      const def = Promise.resolve(undefined) as unknown as ReturnType<T>;
      results.push({ value: def });
      return def;
    }
    const value = useImpl(...args) as ReturnType<T>;
    results.push({ value });
    return value;
  }) as MockFn<T>;
  fn.mock = { calls, results };
  fn.mockResolvedValue = (v) => { impl = (() => Promise.resolve(v)) as unknown as T; return fn; };
  fn.mockResolvedValueOnce = (v) => { onceQueue.push((() => Promise.resolve(v)) as unknown as T); return fn; };
  fn.mockRejectedValue = (e) => { impl = (() => Promise.reject(e)) as unknown as T; return fn; };
  fn.mockImplementation = (i) => { impl = i; return fn; };
  return fn;
}

/**
 * Mock of RegistryClient with tracking on all methods. Works as a drop-in
 * replacement in unit tests without needing MockRegistryServer.
 */
export function createMockRegistryClient(initialRemotes: RemoteConfig[] = []): RegistryClient {
  const remotes = [...initialRemotes];

  const mock = {
    getRemotes: mockFn(async () => remotes),
    addRemote: mockFn(async (input: Parameters<RegistryClient['addRemote']>[0]) => {
      const full = createMockRemoteConfig({ ...input });
      remotes.push(full);
      return full;
    }),
    updateRemote: mockFn(async (name: string, patch: Parameters<RegistryClient['updateRemote']>[1]) => {
      const idx = remotes.findIndex((r) => r.name === name);
      if (idx === -1) throw new Error(`mock: remote ${name} not found`);
      remotes[idx] = { ...remotes[idx], ...patch };
      return remotes[idx];
    }),
    deleteRemote: mockFn(async (name: string) => {
      const i = remotes.findIndex((r) => r.name === name);
      if (i !== -1) remotes.splice(i, 1);
    }),
    toggleRemote: mockFn(async (name: string) => {
      const r = remotes.find((x) => x.name === name);
      if (!r) throw new Error(`mock: remote ${name} not found`);
      r.enabled = !r.enabled;
      return r;
    }),
    checkHealth: mockFn(async (_url: string): Promise<HealthStatus> => ({
      status: 'ok',
      timestamp: new Date().toISOString(),
      responseTimeMs: 5,
    })),
  };

  return mock as unknown as RegistryClient;
}
