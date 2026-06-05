import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NexusLoader } from './nexus-loader.js';

const mockLoad = vi.fn();

vi.mock('@angular-architects/native-federation', () => ({
  loadRemoteModule: mockLoad,
}));

describe('NexusLoader', () => {
  let loader: NexusLoader;

  beforeEach(() => {
    loader = new NexusLoader();
    loader.clearCache();
    mockLoad.mockReset();
  });

  it('calls loadRemoteModule once and caches the result', async () => {
    mockLoad.mockResolvedValue({ default: 'ComponentA' });

    const first = await loader.loadRemoteModule('remoteA', './AppModule');
    const second = await loader.loadRemoteModule('remoteA', './AppModule');

    expect(mockLoad).toHaveBeenCalledTimes(1);
    expect(first).toBe(second);
  });

  it('does not share cache across different remote+expose pairs', async () => {
    mockLoad.mockResolvedValue({});

    await loader.loadRemoteModule('remoteA', './Foo');
    await loader.loadRemoteModule('remoteA', './Bar');
    await loader.loadRemoteModule('remoteB', './Foo');

    expect(mockLoad).toHaveBeenCalledTimes(3);
  });

  it('removes failed loads from cache so next call retries', async () => {
    mockLoad.mockRejectedValueOnce(new Error('network timeout'));
    mockLoad.mockResolvedValueOnce({ default: 'recovered' });

    await expect(loader.loadRemoteModule('remoteA', './Mod')).rejects.toThrow('network timeout');
    const result = await loader.loadRemoteModule('remoteA', './Mod');
    expect(result).toEqual({ default: 'recovered' });
    expect(mockLoad).toHaveBeenCalledTimes(2);
  });
});
