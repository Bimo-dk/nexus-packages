import { RegistryClient, type RemoteConfig, type RemoteHealthStatus } from '@bimo-nexus/client';
import chalk from 'chalk';

export async function status(): Promise<void> {
  const registryUrl = process.env.REGISTRY_URL ?? 'http://localhost:3000';
  const token = process.env.BIMO_TOKEN;
  if (!token) {
    console.error(chalk.red('✗ BIMO_TOKEN environment variable is required'));
    process.exit(1);
  }

  const client = new RegistryClient({ registryUrl, token });

  let remotes: RemoteConfig[];
  try {
    remotes = await client.getRemotes();
  } catch (err) {
    console.error(chalk.red(`✗ Failed to fetch remotes: ${err instanceof Error ? err.message : err}`));
    process.exit(1);
  }

  if (remotes.length === 0) {
    console.log(chalk.dim('(no remotes registered)'));
    return;
  }

  const cols = {
    name: Math.max(4, ...remotes.map((r) => r.name.length)),
    route: Math.max(5, ...remotes.map((r) => r.routePath.length + 1)),
    status: 8,
    enabled: 7,
  };
  const sep = '─'.repeat(cols.name + cols.route + cols.status + cols.enabled + 12);

  console.log(chalk.bold(
    `${pad('NAME', cols.name)}  ${pad('ROUTE', cols.route)}  ${pad('STATUS', cols.status)}  ${pad('ENABLED', cols.enabled)}`,
  ));
  console.log(sep);
  for (const r of remotes) {
    const status = colorStatus(r.healthStatus);
    const enabled = r.enabled ? chalk.green('yes') : chalk.dim('no');
    console.log(
      `${pad(r.name, cols.name)}  ${pad('/' + r.routePath, cols.route)}  ${pad(status, cols.status + 10)}  ${enabled}`,
    );
  }
  console.log('');
  console.log(chalk.dim(`Total: ${remotes.length}  •  Enabled: ${remotes.filter((r) => r.enabled).length}`));
}

function pad(s: string, n: number): string {
  if (s.length >= n) return s;
  return s + ' '.repeat(n - s.length);
}

function colorStatus(s?: RemoteHealthStatus): string {
  switch (s) {
    case 'healthy': return chalk.green('healthy');
    case 'degraded': return chalk.yellow('degraded');
    case 'down': return chalk.red('down');
    default: return chalk.dim('unknown');
  }
}
