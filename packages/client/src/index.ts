export { RegistryClient } from './registry-client.js';
export type { RegistryClientOptions } from './registry-client.js';

export { RegistryWebSocket } from './registry-websocket.js';
export type { RegistryWebSocketOptions } from './registry-websocket.js';

export { getSessionId, nextRequestId } from './correlation.js';

// Re-export of core types so consumers only need to import from @bimo-dk/nexus-client
export type {
  RemoteHealthStatus,
  RemoteConfig,
  RegistryResponse,
  HealthStatus,
  WebSocketMessage,
  AddRemoteRequest,
  UpdateRemoteRequest,
  NexusDefaults,
} from '@bimo-dk/nexus-core';
export { NEXUS_DEFAULTS, RegistryError, isValidRemoteName, isValidRoutePath, isValidUrl } from '@bimo-dk/nexus-core';
