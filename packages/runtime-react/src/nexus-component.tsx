import React, {
  lazy,
  Suspense,
  type ComponentType,
  type ReactNode,
} from 'react';
import { NexusLoader } from '@bimo-dk/nexus-runtime-core';

const loaderInstance = new NexusLoader();

class ComponentErrorBoundary extends React.Component<
  { fallback: ReactNode; children: ReactNode },
  { hasError: boolean; message: string }
> {
  constructor(props: { fallback: ReactNode; children: ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: unknown): { hasError: boolean; message: string } {
    return { hasError: true, message: error instanceof Error ? error.message : String(error) };
  }

  render(): ReactNode {
    if (this.state.hasError) return this.props.fallback ?? null;
    return this.props.children;
  }
}

export interface NexusComponentProps {
  remote: string;
  expose: string;
  inputs?: Record<string, unknown>;
  loadingFallback?: ReactNode;
  errorFallback?: ReactNode;
}

/**
 * Renders a federated component by remote name and expose string.
 * Uses React.lazy + Suspense internally. Works for React remotes, and
 * Vue/Angular remotes mounted as custom elements.
 */
export function NexusComponent({
  remote,
  expose,
  inputs = {},
  loadingFallback = null,
  errorFallback = null,
}: NexusComponentProps): React.ReactElement {
  const LazyComp = React.useMemo(
    () =>
      lazy(() =>
        loaderInstance.loadRemoteModule(remote, expose).then((mod) => {
          const m = mod as Record<string, unknown>;
          const Comp = (m['default'] ?? m[Object.keys(m)[0]]) as ComponentType<Record<string, unknown>>;
          return { default: Comp };
        }),
      ),
    // Intentional: recreate lazy component when remote/expose identity changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [remote, expose],
  );

  return React.createElement(
    ComponentErrorBoundary,
    { fallback: errorFallback },
    React.createElement(
      Suspense,
      { fallback: loadingFallback },
      React.createElement(LazyComp, inputs),
    ),
  );
}
