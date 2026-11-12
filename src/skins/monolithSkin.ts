import { Color3 } from '@babylonjs/core/Maths/math.color';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { GlowLayer } from '@babylonjs/core/Layers/glowLayer';
import { Material } from '@babylonjs/core/Materials/material';
import { Scene } from '@babylonjs/core/scene';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { GravityAxis } from '../gravity/GravitySystem';
import { AXIS_LEVER } from './axisSkin';
import { applyEnvironment, BaseSkin, canvasTexture, heightToNormal, rng } from './base';
import type { PlacardInk, SurfaceRole } from './types';
import { AXIS_ORDER } from './types';

// --- MONOLITH: warm board-formed concrete under a low sun ---------------------------------------

export class MonolithSkin extends BaseSkin {
  readonly id = 'monolith' as const;
  readonly textureScale = 4;
  readonly placardInk: PlacardInk = { color: '#ece6d8', outline: false, weathered: true, glow: false };
  private readonly concrete: DynamicTexture;
  private readonly bump: DynamicTexture;

  constructor(scene: Scene, glow: GlowLayer, colorAssist: boolean) {
    super(scene, colorAssist);
    this.env = applyEnvironment(scene, glow, {
      sky: ['#d9b48a', '#8a6a55', '#2a2220'],
      fog: { color: new Color3(0.62, 0.5, 0.4), density: 0.022 },
      hemi: {
        intensity: 0.95,
        sky: new Color3(0.95, 0.86, 0.76),
        ground: new Color3(0.45, 0.47, 0.55),
        direction: new Vector3(-0.2, 1, 0.1),
      },
      sun: {
        direction: new Vector3(0.5, -0.75, -0.45),
        intensity: 1.7,
        color: new Color3(1, 0.86, 0.7),
        shadowDarkness: 0.2,
      },
      glow: 0.55,
      exposure: 1.0,
      contrast: 1.2,
      vignette: 2.2,
      toneMapping: true,
    });

    const paint = (ctx: CanvasRenderingContext2D, s: number, forBump: boolean) => {
      const r = rng(11);
      ctx.fillStyle = forBump ? '#808080' : '#a7a39d';
      ctx.fillRect(0, 0, s, s);
      // Mottling.
      for (let i = 0; i < 1400; i++) {
        const x = r() * s;
        const y = r() * s;
        const rad = 4 + r() * 40;
        const shade = forBump ? 110 + r() * 40 : 120 + r() * 60;
        ctx.fillStyle = `rgba(${shade},${shade * 0.97},${shade * 0.93},0.06)`;
        ctx.beginPath();
        ctx.arc(x, y, rad, 0, Math.PI * 2);
        ctx.fill();
      }
      // Board-form planks: 8 boards per repeat (0.5 units each), with grain streaks.
      const board = s / 8;
      for (let b = 0; b < 8; b++) {
        const y0 = b * board;
        for (let k = 0; k < 10; k++) {
          const y = y0 + r() * board;
          ctx.strokeStyle = `rgba(${forBump ? '60,60,60' : '80,78,75'},${0.03 + r() * 0.04})`;
          ctx.lineWidth = 1 + r() * 2;
          ctx.beginPath();
          ctx.moveTo(0, y);
          for (let x = 0; x <= s; x += 32) ctx.lineTo(x, y + Math.sin(x * 0.02 + k) * 2);
          ctx.stroke();
        }
        ctx.fillStyle = forBump ? 'rgba(40,40,40,0.8)' : 'rgba(70,66,62,0.22)';
        ctx.fillRect(0, y0, s, 3);
      }
      // Panel joints and form-tie holes every 2 units.
      ctx.fillStyle = forBump ? 'rgba(20,20,20,1)' : 'rgba(45,40,36,0.6)';
      ctx.fillRect(0, 0, s, 6);
      ctx.fillRect(0, 0, 6, s);
      for (const fx of [0.25, 0.75]) {
        for (const fy of [0.25, 0.75]) {
          ctx.beginPath();
          ctx.arc(fx * s, fy * s, 11, 0, Math.PI * 2);
          ctx.fillStyle = forBump ? '#202020' : 'rgba(40,34,30,0.75)';
          ctx.fill();
        }
      }
    };
    this.concrete = canvasTexture(scene, 'concrete', 1024, (c, s) => paint(c, s, false));
    // Babylon wants a tangent-space normal map, not a height map: paint heights, then convert.
    this.bump = canvasTexture(scene, 'concreteBump', 1024, (c, s) => {
      paint(c, s, true);
      heightToNormal(c, s, 3);
    });
    this.owned.push(this.concrete, this.bump);
  }

  protected build(role: SurfaceRole): Material[] {
    return AXIS_ORDER.map((axis) => {
      const m = new StandardMaterial(`mono_${role}_${axis}`, this.scene);
      m.diffuseTexture = this.concrete;
      m.bumpTexture = this.bump;
      m.bumpTexture.level = 0.8;
      m.specularColor = new Color3(0.05, 0.05, 0.05);
      // A whisper of warm/cool per orientation keeps the faces distinguishable in shade.
      const tint: Record<GravityAxis, Color3> = {
        '-Y': new Color3(0.98, 0.95, 0.9),
        '+Y': new Color3(0.82, 0.85, 0.92),
        '+X': new Color3(0.96, 0.9, 0.86),
        '-X': new Color3(0.86, 0.9, 0.94),
        '+Z': new Color3(0.92, 0.88, 0.92),
        '-Z': new Color3(0.9, 0.92, 0.86),
      };
      m.diffuseColor = tint[axis].scale(role === 'alcove' ? 0.75 : 1);
      if (role === 'exit') {
        m.emissiveColor = new Color3(0.55, 0.38, 0.18);
        m.diffuseColor = new Color3(1, 0.85, 0.65);
      }
      return m;
    });
  }

  public leverColor(axis: GravityAxis): Color3 {
    // Saturated enough to stand out against grey concrete.
    return this.axisColor(AXIS_LEVER, axis);
  }
}
