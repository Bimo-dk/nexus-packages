/// <reference types="vitest/globals" />
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { NexusProvider } from './provider.js';

vi.mock('@bimo-dk/nexus-client', () => ({
  RegistryClient: class {
    getRemotes = vi.fn().mockResolvedValue([]);
  },
  RegistryWebSocket: class {
    onMessage = vi.fn().mockReturnValue(() => {});
    connect = vi.fn();
    disconnect = vi.fn();
  },
}));

describe('NexusProvider', () => {
  it('throws when registryUrl is not provided', () => {
    expect(() =>
      render(
        React.createElement(
          NexusProvider,
          { registryUrl: '', token: 'tok', children: null },
        ),
      ),
    ).toThrow('NexusProvider: registryUrl is required');
  });

  it('renders children', () => {
    const { getByText } = render(
      React.createElement(
        NexusProvider,
        { registryUrl: 'http://localhost:8670', token: 'tok', children: React.createElement('span', null, 'child') },
      ),
    );
    expect(getByText('child')).toBeTruthy();
  });
});
