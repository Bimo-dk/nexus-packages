import { useContext, useState, useEffect } from 'react';
import type { RemoteConfig } from '@bimo-dk/nexus-core';
import { SelfRegistrationService, NexusLoader, type RegisterOptions } from '@bimo-dk/nexus-runtime-core';
import { NexusContext } from './context.js';

function useNexusContext() {
  const ctx = useContext(NexusContext);
  if (!ctx) throw new Error('useNexusHost: must be used inside <NexusProvider>');
  return ctx;
}

export interface NexusHostState {
  loadedRemotes: RemoteConfig[];
  failedRemotes: Map<string, string>;
  registryOnline: boolean;
}

export function useNexusHost(): NexusHostState {
  const { loadedRemotes, failedRemotes, registryOnline } = useNexusContext();
  return { loadedRemotes, failedRemotes, registryOnline };
}

export function useNexusRemote(): { register: (options: RegisterOptions) => Promise<void> } {
  const svc = new SelfRegistrationService();
  return { register: (options) => svc.register(options) };
}

type ComponentState<T> = T | null | Error;

export function useNexusComponent<T = unknown>(remote: string, expose: string): ComponentState<T> {
  const [state, setState] = useState<ComponentState<T>>(null);

  useEffect(() => {
    const nexusLoader = new NexusLoader();
    setState(null);
    nexusLoader.loadRemoteModule(remote, expose)
      .then((mod) => {
        const m = mod as Record<string, unknown>;
        const comp = (m['default'] ?? m[Object.keys(m)[0]]) as T;
        setState(comp);
      })
      .catch((err) => setState(err instanceof Error ? err : new Error(String(err))));
  }, [remote, expose]);

  return state;
}
