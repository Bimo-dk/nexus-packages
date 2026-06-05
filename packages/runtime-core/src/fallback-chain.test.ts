import { describe, it, expect, vi } from 'vitest';
import { FallbackChain } from './fallback-chain.js';

describe('FallbackChain', () => {
  it('returns the first successful result', async () => {
    const chain = new FallbackChain();
    const loaderA = vi.fn().mockResolvedValue('from-A');
    const loaderB = vi.fn().mockResolvedValue('from-B');

    const result = await chain.load([loaderA, loaderB]);

    expect(result).toBe('from-A');
    expect(loaderB).not.toHaveBeenCalled();
  });

  it('skips failed loaders and returns the next success', async () => {
    const chain = new FallbackChain();
    const loaderA = vi.fn().mockRejectedValue(new Error('fail-A'));
    const loaderB = vi.fn().mockRejectedValue(new Error('fail-B'));
    const loaderC = vi.fn().mockResolvedValue('from-C');

    const result = await chain.load([loaderA, loaderB, loaderC]);

    expect(result).toBe('from-C');
  });

  it('re-throws the last error when all loaders fail', async () => {
    const chain = new FallbackChain();
    const loaderA = vi.fn().mockRejectedValue(new Error('fail-A'));
    const loaderB = vi.fn().mockRejectedValue(new Error('fail-B'));

    await expect(chain.load([loaderA, loaderB])).rejects.toThrow('fail-B');
  });
});
