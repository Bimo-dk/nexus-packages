import {
  defineComponent,
  defineAsyncComponent,
  h,
  ref,
  watch,
  type PropType,
  type Component,
} from 'vue';
import { NexusLoader } from '@bimo-dk/nexus-runtime-core';

const loader = new NexusLoader();

/**
 * Renders a federated component identified by `remote` and `expose`.
 *
 * Slots:
 *   - default (no name) — shown while loading
 *   - error — shown when loading fails; receives { error: string } scoped slot prop
 *
 * Works for Vue remotes and Web Components (Angular/React mounted as custom elements).
 */
export const NexusComponent = defineComponent({
  name: 'NexusComponent',
  props: {
    remote: { type: String as PropType<string>, required: true },
    expose: { type: String as PropType<string>, required: true },
    inputs: { type: Object as PropType<Record<string, unknown>>, default: () => ({}) },
  },
  setup(props, { slots }) {
    const error = ref<string | null>(null);
    const AsyncComp = ref<Component | null>(null);

    function loadComponent(): void {
      error.value = null;
      AsyncComp.value = defineAsyncComponent({
        loader: () =>
          loader.loadRemoteModule(props.remote, props.expose).then((mod) => {
            const m = mod as Record<string, unknown>;
            return (m['default'] ?? m[Object.keys(m)[0]]) as Component;
          }),
        delay: 0,
        loadingComponent: slots.default
          ? defineComponent({ render: () => slots.default?.() ?? null })
          : undefined,
        errorComponent: defineComponent({
          setup: (_, { slots: s }) => () =>
            s.default?.({ error: error.value }) ?? null,
        }),
        onError(err) {
          error.value = err instanceof Error ? err.message : String(err);
        },
      });
    }

    watch(() => [props.remote, props.expose], loadComponent, { immediate: true });

    return () => {
      if (error.value && slots.error) {
        return slots.error({ error: error.value });
      }
      if (!AsyncComp.value) {
        return slots.default?.() ?? null;
      }
      return h(AsyncComp.value, props.inputs);
    };
  },
});
