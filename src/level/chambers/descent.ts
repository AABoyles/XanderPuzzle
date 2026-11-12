import type { Scene } from '@babylonjs/core/scene';
import type { SkinRuntime } from '../../skins/Skin';
import type { BuiltLevel } from '../Builder';
import { buildFromSpec } from '../buildSpec';
import { DESCENT } from '../specs/descent';

/** The chamber is data: see `specs/descent.ts` for its layout and design notes. */
export function buildDescent(scene: Scene, skin: SkinRuntime): BuiltLevel {
  return buildFromSpec(scene, skin, DESCENT);
}

export default buildDescent;
