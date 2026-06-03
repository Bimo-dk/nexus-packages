import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import type { DiscoveredRemote, GenerateOptions } from './types.js';
import { defaultSharedBlock } from './naming.js';

export interface GeneratedConfig {
  name: string;
  exposes: Record<string, string>;
  shared: Record<string, unknown>;
  _generatedBy?: string;
}

/**
 * Write (or merge) federation.config.json from a list of discovered remotes.
 *
 * Conflict handling:
 *   - If multiple `@NexusRemote` decorators resolve to the same exposed-module path,
 *     it is an error (ambiguous federation entry).
 *   - The first discovered remote determines the package `name`. Subsequent ones
 *     must share the same name OR set `exposeAs` to something other than 'RemoteEntry'.
 *
 * Existing `shared` block in federation.config.json is preserved unless overridden.
 */
export async function writeFederationConfig(
  remotes: DiscoveredRemote[],
  projectRoot: string,
  options: GenerateOptions = {},
): Promise<{ written: boolean; path: string; config: GeneratedConfig }> {
  if (remotes.length === 0) {
    throw new Error('No @NexusRemote decorators found — nothing to write.');
  }

  const configPath = path.resolve(projectRoot, options.configPath ?? 'federation.config.json');

  const exposes: Record<string, string> = {};
  for (const r of remotes) {
    const key = `./${r.exposeAs}`;
    if (exposes[key] !== undefined && exposes[key] !== r.classFileRelative) {
      throw new Error(
        `Conflicting @NexusRemote exposures for "${key}":\n` +
          `  ${exposes[key]}\n` +
          `  ${r.classFileRelative}\n` +
          `Set { exposeAs: '...' } on one of them to disambiguate.`,
      );
    }
    exposes[key] = r.classFileRelative;
  }

  const primary = remotes[0];
  for (const r of remotes.slice(1)) {
    if (r.name !== primary.name && r.exposeAs === primary.exposeAs) {
      throw new Error(
        `Multiple @NexusRemote decorators in one package with different names ` +
          `("${primary.name}" vs "${r.name}") but the same exposeAs ("${r.exposeAs}"). ` +
          `Either align the names or set distinct exposeAs values.`,
      );
    }
  }

  const existing = await readExistingConfig(configPath);

  const shared = options.shared ?? (existing?.shared as Record<string, unknown> | undefined) ?? defaultSharedBlock();

  const config: GeneratedConfig = {
    name: primary.name,
    exposes,
    shared,
    _generatedBy: '@bimo-dk/nexus-build',
  };

  if (options.dryRun) {
    return { written: false, path: configPath, config };
  }

  const json = JSON.stringify(config, null, 2) + '\n';
  await fs.writeFile(configPath, json, 'utf8');
  return { written: true, path: configPath, config };
}

async function readExistingConfig(filePath: string): Promise<Record<string, unknown> | undefined> {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return undefined;
  }
}
