import React, { lazy, Suspense, type ReactElement } from 'react';
import { NexusLoader } from '@bimo-dk/nexus-runtime-core';

const loaderInstance = new NexusLoader();

/**
 * Returns a React element suitable for use as a React Router v6 route element.
 * The component is loaded lazily via NexusLoader.
 *
 * Example:
 *   <Route path="/checkout" element={createNexusRoute('checkout', './CheckoutPage')} />
 */
export function createNexusRoute(remote: string, expose: string): ReactElement {
  const LazyComp = lazy(() =>
    loaderInstance.loadRemoteModule(remote, expose).then((mod) => {
      const m = mod as Record<string, unknown>;
      const Comp = (m['default'] ?? m[Object.keys(m)[0]]) as React.ComponentType;
      return { default: Comp };
    }),
  );

  return React.createElement(Suspense, { fallback: null }, React.createElement(LazyComp));
}
