/**
 * Angular-specifikke test helpers. Importér fra '@bimo-dk/nexus-testing/angular'.
 * Peer-dep på @angular/core er kun nødvendig hvis du bruger denne entry.
 */
import type { Provider, Type } from '@angular/core';
import type { RegistryClient } from '@bimo-dk/nexus-client';
import type { RemoteConfig } from '@bimo-dk/nexus-core';
import { createMockRegistryClient } from './mock-registry-client.js';

/**
 * Returnerer en Angular Provider der binder en token til en mock RegistryClient.
 *
 * Brug:
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
