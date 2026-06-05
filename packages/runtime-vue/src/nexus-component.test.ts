import { describe, it, expect, vi, beforeEach } from 'vitest';

// NexusLoader is mocked at module level
const mockLoadRemoteModule = vi.fn();
vi.mock('@bimo-dk/nexus-runtime-core', () => ({
  NexusLoader: class {
    loadRemoteModule = mockLoadRemoteModule;
    clearCache = vi.fn();
  },
  SelfRegistrationService: class {
    register = vi.fn();
  },
}));

import { defineComponent, h } from 'vue';
import { mount } from '@vue/test-utils';
import { NexusComponent } from './nexus-component.js';

const FakeComp = defineComponent({ render: () => h('div', 'loaded') });

describe('NexusComponent', () => {
  beforeEach(() => {
    mockLoadRemoteModule.mockReset();
  });

  it('shows the loading slot while the remote is loading', async () => {
    let resolveLoad!: (v: unknown) => void;
    mockLoadRemoteModule.mockReturnValue(new Promise((r) => { resolveLoad = r; }));

    const wrapper = mount(NexusComponent, {
      props: { remote: 'checkout', expose: './Page' },
      slots: { default: '<span>loading…</span>' },
    });

    expect(wrapper.html()).toContain('loading…');
    resolveLoad({ default: FakeComp });
  });

  it('shows the error slot when NexusLoader throws', async () => {
    mockLoadRemoteModule.mockRejectedValue(new Error('network error'));

    const wrapper = mount(NexusComponent, {
      props: { remote: 'missing', expose: './Missing' },
      slots: { error: ({ error }: { error: string }) => h('div', `Error: ${error}`) },
    });

    await new Promise((r) => setTimeout(r, 20));
    expect(wrapper.html()).toContain('Error:');
  });
});
