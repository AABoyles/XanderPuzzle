import { SANDBOX } from '../level/chambers/catalog';
import type { ChamberModule } from '../level/chambers/catalog';
import { decodeSpec } from '../level/specCodec';
import { sharedSpec } from './flags';

/**
 * The one room of a single-room page: the chamber a `#c=...` link carries, or the physics test room for `?sandbox`.
 * A link that does not decode to a sound chamber is logged and the test room loads instead, so a bad link still opens
 * a playable page. The builder is fetched on demand, like the chambers' own code.
 */
export function roomSource(): { load: () => Promise<ChamberModule> } {
  if (sharedSpec === undefined || new URLSearchParams(location.search).has('sandbox')) return SANDBOX;
  const encoded = sharedSpec;
  return {
    load: async () => {
      try {
        const spec = await decodeSpec(encoded);
        const { buildFromSpec } = await import('../level/buildSpec');
        return { default: (scene, skin) => buildFromSpec(scene, skin, spec) };
      } catch (error) {
        console.error('Shared chamber link could not be loaded; opening the test room.', error);
        return SANDBOX.load();
      }
    },
  };
}
