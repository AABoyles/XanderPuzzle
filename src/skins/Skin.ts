import type { GlowLayer } from '@babylonjs/core/Layers/glowLayer';
import type { Scene } from '@babylonjs/core/scene';
import { AxisSkin } from './axisSkin';
import { DraftSkin } from './draftSkin';
import { MonolithSkin } from './monolithSkin';
import { NeonSkin } from './neonSkin';
import { StationSkin } from './stationSkin';
import type { SkinId, SkinRuntime } from './types';

export * from './types';

export function createSkin(id: SkinId, scene: Scene, glow: GlowLayer, colorAssist = false): SkinRuntime {
  switch (id) {
    case 'station':
      return new StationSkin(scene, glow, colorAssist);
    case 'neon':
      return new NeonSkin(scene, glow, colorAssist);
    case 'monolith':
      return new MonolithSkin(scene, glow, colorAssist);
    case 'draft':
      return new DraftSkin(scene, glow, colorAssist);
    default:
      return new AxisSkin(scene, glow, colorAssist);
  }
}
