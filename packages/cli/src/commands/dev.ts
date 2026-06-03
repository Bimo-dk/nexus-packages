import { promises as fs } from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import chalk from 'chalk';

export async function dev(): Promise<void> {
  const cwd = process.cwd();
  const configPath = path.join(cwd, 'nexus.dev.json');

  try {
    await fs.access(configPath);
  } catch {
    console.error(chalk.red(`✗ ${configPath} not found`));
    console.error(chalk.dim('  Create nexus.dev.json with proxyPort, local, and remote.url fields.'));
    process.exit(1);
  }

  console.log(chalk.cyan(`→ Starting Bimo-Nexus dev proxy using ${path.basename(configPath)}`));
  console.log('');

  // Try to find dev-proxy from a couple of well-known locations:
  // 1. ./node_modules/@bimo-nexus/dev-proxy/dist/proxy-server.cjs (future package)
  // 2. ../../dev-tools/proxy-server.ts (when running inside nexus monorepo)
  // 3. Fallback: instruct user to install nexus-proxy separately.

  const candidates = [
    path.join(cwd, 'node_modules', '@bimo-nexus', 'dev-proxy', 'dist', 'proxy-server.cjs'),
    path.join(cwd, 'dev-tools', 'proxy-server.ts'),
  ];

  for (const candidate of candidates) {
    try {
      await fs.access(candidate);
      const isTs = candidate.endsWith('.ts');
      const cmd = isTs ? 'npx' : 'node';
      const args = isTs ? ['tsx', candidate] : [candidate];
      const proc = spawn(cmd, args, { stdio: 'inherit', cwd, shell: process.platform === 'win32' });
      proc.on('exit', (code) => process.exit(code ?? 0));
      return;
    } catch {
      /* try next */
    }
  }

  console.error(chalk.red('✗ Could not locate dev-proxy server.'));
  console.error(chalk.dim('  Install @bimo-nexus/dev-proxy or place dev-tools/proxy-server.ts in cwd.'));
  process.exit(1);
}
