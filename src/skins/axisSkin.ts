import { Color3 } from '@babylonjs/core/Maths/math.color';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { GlowLayer } from '@babylonjs/core/Layers/glowLayer';
import { Material } from '@babylonjs/core/Materials/material';
import { Scene } from '@babylonjs/core/scene';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { GravityAxis } from '../gravity/GravitySystem';
import { applyEnvironment, BaseSkin, canvasTexture, hex, rng } from './base';
import type { PlacardInk, SurfaceRole } from './types';
import { AXIS_ORDER } from './types';

// --- AXIS: each wall is the colour of the lever that makes it the floor -------------------------

const AXIS_PALETTE: Record<GravityAxis, Color3> = {
  '-Y': Color3.FromHexString('#e8d5b0'), // sand: the natural floor
  '+Y': Color3.FromHexString('#9cc3ec'), // sky: the ceiling
  '+X': Color3.FromHexString('#f2917a'), // coral
  '-X': Color3.FromHexString('#7fcfb0'), // mint
  '+Z': Color3.FromHexString('#b6a2e6'), // lavender
  '-Z': Color3.FromHexString('#f0c95e'), // marigold
};

/** Deeper versions of the wall colours, so levers stay legible against their own wall. */
export const AXIS_LEVER: Record<GravityAxis, Color3> = {
  '-Y': Color3.FromHexString('#c08a2e'),
  '+Y': Color3.FromHexString('#2f78d0'),
  '+X': Color3.FromHexString('#e0482c'),
  '-X': Color3.FromHexString('#1fa874'),
  '+Z': Color3.FromHexString('#7a52d6'),
  '-Z': Color3.FromHexString('#e0a400'),
};

export class AxisSkin extends BaseSkin {
  readonly id = 'axis' as const;
  readonly textureScale = 4;
  readonly placardInk: PlacardInk = { color: '#3a3e47', outline: false, weathered: false, glow: false };
  private readonly tiles: DynamicTexture;

  constructor(scene: Scene, glow: GlowLayer, colorAssist: boolean) {
    super(scene, colorAssist);
    this.env = applyEnvironment(scene, glow, {
      sky: ['#f6e9df', '#e9d9e6', '#cfd9ec'],
      fog: { color: Color3.FromHexString('#efe3e3'), density: 0.012 },
      hemi: {
        intensity: 0.6,
        sky: new Color3(1, 0.97, 0.94),
        ground: new Color3(0.6, 0.62, 0.72),
        direction: new Vector3(0.2, 1, -0.3),
      },
      sun: {
        direction: new Vector3(-0.45, -1, -0.6),
        intensity: 0.7,
        color: new Color3(1, 0.95, 0.88),
        shadowDarkness: 0.45,
      },
      glow: 0.35,
      exposure: 1.05,
      contrast: 1.1,
      vignette: 1.2,
      toneMapping: false,
    });

    // 4x4 soft tiles per repeat: enough texture to read speed and distance while falling.
    this.tiles = canvasTexture(scene, 'axisTiles', 512, (ctx, s) => {
      const r = rng(7);
      const t = s / 4;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, s, s);
      for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
          const v = 238 + Math.floor(r() * 17);
          ctx.fillStyle = `rgb(${v},${v},${v})`;
          ctx.fillRect(i * t + 3, j * t + 3, t - 6, t - 6);
        }
      }
      ctx.strokeStyle = 'rgba(70,60,80,0.32)';
      ctx.lineWidth = 3;
      for (let i = 0; i <= 4; i++) {
        ctx.beginPath();
        ctx.moveTo(i * t, 0);
        ctx.lineTo(i * t, s);
        ctx.moveTo(0, i * t);
        ctx.lineTo(s, i * t);
        ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(70,60,80,0.45)';
      ctx.lineWidth = 6;
      ctx.strokeRect(0, 0, s, s);
    });
    this.owned.push(this.tiles);
  }

  protected build(role: SurfaceRole): Material[] {
    return AXIS_ORDER.map((axis) => {
      const m = new StandardMaterial(`axis_${role}_${axis}`, this.scene);
      m.diffuseTexture = this.tiles;
      const base = this.axisColor(AXIS_PALETTE, axis);
      m.diffuseColor = role === 'alcove' ? base.scale(0.82) : base;
      m.specularColor = new Color3(0.06, 0.06, 0.06);
      m.emissiveColor = base.scale(0.12);
      if (role === 'exit') {
        // The way out glows white whichever way it faces.
        m.diffuseColor = new Color3(1, 1, 1);
        m.emissiveColor = new Color3(0.75, 0.95, 0.85);
      }
      return m;
    });
  }

  public leverColor(axis: GravityAxis): Color3 {
    return this.axisColor(AXIS_LEVER, axis);
  }

  public hudColor(axis: GravityAxis): string {
    return hex(this.axisColor(AXIS_PALETTE, axis));
  }
}
