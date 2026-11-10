import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import type { Plugin } from 'vite';
import { cacheName } from '../src/pwa/cachePolicy.ts';

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

/** After the bundle is written, emit sw.js with a precache list of every output file (relative URLs). */
export function pwaPlugin(): Plugin {
  let outDir = 'dist';
  let root = process.cwd();
  return {
    name: 'shiftbound-pwa',
    apply: 'build',
    configResolved(c) {
      outDir = join(c.root, c.build.outDir);
      root = c.root;
    },
    writeBundle() {
      const files = walk(outDir)
        .map((f) => relative(outDir, f).split('\\').join('/'))
        .filter((f) => f !== 'sw.js' && !f.endsWith('.map') && !f.endsWith('.svg'));
      const assets = ['./', ...files].sort();
      const size = files.reduce((n, f) => n + statSync(join(outDir, f)).size, 0);
      const tpl = readFileSync(join(root, 'src/pwa/sw.template.js'), 'utf8');
      // Hash file contents too so an unchanged filename with new content still bumps the cache.
      const stamp = files.map((f) => f + ':' + statSync(join(outDir, f)).size).sort();
      const sw = tpl
        .replace('__CACHE_NAME__', cacheName([...assets, ...stamp]))
        .replace('__PRECACHE__', JSON.stringify(assets, null, 2));
      writeFileSync(join(outDir, 'sw.js'), sw);
      console.log(`[pwa] sw.js precaches ${assets.length} entries, ${(size / 1048576).toFixed(2)} MiB`);
    },
  };
}
