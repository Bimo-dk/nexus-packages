/**
 * Angular-specific test helpers. Import from '@bimo-dk/nexus-testing/angular'.
 * Peer dep on @angular/core is only required if you use this entry.
 */
import type { Provider, Type } from '@angular/core';
import type { RegistryClient } from '@bimo-dk/nexus-client';
import type { RemoteConfig } from '@bimo-dk/nexus-core';
import { createMockRegistryClient } from './mock-registry-client.js';

/**
 * Returns an Angular Provider that binds a token to a mock RegistryClient.
 *
 * Usage:
 *   import { provideMockRegistry } from '@bimo-dk/nexus-testing/angular';
 *   import { RegistryClient } from '@bimo-dk/nexus-client';
 *
 *   await TestBed.configureTestingModule({
 *     providers: [provideMockRegistry(RegistryClient, [mockRemoteConfig()])],
 *   }).compileComponents();
 */
export function provideMockRegistry(
  token: Type<RegistryClient>,
  initialRemotes: RemoteConfig[] = [],
): Provider {
  return {
    provide: token,
    useValue: createMockRegistryClient(initialRemotes),
  };
}
