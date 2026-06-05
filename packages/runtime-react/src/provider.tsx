import React, { useState, useEffect, useRef, type ReactNode } from 'react';
import { RegistryClient, RegistryWebSocket } from '@bimo-dk/nexus-client';
import type { RemoteConfig } from '@bimo-dk/nexus-core';
import { NexusContext, type NexusContextValue } from './context.js';

export interface NexusProviderProps {
  registryUrl: string;
  token: string;
  staticBackupUrl?: string;
  children: ReactNode;
}

export function NexusProvider({ registryUrl, token, staticBackupUrl, children }: NexusProviderProps): React.ReactElement {
  if (!registryUrl) throw new Error('NexusProvider: registryUrl is required');

  const clientRef = useRef<RegistryClient | null>(null);
  if (!clientRef.current) {
    clientRef.current = new RegistryClient({ registryUrl, token });
  }

  const wsRef = useRef<RegistryWebSocket | null>(null);
  if (!wsRef.current) {
    wsRef.current = new RegistryWebSocket({ registryUrl, token });
  }

  const [loadedRemotes, setLoadedRemotes] = useState<RemoteConfig[]>([]);
  const [failedRemotes] = useState<Map<string, string>>(new Map());
  const [registryOnline, setRegistryOnline] = useState(false);

  useEffect(() => {
    const client = clientRef.current!;
    const ws = wsRef.current!;

    function syncRemotes(remotes: RemoteConfig[]): void {
      setLoadedRemotes(remotes.filter((r) => r.enabled));
      setRegistryOnline(true);
    }

    const unsub = ws.onMessage((msg) => {
      if (msg.type === 'connected') syncRemotes(msg.remotes);
      else if (msg.type === 'registry_updated') syncRemotes(msg.remotes);
    });

    client.getRemotes()
      .then(syncRemotes)
      .catch(async () => {
        setRegistryOnline(false);
        if (staticBackupUrl) {
          try {
            const res = await fetch(staticBackupUrl);
            const backup = (await res.json()) as { remotes: RemoteConfig[] };
            setLoadedRemotes(backup.remotes.filter((r) => r.enabled));
          } catch { /* no backup */ }
        }
      });

    ws.connect();
    return () => {
      unsub();
      ws.disconnect();
    };
  }, [registryUrl, token, staticBackupUrl]);

  const value: NexusContextValue = {
    loadedRemotes,
    failedRemotes,
    registryOnline,
    client: clientRef.current!,
  };

  return React.createElement(NexusContext.Provider, { value }, children);
}
