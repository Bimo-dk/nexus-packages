import { Command } from 'commander';
import { config as loadEnv } from 'dotenv';
import { createRequire } from 'node:module';
import { generateRemote } from './commands/generate.js';
import { publish } from './commands/publish.js';
import { status } from './commands/status.js';
import { health } from './commands/health.js';
import { devCommand } from './commands/dev/index.js';
import { devStatusCommand } from './commands/dev/status.js';

// Load .env if it exists in cwd
loadEnv({ path: '.env', quiet: true });

const require = createRequire(import.meta.url);
const pkg = require('../package.json') as { version: string };

const program = new Command();
program
  .name('bnx')
  .description('Bimo-Nexus CLI — generate, publish, status, health, dev')
  .version(pkg.version);

const generate = program.command('generate').description('Scaffold a new Bimo-Nexus artifact');
generate
  .command('remote')
  .description('Scaffold a new remote app from nexus-remote-templat')
  .option('-n, --name <name>', 'Remote name (camelCase)')
  .option('-r, --route <route>', 'Route path (kebab-case)')
  .action(generateRemote);

program
  .command('publish')
  .description('Publish the current remote to the registry (reads federation.config.json)')
  .action(publish);

program
  .command('status')
  .description('Print a formatted table of all registered remotes')
  .action(status);

program
  .command('health')
  .description('Health check all remotes and print response times')
  .action(health);

const dev = program
  .command('dev')
  .description('Start local dev environment: proxy + autostart configured remotes')
  .option('-c, --config <file>', 'Path to nexus.config.json (default: search cwd)')
  .option('-p, --port <port>', 'Override proxy port', (v: string) => Number(v))
  .option('--no-open', 'Do not open browser')
  .option('--no-autostart', 'Do not autostart npm dev-servers for remotes')
  .action(devCommand);
dev
  .command('status')
  .description('Show which configured remotes are running locally')
  .option('-c, --config <file>', 'Path to nexus.config.json (default: search cwd)')
  .action(devStatusCommand);

program.parseAsync(process.argv).catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
