// Browser-safe entry. Contains ONLY runtime decorators + types.
// The scanner, generator and CLI live in separate entries (./scanner)
// because they import Node-only modules (fs, path, typescript) and would break
// browser bundlers that try to resolve those specifiers.
export { NexusRemote, getNexusRemoteMetadata } from './decorator.js';
export { NexusComponent, getNexusComponentMetadata } from './component-decorator.js';
export type {
  NexusRemoteOptions,
  NexusComponentOptions,
  NexusInputSpec,
  NexusInputType,
} from './types.js';
