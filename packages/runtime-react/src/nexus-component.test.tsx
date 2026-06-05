/// <reference types="vitest/globals" />
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { NexusComponent } from './nexus-component.js';

const mockLoadRemoteModule = vi.hoisted(() => vi.fn());
vi.mock('@bimo-dk/nexus-runtime-core', () => ({
  NexusLoader: class {
    loadRemoteModule = mockLoadRemoteModule;
    clearCache = vi.fn();
  },
  SelfRegistrationService: class {
    register = vi.fn();
  },
}));

describe('NexusComponent (React)', () => {
  beforeEach(() => {
    mockLoadRemoteModule.mockReset();
  });

  it('renders the loading fallback while lazy loading', () => {
    mockLoadRemoteModule.mockReturnValue(new Promise(() => {}));

    const { getByText } = render(
      React.createElement(NexusComponent, {
        remote: 'checkout',
        expose: './Page',
        loadingFallback: React.createElement('span', null, 'Loading...'),
      }),
    );

    expect(getByText('Loading...')).toBeTruthy();
  });

  it('renders the loaded component when resolved', async () => {
    const FakeComp = () => React.createElement('div', null, 'component loaded');
    mockLoadRemoteModule.mockResolvedValue({ default: FakeComp });

    const { getByText } = render(
      React.createElement(NexusComponent, {
        remote: 'checkout',
        expose: './Page',
        loadingFallback: React.createElement('span', null, 'Loading...'),
      }),
    );

    await waitFor(() => expect(getByText('component loaded')).toBeTruthy());
  });
});
