import { readFile } from 'node:fs/promises';

export async function resolve(specifier, context, next) {
  if (/^\.\.?\//.test(specifier) && !/\.\w+$/.test(specifier)) {
    try { return await next(specifier + '.ts', context); } catch { /* fall through */ }
  }
  return next(specifier, context);
}

export async function load(url, context, next) {
  if (url.endsWith('.json')) return { format: 'module', source: `export default ${await readFile(new URL(url), 'utf8')};`, shortCircuit: true };
  return next(url, context);
}
