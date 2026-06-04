import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { isValidRemoteName, isValidRoutePath } from '@bimo-dk/nexus-core';
import chalk from 'chalk';
import inquirer from 'inquirer';

const TEMPLATE_REPO = 'https://github.com/Bimo-dk/nexus-remote-templat.git';

export async function generateRemote(opts: { name?: string; route?: string }): Promise<void> {
  let name = opts.name;
  let route = opts.route;

  if (!name) {
    const a = await inquirer.prompt<{ name: string }>([{
      type: 'input',
      name: 'name',
      message: 'Remote name (camelCase, e.g. remoteThree):',
      validate: (v: string) => isValidRemoteName(v) || 'Must be camelCase starting with a lowercase letter',
    }]);
    name = a.name;
  } else if (!isValidRemoteName(name)) {
    console.error(chalk.red(`✗ Invalid remote name "${name}" — must be camelCase`));
    process.exit(1);
  }

  if (!route) {
    const a = await inquirer.prompt<{ route: string }>([{
      type: 'input',
      name: 'route',
      message: 'Route path (kebab-case, e.g. remote-three):',
      default: name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase(),
      validate: (v: string) => isValidRoutePath(v) || 'Must be kebab-case starting with a lowercase letter',
    }]);
    route = a.route;
  } else if (!isValidRoutePath(route)) {
    console.error(chalk.red(`✗ Invalid route path "${route}" — must be kebab-case`));
    process.exit(1);
  }

  const target = path.resolve(process.cwd(), name);
  try {
    await fs.access(target);
    console.error(chalk.red(`✗ Directory "${name}" already exists`));
    process.exit(1);
  } catch {
    /* good — doesn't exist */
  }

  console.log(chalk.cyan(`→ Cloning ${TEMPLATE_REPO} into ./${name}`));
  await runGit(['clone', '--depth', '1', TEMPLATE_REPO, name]);

  console.log(chalk.cyan(`→ Removing template's .git directory`));
  await fs.rm(path.join(target, '.git'), { recursive: true, force: true });

  console.log(chalk.cyan(`→ Substituting name=${name}, route=${route} in template files`));
  await substituteTemplate(target, name, route);

  console.log('');
  console.log(chalk.green(`✓ Created ./${name}`));
  console.log('');
  console.log(chalk.bold('Next steps:'));
  console.log(`  cd ${name}`);
  console.log(`  npm install`);
  console.log(`  npm run build`);
  console.log(`  NEXUS_TOKEN=... bnx publish`);
}

async function substituteTemplate(dir: string, name: string, route: string): Promise<void> {
  // The four places where the remote name must be replaced (per nexus-remote-templat README):
  // 1. package.json "name"
  // 2. federation.config.json "name" (or @NexusRemote decorator)
  // 3. README.md heading
  // 4. angular.json projects key (if present)
  const candidates = [
    'package.json',
    'federation.config.json',
    'README.md',
    'angular.json',
  ];
  for (const file of candidates) {
    const full = path.join(dir, file);
    try {
      const content = await fs.readFile(full, 'utf8');
      const replaced = content
        .replace(/__REMOTE_NAME__/g, name)
        .replace(/__REMOTE_ROUTE__/g, route);
      if (replaced !== content) {
        await fs.writeFile(full, replaced, 'utf8');
      }
    } catch {
      /* file may not exist in template — skip */
    }
  }
}

function runGit(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn('git', args, { stdio: 'inherit' });
    proc.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`git ${args.join(' ')} failed with exit code ${code}`));
    });
    proc.on('error', reject);
  });
}
