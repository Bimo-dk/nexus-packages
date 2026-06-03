import type { RemoteHealthStatus } from '@bimo-dk/nexus-core';

/**
 * Runtime config injected at container start via /assets/config.json.
 * Both remotes and hosts read this — fields are optional so callers can
 * supply sane defaults during dev (e.g. http://localhost:3000).
 */
export interface NexusRuntimeConfig {
  /** Registry base URL — e.g. 'http://localhost:3000' or '/api'. */
  registryUrl: string;
  /** Token sent as X-Nexus-Token header on registry calls. */
  nexusToken: string;
  /** Path the runtime config JSON is fetched from. Default '/assets/config.json'. */
  configAssetPath?: string;
  /** Override the public URL this remote announces (auto-derived from window.location if omitted). */
  publicUrl?: string;
  /** Static backup JSON for host fallback chain. Default '/assets/registry-backup/remotes.json'. */
  staticBackupUrl?: string;
}

/**
 * Per-remote registration config. Most fields are inferred — at minimum you
 * pass `entry` (the component class annotated with @NexusRemote) and the
 * provider derives the rest from the decorator metadata + window.location.
 */
export interface NexusRemoteConfig {
  /** The entry component class (used to read @NexusRemote metadata). */
  entry: object;
  /**
   * Explicit name override. Default: from @NexusRemote metadata, then package.json#name.
   */
  name?: string;
  /** Explicit URL override. Default: derived from window.location. */
  url?: string;
  /** Explicit route path. Default: from @NexusRemote metadata or kebab-cased name. */
  routePath?: string;
  /** Exposed module path. Default: from @NexusRemote metadata or './RemoteEntry'. */
  exposedModule?: string;
  /** If false, registration is skipped (useful for standalone dev). Default true. */
  selfRegister?: boolean;
}

/**
 * Host config. Hosts auto-load remotes from registry, register routes, and
 * react to WebSocket broadcasts. The only thing they need is the runtime config.
 */
export interface NexusHostConfig {
  /** If false, WebSocket connection is skipped (poll-only mode). Default true. */
  websocket?: boolean;
  /** Health-check interval in ms. Default 30000. */
  healthIntervalMs?: number;
}

/** Subset of remote-config that hosts care about for dynamic loading. */
export interface LoadedRemote {
  name: string;
  url: string;
  exposedModule: string;
  routePath: string;
  enabled: boolean;
  healthStatus?: RemoteHealthStatus;
}
