// Node module hooks (run on a separate thread, registered by register.mjs).
//
// src/ is written for Vite: relative imports have no extension and Babylon is imported by deep path without `.js`.
// Node's ESM loader needs both, and `--experimental-strip-types` cannot handle constructor parameter properties or
// type-only imports written without `type`. So: resolve extensionless specifiers, and compile .ts with the repo's own
// TypeScript (ts.transpileModule, no type checking; `npx tsc -b` does that).
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const SUFFIXES = ['.ts', '.js', '/index.ts', '/index.js'];

export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (err) {
    if (err?.code !== 'ERR_MODULE_NOT_FOUND' && err?.code !== 'ERR_UNSUPPORTED_DIR_IMPORT') throw err;
    for (const suffix of SUFFIXES) {
      try {
        return await nextResolve(specifier + suffix, context);
      } catch {
        // try the next suffix
      }
    }
    throw err;
  }
}

export async function load(url, context, nextLoad) {
  if (!url.startsWith('file:') || !url.endsWith('.ts') || url.includes('/node_modules/')) return nextLoad(url, context);
  const source = await readFile(fileURLToPath(url), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    fileName: fileURLToPath(url),
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, useDefineForClassFields: true },
  });
  return { format: 'module', source: outputText, shortCircuit: true };
}
