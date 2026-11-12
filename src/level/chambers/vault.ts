import type { Scene } from '@babylonjs/core/scene';
import type { SkinRuntime } from '../../skins/Skin';
import type { BuiltLevel } from '../Builder';
import { buildFromSpec } from '../buildSpec';
import { VAULT } from '../specs/vault';

/** The chamber is data: see `specs/vault.ts` for its layout and design notes. */
export function buildVault(scene: Scene, skin: SkinRuntime): BuiltLevel {
  return buildFromSpec(scene, skin, VAULT);
}

export default buildVault;
