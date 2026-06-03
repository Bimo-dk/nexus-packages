export interface NexusRemoteOptions {
  /**
   * Remote name (camelCase). If omitted, inferred from:
   * 1. package.json#name (if it matches camelCase pattern), then
   * 2. the class name with any "Component"/"Entry" suffix stripped.
   */
  name?: string;

  /**
   * Route path (kebab-case) under the host shell.
   * If omitted, derived from `name` (camelCase -> kebab-case).
   */
  route?: string;

  /**
   * The module name exposed via Native Federation.
   * Default: `'RemoteEntry'` -> consumers load via `loadRemoteModule({ exposedModule: './RemoteEntry' })`.
   */
  exposeAs?: string;
}

export interface DiscoveredRemote {
  /** Resolved remote name (camelCase). */
  name: string;
  /** Resolved route path (kebab-case). */
  route: string;
  /** Exposed module suffix — '/RemoteEntry' becomes './RemoteEntry' in federation.config.json. */
  exposeAs: string;
  /** Class name as declared in source. */
  className: string;
  /** Absolute path to the file containing the class. */
  classFile: string;
  /** Path relative to the project root, with `./` prefix, suitable for `exposes` field. */
  classFileRelative: string;
  /** True if name was explicitly supplied on the decorator (not inferred). */
  nameExplicit: boolean;
  /** True if route was explicitly supplied on the decorator (not inferred). */
  routeExplicit: boolean;
  /** Optional @NexusComponent metadata, if present on the same class. */
  metadata?: NexusComponentOptions;
}

export interface ScanOptions {
  /** Project root (where package.json lives). Default: process.cwd(). */
  projectRoot?: string;
  /** Directory to scan for sources. Default: 'src'. */
  srcDir?: string;
  /** File extensions to include. Default: ['.ts']. */
  extensions?: string[];
  /** Override the inferred name when nothing else matches. */
  defaultName?: string;
}

export interface GenerateOptions {
  /** Path to federation.config.json (relative to project root). Default: 'federation.config.json'. */
  configPath?: string;
  /** Path to catalog.json (relative to project root). Default: 'public/catalog.json' so nginx serves it from /catalog.json. */
  catalogPath?: string;
  /**
   * Shared dependencies block written into federation.config.json.
   * If the file already exists with a `shared` block, its existing value is preserved unless overridden here.
   */
  shared?: Record<string, unknown>;
  /** If true, do not write the file; return what would be written. Default false. */
  dryRun?: boolean;
}

// ============================================================================
// @NexusComponent metadata — for catalog
// ============================================================================

export type NexusInputType = 'string' | 'number' | 'boolean' | 'object' | 'array';

export interface NexusInputSpec {
  type: NexusInputType;
  /** Default value (used by catalog UI when previewing). */
  default?: unknown;
  /** Human-readable description shown in catalog UI. */
  description?: string;
  /** If true, omitting this input is a hard error (only matters in catalog UX). */
  required?: boolean;
  /** Enum of allowed values, for string inputs. */
  enum?: string[];
}

export interface NexusComponentOptions {
  /** Display title in the catalog UI. */
  title: string;
  /** One-line description shown under the title. */
  description?: string;
  /** Grouping: 'data-display' | 'input' | 'navigation' | 'layout' | 'feedback' | custom. */
  category?: string;
  /** Free-form tags for filter/search. */
  tags?: string[];
  /** Material icon name or single emoji. */
  icon?: string;
  /** Schema of @Input() this component accepts. Keys are input names. */
  inputs?: Record<string, NexusInputSpec>;
  /** Whether the component is currently considered stable (false hides from default catalog view). */
  experimental?: boolean;
}

/**
 * One entry in catalog.json — a discovered component with its NexusComponent
 * metadata + the bits needed to find/load it.
 */
export interface CatalogEntry {
  remote: string;
  expose: string;
  className: string;
  title: string;
  description?: string;
  category?: string;
  tags: string[];
  icon?: string;
  inputs: Record<string, NexusInputSpec>;
  experimental: boolean;
}

export interface CatalogManifest {
  remote: string;
  generatedAt: string;
  entries: CatalogEntry[];
}
