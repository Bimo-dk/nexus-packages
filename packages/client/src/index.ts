export { RegistryClient } from './registry-client.js';
export type { RegistryClientOptions } from './registry-client.js';

export { RegistryWebSocket } from './registry-websocket.js';
export type { RegistryWebSocketOptions } from './registry-websocket.js';

export { getSessionId, nextRequestId } from './correlation.js';

// Re-export af core typer så konsumenter kun behøver importere fra @bimo-nexus/client
export type {
  RemoteHealthStatus,
  RemoteConfig,
  RegistryResponse,
  HealthStatus,
  WebSocketMessage,
  AddRemoteRequest,
  UpdateRemoteRequest,
  NexusDefaults,
} from '@bimo-nexus/core';
export { NEXUS_DEFAULTS, RegistryError, isValidRemoteName, isValidRoutePath, isValidUrl } from '@bimo-nexus/core';
