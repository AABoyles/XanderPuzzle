import type { Scene } from '@babylonjs/core/scene';
import type { SkinRuntime } from '../../skins/Skin';
import type { BuiltLevel } from '../Builder';
import { buildFromSpec } from '../buildSpec';
import { STAIRCASE } from '../specs/staircase';

/** The chamber is data: see `specs/staircase.ts` for its layout and design notes. */
export function buildStaircase(scene: Scene, skin: SkinRuntime): BuiltLevel {
  return buildFromSpec(scene, skin, STAIRCASE);
}

export default buildStaircase;
