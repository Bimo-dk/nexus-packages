import { inject, computed, type Ref, type ComputedRef } from 'vue';
import type { RemoteConfig } from '@bimo-dk/nexus-core';
import { SelfRegistrationService, type RegisterOptions } from '@bimo-dk/nexus-runtime-core';
import { NEXUS_PLUGIN_KEY, type NexusPluginState } from './plugin.js';

function useNexusState(): NexusPluginState {
  const state = inject<NexusPluginState>(NEXUS_PLUGIN_KEY);
  if (!state) throw new Error('useNexusHost: must be used inside a component with createNexusPlugin installed');
  return state;
}

export interface NexusHostComposable {
  loadedRemotes: Ref<RemoteConfig[]>;
  failedRemotes: Ref<Map<string, string>>;
  registryOnline: ComputedRef<boolean>;
}

export function useNexusHost(): NexusHostComposable {
  const state = useNexusState();
  return {
    get loadedRemotes() { return { value: state.loadedRemotes } as Ref<RemoteConfig[]>; },
    get failedRemotes() { return { value: state.failedRemotes } as Ref<Map<string, string>>; },
    registryOnline: computed(() => state.registryOnline),
  };
}

export function useNexusRemote(): { register: (options: RegisterOptions) => Promise<void> } {
  const svc = new SelfRegistrationService();
  return {
    register: (options: RegisterOptions) => svc.register(options),
  };
}
