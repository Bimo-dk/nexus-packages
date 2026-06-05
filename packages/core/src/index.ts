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
} from './types.js';

export { NEXUS_DEFAULTS } from './constants.js';
export type { NexusDefaults } from './constants.js';

export { RegistryError, NexusError } from './errors.js';

export {
  isValidRemoteName,
  isValidRoutePath,
  isValidUrl,
  isValidUrlOrPath,
  isValidDomain,
  isValidVisibility,
  isValidFramework,
  isValidHostName,
  isValidGateName,
} from './validators.js';
