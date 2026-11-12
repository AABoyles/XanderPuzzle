// Babylon-free: the URL fragment as a route. `#c=<encoded chamber>` is a shared chamber (specCodec.ts); `#<id>` names one
// of the game's own chambers by its catalog id (`#shaft`), and `#/<id>` is accepted too. Tested by Node.
import { specFromHash } from './specCodec.ts';

export type Route = { kind: 'shared'; encoded: string } | { kind: 'chamber'; id: string };

/** What a hash asks for, or undefined for no hash or one that is neither. Chamber ids are lowercase letters and digits. */
export function routeFromHash(hash: string): Route | undefined {
  const encoded = specFromHash(hash);
  if (encoded !== undefined) return { kind: 'shared', encoded };
  const m = /^#\/?([a-z][a-z0-9-]*)$/i.exec(hash);
  return m ? { kind: 'chamber', id: m[1].toLowerCase() } : undefined;
}

/** The hash that names chamber `id`. */
export const hashForChamber = (id: string): string => `#${id}`;
