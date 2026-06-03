// Providers
export { provideNexusConfig } from './providers/provide-nexus-config.js';
export {
  provideNexusRemote,
  type NexusRemoteProviderOptions,
} from './providers/provide-nexus-remote.js';
export {
  provideNexusHost,
  type NexusHostProviderOptions,
} from './providers/provide-nexus-host.js';

// Tokens
export { NEXUS_CONFIG } from './tokens.js';

// Services (for advanced use — most consumers should use the providers)
export { SelfRegisterService } from './self-register.service.js';
export { DynamicNexusService } from './host/dynamic-nexus.service.js';
export { RegistryService } from './host/registry.service.js';
export { RegistryWebSocketService } from './host/registry-websocket.service.js';

// Interceptors (for advanced wiring)
export { correlationIdInterceptor } from './interceptors/correlation-id.interceptor.js';
export { nexusAuthInterceptor } from './interceptors/nexus-auth.interceptor.js';

// Utilities
export { loadRuntimeConfig } from './config-loader.js';
export { readRemoteMetadata, type RemoteDecoratorMeta } from './decorator-meta.js';
export { deriveRouteFromName } from './route-utils.js';

// Types
export type {
  NexusRuntimeConfig,
  NexusRemoteConfig,
  NexusHostConfig,
  LoadedRemote,
} from './types.js';
