import { reactive, type App } from 'vue';
import { RegistryClient } from '@bimo-dk/nexus-client';
import { RegistryWebSocket } from '@bimo-dk/nexus-client';
import type { RemoteConfig } from '@bimo-dk/nexus-core';

export const NEXUS_PLUGIN_KEY = Symbol('nexus');

export interface NexusPluginOptions {
  registryUrl: string;
  token: string;
  staticBackupUrl?: string;
}

export interface NexusPluginState {
  loadedRemotes: RemoteConfig[];
  failedRemotes: Map<string, string>;
  registryOnline: boolean;
  client: RegistryClient;
}

export interface NexusPlugin {
  install(app: App): void;
}

export function createNexusPlugin(options: NexusPluginOptions): NexusPlugin {
  if (!options.registryUrl) throw new Error('createNexusPlugin: registryUrl is required');
  if (!options.token) throw new Error('createNexusPlugin: token is required');

  const state = reactive<NexusPluginState>({
    loadedRemotes: [],
    failedRemotes: new Map(),
    registryOnline: false,
    client: new RegistryClient({ registryUrl: options.registryUrl, token: options.token }),
  });

  const ws = new RegistryWebSocket({ registryUrl: options.registryUrl, token: options.token });

  async function syncRemotes(remotes: RemoteConfig[]): Promise<void> {
    state.loadedRemotes = remotes.filter((r) => r.enabled);
    state.registryOnline = true;
  }

  ws.onMessage((msg) => {
    if (msg.type === 'connected') {
      void syncRemotes(msg.remotes);
    } else if (msg.type === 'registry_updated') {
      void syncRemotes(msg.remotes);
    }
  });

  async function initialize(): Promise<void> {
    try {
      const remotes = await state.client.getRemotes();
      await syncRemotes(remotes);
    } catch {
      state.registryOnline = false;
      if (options.staticBackupUrl) {
        try {
          const res = await fetch(options.staticBackupUrl);
          const backup = (await res.json()) as { remotes: RemoteConfig[] };
          state.loadedRemotes = backup.remotes.filter((r) => r.enabled);
        } catch { /* no backup */ }
      }
    }
    ws.connect();
  }

  return {
    install(app: App): void {
      app.provide(NEXUS_PLUGIN_KEY, state);
      void initialize();
    },
  };
}
