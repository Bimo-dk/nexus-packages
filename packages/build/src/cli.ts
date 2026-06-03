#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import { createRequire } from 'node:module';
import { scanForRemotes } from './scanner.js';
import { writeFederationConfig, writeCatalogManifest } from './generator.js';

const require = createRequire(import.meta.url);
const pkg = require('../package.json') as { version: string };

const program = new Command();

program
  .name('nexus-build')
  .description('Auto-generate Native Federation config from @NexusRemote class decorators')
  .version(pkg.version);

program
  .command('generate', { isDefault: true })
  .description('Scan src/ for @NexusRemote decorators and write federation.config.json')
  .option('-r, --root <dir>', 'Project root (where package.json lives)', process.cwd())
  .option('-s, --src <dir>', 'Source directory to scan', 'src')
  .option('-c, --config <file>', 'Path to federation.config.json', 'federation.config.json')
  .option('-m, --catalog <file>', 'Path to catalog.json (default public/catalog.json)', 'public/catalog.json')
  .option('--no-catalog', 'Skip writing catalog.json')
  .option('--dry-run', 'Print the resolved config but do not write it', false)
  .action(async (opts: { root: string; src: string; config: string; catalog: string | false; dryRun: boolean }) => {
    const remotes = await scanForRemotes({ projectRoot: opts.root, srcDir: opts.src });

    if (remotes.length === 0) {
      console.error(chalk.red(`✗ No @NexusRemote decorators found under ${opts.root}/${opts.src}`));
      console.error(chalk.dim('  Annotate your entry component:'));
      console.error(chalk.dim("    import { NexusRemote } from '@bimo-dk/nexus-build';"));
      console.error(chalk.dim('    @NexusRemote()'));
      console.error(chalk.dim('    export default class EntryComponent {}'));
      process.exit(1);
    }

    for (const r of remotes) {
      const nameTag = r.nameExplicit ? chalk.green('explicit') : chalk.yellow('inferred');
      const routeTag = r.routeExplicit ? chalk.green('explicit') : chalk.yellow('inferred');
      console.log(
        `${chalk.cyan('→')} ${chalk.bold(r.name)} ` +
          `${chalk.dim(`(${nameTag})`)} route=${r.route} ${chalk.dim(`(${routeTag})`)} ` +
          `expose=./${r.exposeAs}`,
      );
      console.log(`   ${chalk.dim(r.classFileRelative)}`);
    }

    const result = await writeFederationConfig(remotes, opts.root, {
      configPath: opts.config,
      dryRun: opts.dryRun,
    });

    if (opts.dryRun) {
      console.log('');
      console.log(chalk.dim('Dry run — would write to:'), result.path);
      console.log(JSON.stringify(result.config, null, 2));
    } else {
      console.log(chalk.green(`✓ Wrote ${result.path}`));
    }

    if (opts.catalog !== false) {
      const withMeta = remotes.filter((r) => r.metadata);
      if (withMeta.length > 0) {
        const cat = await writeCatalogManifest(remotes, opts.root, {
          catalogPath: typeof opts.catalog === 'string' ? opts.catalog : undefined,
          dryRun: opts.dryRun,
        });
        if (opts.dryRun) {
          console.log('');
          console.log(chalk.dim('Dry run — would write catalog to:'), cat.path);
          console.log(JSON.stringify(cat.manifest, null, 2));
        } else {
          console.log(chalk.green(`✓ Wrote ${cat.path} (${withMeta.length} component(s))`));
        }
      } else {
        console.log(chalk.dim(`  no @NexusComponent metadata found — skipping catalog.json`));
      }
    }
  });

program
  .command('scan')
  .description('List discovered @NexusRemote decorators without writing any files')
  .option('-r, --root <dir>', 'Project root', process.cwd())
  .option('-s, --src <dir>', 'Source directory to scan', 'src')
  .action(async (opts: { root: string; src: string }) => {
    const remotes = await scanForRemotes({ projectRoot: opts.root, srcDir: opts.src });
    if (remotes.length === 0) {
      console.log(chalk.yellow('No @NexusRemote decorators found.'));
      return;
    }
    console.log(JSON.stringify(remotes, null, 2));
  });

program.parseAsync(process.argv).catch((err: unknown) => {
  console.error(chalk.red(err instanceof Error ? err.message : String(err)));
  process.exit(1);
});
