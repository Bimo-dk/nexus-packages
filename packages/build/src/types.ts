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
  /**
   * Shared dependencies block written into federation.config.json.
   * If the file already exists with a `shared` block, its existing value is preserved unless overridden here.
   */
  shared?: Record<string, unknown>;
  /** If true, do not write the file; return what would be written. Default false. */
  dryRun?: boolean;
}
