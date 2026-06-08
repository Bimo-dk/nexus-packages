import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import ts from 'typescript';
import type { CatalogEntry, NexusComponentOptions } from './types.js';

const MARKER_CALL = 'defineNexusComponent';

export interface DiscoveredFunctionComponent {
  /** Exported binding name. `'default'` for `export default defineNexusComponent(...)`. */
  exportName: string;
  /** Absolute path to the file the call lives in. */
  file: string;
  /** POSIX-style path relative to project root. Suitable for vite `input`. */
  fileRelative: string;
  /** Catalog metadata extracted from the first arg literal. */
  metadata: NexusComponentOptions;
}

export interface AutoScanOptions {
  projectRoot?: string;
  srcDir?: string;
  /** File extensions to walk. Defaults to .ts, .tsx, .vue, .js, .jsx. */
  extensions?: string[];
}

/**
 * Scan a project for `defineNexusComponent(meta, ...)` call sites. The
 * metadata literal is read straight out of the AST — pass an object
 * literal, not a variable, or the scanner will skip the call.
 *
 * Used by `nexusViteAuto()` to auto-generate the exposes map, the
 * rollup `input` map, and the catalog entries without the developer
 * touching `vite.config.ts` per new component. (B-28)
 */
export async function scanForDefineNexusComponent(
  options: AutoScanOptions = {},
): Promise<DiscoveredFunctionComponent[]> {
  const projectRoot = options.projectRoot ?? process.cwd();
  const srcDir = options.srcDir ?? 'src';
  const extensions = options.extensions ?? ['.ts', '.tsx', '.vue', '.js', '.jsx'];

  const absSrc = path.resolve(projectRoot, srcDir);
  if (!(await pathExists(absSrc))) return [];

  const files = await walkFiles(absSrc, extensions);
  const out: DiscoveredFunctionComponent[] = [];

  for (const file of files) {
    out.push(...(await scanFile(file, projectRoot)));
  }

  return out;
}

async function scanFile(
  absFile: string,
  projectRoot: string,
): Promise<DiscoveredFunctionComponent[]> {
  const source = await fs.readFile(absFile, 'utf8');
  if (!source.includes(MARKER_CALL)) return [];

  // For .vue SFCs, scan only the <script> sections. Cheap text-based
  // extract because we only need to find the defineNexusComponent calls.
  const sourceForAst = absFile.endsWith('.vue') ? extractVueScripts(source) : source;
  if (!sourceForAst.includes(MARKER_CALL)) return [];

  const scriptKind = absFile.endsWith('.tsx') || absFile.endsWith('.jsx')
    ? ts.ScriptKind.TSX
    : ts.ScriptKind.TS;
  const sf = ts.createSourceFile(absFile, sourceForAst, ts.ScriptTarget.Latest, true, scriptKind);

  const found: DiscoveredFunctionComponent[] = [];
  const relPosix = './' + path.relative(projectRoot, absFile).split(path.sep).join('/');

  const visit = (node: ts.Node): void => {
    if (ts.isVariableStatement(node)) {
      const isExported = node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) ?? false;
      if (isExported) {
        for (const decl of node.declarationList.declarations) {
          if (!ts.isIdentifier(decl.name)) continue;
          const initCall = unwrapCall(decl.initializer, MARKER_CALL);
          if (!initCall) continue;
          const meta = extractMetadata(initCall);
          if (!meta) continue;
          found.push({
            exportName: decl.name.text,
            file: absFile,
            fileRelative: relPosix,
            metadata: meta,
          });
        }
      }
    } else if (ts.isExportAssignment(node) && !node.isExportEquals) {
      // `export default defineNexusComponent({...}, ...)`
      const initCall = unwrapCall(node.expression, MARKER_CALL);
      if (initCall) {
        const meta = extractMetadata(initCall);
        if (meta) {
          found.push({
            exportName: 'default',
            file: absFile,
            fileRelative: relPosix,
            metadata: meta,
          });
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);

  return found;
}

function unwrapCall(node: ts.Expression | undefined, calleeName: string): ts.CallExpression | undefined {
  if (!node || !ts.isCallExpression(node)) return undefined;
  if (!ts.isIdentifier(node.expression)) return undefined;
  if (node.expression.text !== calleeName) return undefined;
  return node;
}

function extractMetadata(call: ts.CallExpression): NexusComponentOptions | undefined {
  if (call.arguments.length === 0) return undefined;
  const arg = call.arguments[0];
  if (!ts.isObjectLiteralExpression(arg)) return undefined;

  const title = readString(arg, 'title') ?? '';
  if (!title) return undefined;
  return {
    title,
    description: readString(arg, 'description'),
    category: readString(arg, 'category'),
    icon: readString(arg, 'icon'),
    tags: readStringArray(arg, 'tags'),
    experimental: readBoolean(arg, 'experimental'),
  };
}

function readString(obj: ts.ObjectLiteralExpression, key: string): string | undefined {
  for (const prop of obj.properties) {
    if (!ts.isPropertyAssignment(prop)) continue;
    if (!isKey(prop.name, key)) continue;
    if (ts.isStringLiteral(prop.initializer) || ts.isNoSubstitutionTemplateLiteral(prop.initializer)) {
      return prop.initializer.text;
    }
  }
  return undefined;
}

function readStringArray(obj: ts.ObjectLiteralExpression, key: string): string[] | undefined {
  for (const prop of obj.properties) {
    if (!ts.isPropertyAssignment(prop)) continue;
    if (!isKey(prop.name, key)) continue;
    if (!ts.isArrayLiteralExpression(prop.initializer)) return undefined;
    const out: string[] = [];
    for (const el of prop.initializer.elements) {
      if (ts.isStringLiteral(el) || ts.isNoSubstitutionTemplateLiteral(el)) out.push(el.text);
    }
    return out;
  }
  return undefined;
}

function readBoolean(obj: ts.ObjectLiteralExpression, key: string): boolean | undefined {
  for (const prop of obj.properties) {
    if (!ts.isPropertyAssignment(prop)) continue;
    if (!isKey(prop.name, key)) continue;
    if (prop.initializer.kind === ts.SyntaxKind.TrueKeyword) return true;
    if (prop.initializer.kind === ts.SyntaxKind.FalseKeyword) return false;
  }
  return undefined;
}

function isKey(name: ts.PropertyName, key: string): boolean {
  if (ts.isIdentifier(name)) return name.text === key;
  if (ts.isStringLiteral(name)) return name.text === key;
  return false;
}

function extractVueScripts(source: string): string {
  // Concatenate every <script ...>...</script> block — accurate enough
  // for finding defineNexusComponent calls.
  const out: string[] = [];
  const re = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(source))) out.push(match[1]);
  return out.join('\n');
}

async function pathExists(p: string): Promise<boolean> {
  try { await fs.access(p); return true; } catch { return false; }
}

async function walkFiles(dir: string, exts: string[]): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const out: string[] = [];
  for (const entry of entries) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
      out.push(...(await walkFiles(abs, exts)));
    } else if (exts.some((ext) => entry.name.endsWith(ext))) {
      out.push(abs);
    }
  }
  return out;
}

export function discoveredToCatalogEntries(
  remoteName: string,
  components: DiscoveredFunctionComponent[],
): CatalogEntry[] {
  return components.map((c) => {
    const expose = c.exportName === 'default'
      ? './' + path.basename(c.fileRelative, path.extname(c.fileRelative))
      : './' + c.exportName;
    const entry: CatalogEntry = {
      remote: remoteName,
      expose,
      className: c.exportName,
      title: c.metadata.title,
      tags: c.metadata.tags ?? [],
      inputs: c.metadata.inputs ?? {},
      experimental: c.metadata.experimental ?? false,
    };
    if (c.metadata.description) entry.description = c.metadata.description;
    if (c.metadata.category) entry.category = c.metadata.category;
    if (c.metadata.icon) entry.icon = c.metadata.icon;
    return entry;
  });
}
