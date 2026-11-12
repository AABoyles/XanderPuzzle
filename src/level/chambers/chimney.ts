import type { Scene } from '@babylonjs/core/scene';
import type { SkinRuntime } from '../../skins/Skin';
import type { BuiltLevel } from '../Builder';
import { buildFromSpec } from '../buildSpec';
import { CHIMNEY } from '../specs/chimney';

/** The chamber is data: see `specs/chimney.ts` for its layout and design notes. */
export function buildChimney(scene: Scene, skin: SkinRuntime): BuiltLevel {
  return buildFromSpec(scene, skin, CHIMNEY);
}

export default buildChimney;
