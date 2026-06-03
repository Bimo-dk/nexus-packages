import { Command } from 'commander';
import { config as loadEnv } from 'dotenv';
import { createRequire } from 'node:module';
import { generateRemote } from './commands/generate.js';
import { publish } from './commands/publish.js';
import { status } from './commands/status.js';
import { health } from './commands/health.js';
import { dev } from './commands/dev.js';

// Load .env hvis den findes i cwd
loadEnv({ path: '.env', quiet: true });

const require = createRequire(import.meta.url);
const pkg = require('../package.json') as { version: string };

const program = new Command();
program
  .name('bnx')
  .description('Bimo-Nexus CLI — generate, publish, status, health, dev')
  .version(pkg.version);

const generate = program.command('generate').description('Scaffold ny Bimo-Nexus artefakt');
generate
  .command('remote')
  .description('Scaffold en ny remote-app fra remote-templat')
  .option('-n, --name <name>', 'Remote name (camelCase)')
  .option('-r, --route <route>', 'Route path (kebab-case)')
  .action(generateRemote);

program
  .command('publish')
  .description('Publish current remote til registry (læser federation.config.json)')
  .action(publish);

program
  .command('status')
  .description('Print formateret tabel over alle registrerede remotes')
  .action(status);

program
  .command('health')
  .description('Health-check alle remotes og print responsetider')
  .action(health);

program
  .command('dev')
  .description('Start nexus dev-proxy (læser nexus.dev.json fra cwd)')
  .action(dev);

program.parseAsync(process.argv).catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
