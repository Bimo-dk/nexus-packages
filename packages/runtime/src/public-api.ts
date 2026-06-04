// Providers
export { provideNexusConfig } from './providers/provide-nexus-config';
export {
  provideNexusRemote,
  type NexusRemoteProviderOptions,
} from './providers/provide-nexus-remote';
export {
  provideNexusHost,
  type NexusHostProviderOptions,
} from './providers/provide-nexus-host';

// Tokens
export { NEXUS_CONFIG } from './tokens';

// Services
export { SelfRegisterService } from './self-register.service';
export { DynamicNexusService } from './host/dynamic-nexus.service';
export { HealthService } from './host/health.service';
export { RegistryService } from './host/registry.service';
export { RegistryWebSocketService } from './host/registry-websocket.service';
export { ComponentLoaderService } from './host/component-loader.service';
export {
  CatalogService,
  type CatalogEntry,
  type NexusInputSpec as CatalogInputSpec,
  type NexusInputType as CatalogInputType,
} from './host/catalog.service';

// Components (drop-in tag)
export { NexusComponent } from './host/nexus-component.component';

// Route helpers
export { nexusRoute, nexusRoutes, loadFromRemote, type NexusRouteSpec } from './host/nexus-route';

// Interceptors (for advanced wiring)
export { correlationIdInterceptor } from './interceptors/correlation-id.interceptor';
export { nexusAuthInterceptor } from './interceptors/nexus-auth.interceptor';
export { bearerTokenInterceptor } from './auth/bearer-token.interceptor';

// Auth
export { USER_CONTEXT, userHasAnyRole, userHasAllRoles, setUserSignal, getUserSignal, type UserContext } from './auth/user-context';
export { NEXUS_AUTH, type NexusAuthService } from './auth/auth.service';
export { requireRole, requireAuth } from './auth/role-guard';

// Utilities
export { loadRuntimeConfig } from './config-loader';
export { readRemoteMetadata, type RemoteDecoratorMeta } from './decorator-meta';
export { deriveRouteFromName } from './route-utils';

// Types
export type {
  NexusRuntimeConfig,
  NexusRemoteConfig,
  NexusHostConfig,
  LoadedRemote,
} from './types';
