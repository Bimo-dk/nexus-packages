import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import ts from 'typescript';
import type { DiscoveredRemote, ScanOptions } from './types.js';
import { resolveName, toKebabCase } from './naming.js';

const DECORATOR_NAME = 'NexusRemote';

/**
 * Scan a project for classes annotated with `@NexusRemote`.
 *
 * Uses the TypeScript compiler API in a single-file mode (each file is parsed
 * in isolation). This is fast and does not require an existing tsconfig — it's
 * sufficient because we only need syntactic info, not type checking.
 */
export async function scanForRemotes(options: ScanOptions = {}): Promise<DiscoveredRemote[]> {
  const projectRoot = options.projectRoot ?? process.cwd();
  const srcDir = options.srcDir ?? 'src';
  const extensions = options.extensions ?? ['.ts'];

  const absSrc = path.resolve(projectRoot, srcDir);
  const exists = await pathExists(absSrc);
  if (!exists) {
    return [];
  }

  const files = await walkFiles(absSrc, extensions);
  const packageName = await readPackageName(projectRoot);
  const remotes: DiscoveredRemote[] = [];

  for (const file of files) {
    const found = await scanFile(file, projectRoot, packageName, options.defaultName);
    remotes.push(...found);
  }

  return remotes;
}

async function scanFile(
  absoluteFile: string,
  projectRoot: string,
  packageName: string | undefined,
  defaultName: string | undefined,
): Promise<DiscoveredRemote[]> {
  const source = await fs.readFile(absoluteFile, 'utf8');
  // Cheap pre-filter: skip files that don't even mention the decorator name.
  if (!source.includes(DECORATOR_NAME)) {
    return [];
  }

  const sf = ts.createSourceFile(absoluteFile, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const out: DiscoveredRemote[] = [];

  const visit = (node: ts.Node): void => {
    if (ts.isClassDeclaration(node) && node.name) {
      const decorators = ts.canHaveDecorators(node) ? ts.getDecorators(node) : undefined;
      const match = decorators?.find(isNexusRemoteDecorator);
      if (match) {
        const className = node.name.text;
        const optionsLiteral = extractOptionsLiteral(match);
        const explicitName = readStringProperty(optionsLiteral, 'name');
        const explicitRoute = readStringProperty(optionsLiteral, 'route');
        const exposeAs = (readStringProperty(optionsLiteral, 'exposeAs') ?? 'RemoteEntry').replace(/^\.\//, '');

        const { name, explicit: nameExplicit } = resolveName({
          explicit: explicitName,
          packageName,
          className,
          fallback: defaultName,
        });
        const route = explicitRoute ?? toKebabCase(name);

        const relPosix = './' + path.relative(projectRoot, absoluteFile).split(path.sep).join('/');

        out.push({
          name,
          route,
          exposeAs,
          className,
          classFile: absoluteFile,
          classFileRelative: relPosix,
          nameExplicit,
          routeExplicit: explicitRoute !== undefined,
        });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);

  return out;
}

function isNexusRemoteDecorator(decorator: ts.Decorator): boolean {
  const expr = decorator.expression;
  if (ts.isCallExpression(expr)) {
    return ts.isIdentifier(expr.expression) && expr.expression.text === DECORATOR_NAME;
  }
  // `@NexusRemote` (no parens) — rare but valid for argument-less decorators.
  return ts.isIdentifier(expr) && expr.text === DECORATOR_NAME;
}

function extractOptionsLiteral(decorator: ts.Decorator): ts.ObjectLiteralExpression | undefined {
  const expr = decorator.expression;
  if (!ts.isCallExpression(expr) || expr.arguments.length === 0) return undefined;
  const arg = expr.arguments[0];
  return ts.isObjectLiteralExpression(arg) ? arg : undefined;
}

function readStringProperty(obj: ts.ObjectLiteralExpression | undefined, key: string): string | undefined {
  if (!obj) return undefined;
  for (const prop of obj.properties) {
    if (!ts.isPropertyAssignment(prop)) continue;
    const propName = ts.isIdentifier(prop.name)
      ? prop.name.text
      : ts.isStringLiteral(prop.name)
        ? prop.name.text
        : undefined;
    if (propName !== key) continue;
    if (ts.isStringLiteral(prop.initializer) || ts.isNoSubstitutionTemplateLiteral(prop.initializer)) {
      return prop.initializer.text;
    }
  }
  return undefined;
}

async function walkFiles(dir: string, extensions: string[]): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const results: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name.startsWith('.')) continue;
      results.push(...(await walkFiles(full, extensions)));
    } else if (entry.isFile() && extensions.some((ext) => entry.name.endsWith(ext))) {
      results.push(full);
    }
  }
  return results;
}

async function pathExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function readPackageName(projectRoot: string): Promise<string | undefined> {
  try {
    const raw = await fs.readFile(path.join(projectRoot, 'package.json'), 'utf8');
    const parsed = JSON.parse(raw) as { name?: string };
    return parsed.name;
  } catch {
    return undefined;
  }
}
