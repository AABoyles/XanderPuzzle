import type { Scene } from '@babylonjs/core/scene';
import type { SkinRuntime } from '../../skins/Skin';
import type { BuiltLevel } from '../Builder';
import { buildFromSpec } from '../buildSpec';
import { DIVIDE } from '../specs/divide';

/** The chamber is data: see `specs/divide.ts` for its layout and design notes. */
export function buildDivide(scene: Scene, skin: SkinRuntime): BuiltLevel {
  return buildFromSpec(scene, skin, DIVIDE);
}

export default buildDivide;
