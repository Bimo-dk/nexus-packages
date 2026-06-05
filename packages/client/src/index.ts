export { RegistryClient } from './registry-client.js';
export type { RegistryClientOptions, GetRemotesOptions, ProtectionStatus } from './registry-client.js';

export { RegistryWebSocket } from './registry-websocket.js';
export type { RegistryWebSocketOptions } from './registry-websocket.js';

export { getSessionId, nextRequestId } from './correlation.js';

// Re-export of core types so consumers only need to import from @bimo-dk/nexus-client
export type {
  RemoteHealthStatus,
  RemoteVisibility,
  HostFramework,
  RemoteConfig,
  HostRemoteConfig,
  HostConfig,
  GateConfig,
  ProtectionConfig,
  GatewayConfig,
  ReconnectPolicy,
  RegistryResponse,
  HealthStatus,
  WebSocketMessage,
  AddRemoteRequest,
  UpdateRemoteRequest,
  CreateHostDto,
  UpdateHostDto,
  CreateGateDto,
  UpdateGateDto,
  NexusDefaults,
} from '@bimo-dk/nexus-core';
export {
  NEXUS_DEFAULTS,
  RegistryError,
  NexusError,
  isValidRemoteName,
  isValidRoutePath,
  isValidUrl,
  isValidDomain,
  isValidVisibility,
  isValidFramework,
  isValidHostName,
  isValidGateName,
} from '@bimo-dk/nexus-core';
