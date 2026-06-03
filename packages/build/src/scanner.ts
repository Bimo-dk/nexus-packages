import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import ts from 'typescript';
import type {
  CatalogEntry,
  DiscoveredRemote,
  NexusComponentOptions,
  NexusInputSpec,
  NexusInputType,
  ScanOptions,
} from './types.js';
import { resolveName, toKebabCase } from './naming.js';

// Re-export build-time helpers under this Node-only subpath so consumers can
// `import { ..., writeFederationConfig } from '@bimo-dk/nexus-build/scanner'`.
export { writeFederationConfig, writeCatalogManifest, type GeneratedConfig } from './generator.js';
export {
  resolveName,
  toCamelCase,
  toKebabCase,
  stripClassSuffix,
  defaultSharedBlock,
} from './naming.js';
export type {
  DiscoveredRemote,
  ScanOptions,
  GenerateOptions,
  NexusComponentOptions,
  NexusInputSpec,
  CatalogEntry,
  CatalogManifest,
} from './types.js';

const REMOTE_DECORATOR = 'NexusRemote';
const COMPONENT_DECORATOR = 'NexusComponent';

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
  // Cheap pre-filter: skip files that don't mention either decorator.
  if (!source.includes(REMOTE_DECORATOR)) return [];

  const sf = ts.createSourceFile(absoluteFile, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const out: DiscoveredRemote[] = [];

  const visit = (node: ts.Node): void => {
    if (ts.isClassDeclaration(node) && node.name) {
      const decorators = ts.canHaveDecorators(node) ? ts.getDecorators(node) : undefined;
      const remoteDeco = decorators?.find((d) => isNamedDecorator(d, REMOTE_DECORATOR));
      if (remoteDeco) {
        const className = node.name.text;
        const optionsLiteral = extractOptionsLiteral(remoteDeco);
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

        // Look for the optional @NexusComponent metadata decorator on the same class
        const componentDeco = decorators?.find((d) => isNamedDecorator(d, COMPONENT_DECORATOR));
        const metadata = componentDeco ? extractComponentOptions(componentDeco) : undefined;

        out.push({
          name,
          route,
          exposeAs,
          className,
          classFile: absoluteFile,
          classFileRelative: relPosix,
          nameExplicit,
          routeExplicit: explicitRoute !== undefined,
          metadata,
        });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);

  return out;
}

function isNamedDecorator(decorator: ts.Decorator, name: string): boolean {
  const expr = decorator.expression;
  if (ts.isCallExpression(expr)) {
    return ts.isIdentifier(expr.expression) && expr.expression.text === name;
  }
  return ts.isIdentifier(expr) && expr.text === name;
}

function extractOptionsLiteral(decorator: ts.Decorator): ts.ObjectLiteralExpression | undefined {
  const expr = decorator.expression;
  if (!ts.isCallExpression(expr) || expr.arguments.length === 0) return undefined;
  const arg = expr.arguments[0];
  return ts.isObjectLiteralExpression(arg) ? arg : undefined;
}

/** Parse @NexusComponent({...}) options literal into structured metadata. */
function extractComponentOptions(decorator: ts.Decorator): NexusComponentOptions | undefined {
  const literal = extractOptionsLiteral(decorator);
  if (!literal) return undefined;

  const title = readStringProperty(literal, 'title') ?? '';
  const description = readStringProperty(literal, 'description');
  const category = readStringProperty(literal, 'category');
  const icon = readStringProperty(literal, 'icon');
  const tags = readStringArrayProperty(literal, 'tags');
  const experimental = readBooleanProperty(literal, 'experimental');
  const inputs = readInputsProperty(literal);

  if (!title) return undefined; // title is required for catalog entry
  return {
    title,
    description,
    category,
    icon,
    tags,
    experimental,
    inputs,
  };
}

function readStringArrayProperty(obj: ts.ObjectLiteralExpression | undefined, key: string): string[] | undefined {
  if (!obj) return undefined;
  for (const prop of obj.properties) {
    if (!ts.isPropertyAssignment(prop)) continue;
    if (!isPropertyNamed(prop.name, key)) continue;
    if (!ts.isArrayLiteralExpression(prop.initializer)) return undefined;
    const out: string[] = [];
    for (const el of prop.initializer.elements) {
      if (ts.isStringLiteral(el) || ts.isNoSubstitutionTemplateLiteral(el)) out.push(el.text);
    }
    return out;
  }
  return undefined;
}

function readBooleanProperty(obj: ts.ObjectLiteralExpression | undefined, key: string): boolean | undefined {
  if (!obj) return undefined;
  for (const prop of obj.properties) {
    if (!ts.isPropertyAssignment(prop)) continue;
    if (!isPropertyNamed(prop.name, key)) continue;
    if (prop.initializer.kind === ts.SyntaxKind.TrueKeyword) return true;
    if (prop.initializer.kind === ts.SyntaxKind.FalseKeyword) return false;
  }
  return undefined;
}

function readInputsProperty(obj: ts.ObjectLiteralExpression): Record<string, NexusInputSpec> | undefined {
  for (const prop of obj.properties) {
    if (!ts.isPropertyAssignment(prop)) continue;
    if (!isPropertyNamed(prop.name, 'inputs')) continue;
    if (!ts.isObjectLiteralExpression(prop.initializer)) return undefined;

    const out: Record<string, NexusInputSpec> = {};
    for (const inputProp of prop.initializer.properties) {
      if (!ts.isPropertyAssignment(inputProp)) continue;
      const inputName = ts.isIdentifier(inputProp.name)
        ? inputProp.name.text
        : ts.isStringLiteral(inputProp.name) ? inputProp.name.text : undefined;
      if (!inputName) continue;
      if (!ts.isObjectLiteralExpression(inputProp.initializer)) continue;

      const type = readStringProperty(inputProp.initializer, 'type') as NexusInputType | undefined;
      if (!type) continue;

      const spec: NexusInputSpec = { type };
      const defValue = readLiteralProperty(inputProp.initializer, 'default');
      if (defValue !== undefined) spec.default = defValue;
      const desc = readStringProperty(inputProp.initializer, 'description');
      if (desc) spec.description = desc;
      const req = readBooleanProperty(inputProp.initializer, 'required');
      if (req !== undefined) spec.required = req;
      const enumVals = readStringArrayProperty(inputProp.initializer, 'enum');
      if (enumVals) spec.enum = enumVals;

      out[inputName] = spec;
    }
    return out;
  }
  return undefined;
}

function readLiteralProperty(obj: ts.ObjectLiteralExpression, key: string): unknown {
  for (const prop of obj.properties) {
    if (!ts.isPropertyAssignment(prop)) continue;
    if (!isPropertyNamed(prop.name, key)) continue;
    const init = prop.initializer;
    if (ts.isStringLiteral(init) || ts.isNoSubstitutionTemplateLiteral(init)) return init.text;
    if (ts.isNumericLiteral(init)) return Number(init.text);
    if (init.kind === ts.SyntaxKind.TrueKeyword) return true;
    if (init.kind === ts.SyntaxKind.FalseKeyword) return false;
    if (init.kind === ts.SyntaxKind.NullKeyword) return null;
    return undefined;
  }
  return undefined;
}

function isPropertyNamed(name: ts.PropertyName, key: string): boolean {
  if (ts.isIdentifier(name)) return name.text === key;
  if (ts.isStringLiteral(name)) return name.text === key;
  return false;
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
