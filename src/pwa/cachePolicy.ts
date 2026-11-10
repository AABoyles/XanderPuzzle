// Babylon-free service-worker cache policy, shared by the build plugin, the worker and tests.

export type Strategy = 'network-first' | 'cache-first';

export const CACHE_PREFIX = 'shiftbound-';

/** FNV-1a 32-bit hash, hex. Deterministic and dependency-free. */
export function hashString(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

/** Cache name derived from the (order-independent) precache list. */
export function cacheName(assets: readonly string[]): string {
  return CACHE_PREFIX + hashString([...assets].sort().join('\n'));
}

/** Navigations and the shell go network-first so updates are not stuck; everything else is cache-first. */
export function strategyFor(pathname: string, isNavigation: boolean): Strategy {
  if (isNavigation) return 'network-first';
  if (pathname === '' || pathname.endsWith('/')) return 'network-first';
  if (/(^|\/)(index\.html|manifest\.webmanifest|sw\.js)$/.test(pathname)) return 'network-first';
  return 'cache-first';
}

/** Caches belonging to this app but not the current one. */
export function staleCaches(names: readonly string[], current: string): string[] {
  return names.filter((n) => n.startsWith(CACHE_PREFIX) && n !== current);
}
