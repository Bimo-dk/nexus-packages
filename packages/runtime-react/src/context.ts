import { createContext } from 'react';
import type { RemoteConfig } from '@bimo-dk/nexus-core';
import type { RegistryClient } from '@bimo-dk/nexus-client';

export interface NexusContextValue {
  loadedRemotes: RemoteConfig[];
  failedRemotes: Map<string, string>;
  registryOnline: boolean;
  client: RegistryClient;
}

export const NexusContext = createContext<NexusContextValue | null>(null);
