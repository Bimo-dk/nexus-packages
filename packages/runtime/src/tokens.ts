import { InjectionToken } from '@angular/core';
import type { NexusRuntimeConfig } from './types';

/** Effective runtime config, populated by provideNexusConfig at bootstrap. */
export const NEXUS_CONFIG = new InjectionToken<NexusRuntimeConfig>('NEXUS_CONFIG');
