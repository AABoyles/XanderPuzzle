import type { Scene } from '@babylonjs/core/scene';
import type { SkinRuntime } from '../../skins/Skin';
import type { BuiltLevel } from '../Builder';
import { buildFromSpec } from '../buildSpec';
import { SPIRAL } from '../specs/spiral';

/** The chamber is data: see `specs/spiral.ts` for its layout and design notes. */
export function buildSpiral(scene: Scene, skin: SkinRuntime): BuiltLevel {
  return buildFromSpec(scene, skin, SPIRAL);
}

export default buildSpiral;
