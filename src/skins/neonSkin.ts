import { Color3 } from '@babylonjs/core/Maths/math.color';
import { GlowLayer } from '@babylonjs/core/Layers/glowLayer';
import { Material } from '@babylonjs/core/Materials/material';
import { Scene } from '@babylonjs/core/scene';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { GridMaterial } from '@babylonjs/materials/grid/gridMaterial';
import { GravityAxis } from '../gravity/GravitySystem';
import { applyEnvironment, BaseSkin } from './base';
import type { PlacardInk, SurfaceRole } from './types';
import { AXIS_ORDER } from './types';

// --- NEON: the original look -------------------------------------------------------------------

const NEON_LEVER: Record<GravityAxis, Color3> = {
  '+X': new Color3(1.0, 0.35, 0.35),
  '-X': new Color3(0.6, 0.15, 0.15),
  '+Y': new Color3(0.35, 1.0, 0.45),
  '-Y': new Color3(0.15, 0.55, 0.2),
  '+Z': new Color3(0.35, 0.55, 1.0),
  '-Z': new Color3(0.15, 0.25, 0.6),
};

export class NeonSkin extends BaseSkin {
  readonly id = 'neon' as const;
  readonly textureScale = 1;
  readonly placardInk: PlacardInk = { color: '#7fffd0', outline: false, weathered: false, glow: true };
  protected usesAccent = true;

  constructor(scene: Scene, glow: GlowLayer, colorAssist: boolean) {
    super(scene, colorAssist);
    this.env = applyEnvironment(scene, glow, {
      sky: ['#0a1420', '#050810', '#000000'],
      hemi: {
        intensity: 0.55,
        sky: Color3.White(),
        ground: new Color3(0.15, 0.17, 0.22),
        direction: new Vector3(0.3, 1, 0.2),
      },
      glow: 0.7,
      exposure: 1,
      contrast: 1,
      vignette: 0,
      toneMapping: false,
    });
  }

  private grid(name: string, main: Color3, line: Color3, ratio: number): GridMaterial {
    const m = new GridMaterial(name, this.scene);
    m.mainColor = main;
    m.lineColor = line;
    m.gridRatio = ratio;
    m.majorUnitFrequency = 4;
    m.minorUnitVisibility = 0.3;
    return m;
  }

  protected build(role: SurfaceRole, accent: Color3): Material[] {
    if (role === 'exit')
      return Array(6).fill(this.grid('neonExit', new Color3(0.05, 0.12, 0.08), new Color3(0.3, 1, 0.5), 0.8));
    if (role === 'alcove')
      return Array(6).fill(this.grid('neonAlcove', new Color3(0.07, 0.08, 0.1), new Color3(0.5, 0.35, 0.8), 0.8));
    const wall = this.grid('neonWall', new Color3(0.08, 0.09, 0.12), accent, 1);
    const floor = this.grid('neonFloor', new Color3(0.1, 0.1, 0.13), new Color3(0.9, 0.6, 0.2), 1);
    // The natural floor keeps its orange grid.
    return AXIS_ORDER.map((a) => (a === '-Y' ? floor : wall));
  }

  public leverColor(axis: GravityAxis): Color3 {
    return this.axisColor(NEON_LEVER, axis);
  }

  public hudColor(axis: GravityAxis): string {
    // The fixed cool HUD colour, unless the colour-blind palette is on: then the HUD follows the lever colours.
    return this.colorAssist ? super.hudColor(axis) : '#bfe3ff';
  }
}
