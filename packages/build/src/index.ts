export { NexusRemote, getNexusRemoteMetadata } from './decorator.js';
export { scanForRemotes } from './scanner.js';
export { writeFederationConfig, type GeneratedConfig } from './generator.js';
export {
  resolveName,
  toCamelCase,
  toKebabCase,
  stripClassSuffix,
  defaultSharedBlock,
} from './naming.js';
export type {
  NexusRemoteOptions,
  DiscoveredRemote,
  ScanOptions,
  GenerateOptions,
} from './types.js';
