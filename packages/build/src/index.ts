// Browser-safe entry. Contains ONLY the runtime decorator + types.
// The scanner, generator and CLI live in separate entries (./scanner, ./generator)
// because they import Node-only modules (fs, path, typescript) and would break
// browser bundlers that try to resolve those specifiers.
export { NexusRemote, getNexusRemoteMetadata } from './decorator.js';
export type { NexusRemoteOptions } from './types.js';
