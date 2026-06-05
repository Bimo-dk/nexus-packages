import type { GatewayConfig } from '@bimo-dk/nexus-core';

/**
 * Returns the parsed window.__NEXUS_GATEWAY_CONFIG__ as a GatewayConfig,
 * or null when the host is not running behind a Nexus gateway.
 */
export function useNexusGatewayConfig(): GatewayConfig | null {
  if (typeof window === 'undefined') return null;
  const gw = (window as unknown as { __NEXUS_GATEWAY_CONFIG__?: GatewayConfig }).__NEXUS_GATEWAY_CONFIG__;
  return gw ?? null;
}
