import type { Scene } from '@babylonjs/core/scene';
import type { SkinRuntime } from '../../skins/Skin';
import type { BuiltLevel } from '../Builder';
import { buildFromSpec } from '../buildSpec';
import { SHAFT } from '../specs/shaft';

/** The chamber is data: see `specs/shaft.ts` for its layout and design notes. */
export function buildShaft(scene: Scene, skin: SkinRuntime): BuiltLevel {
  return buildFromSpec(scene, skin, SHAFT);
}

export default buildShaft;
