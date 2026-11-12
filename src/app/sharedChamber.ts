import type { LevelFactory } from '../level/Builder';
import { decodeSpec } from '../level/specCodec';
import { leaveShared, shared, sharedSpec } from './flags';

/**
 * The factory for the chamber a `#c=...` link carries, or undefined when the page was not opened with one. A link that
 * does not decode to a sound chamber is logged and the page becomes an ordinary one (`leaveShared`), so a bad link
 * still opens the game. The builder is fetched on demand, like the chambers' own code.
 */
export async function sharedGuest(): Promise<LevelFactory | undefined> {
  if (!shared || sharedSpec === undefined) return undefined;
  try {
    const spec = await decodeSpec(sharedSpec);
    const { buildFromSpec } = await import('../level/buildSpec');
    return (scene, skin) => buildFromSpec(scene, skin, spec);
  } catch (error) {
    console.error('Shared chamber link could not be loaded; opening the game instead.', error);
    leaveShared();
    return undefined;
  }
}
