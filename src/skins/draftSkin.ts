import { Color3, Color4 } from '@babylonjs/core/Maths/math.color';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { GlowLayer } from '@babylonjs/core/Layers/glowLayer';
import { Material } from '@babylonjs/core/Materials/material';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { Scene } from '@babylonjs/core/scene';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { GravityAxis } from '../gravity/GravitySystem';
import { applyEnvironment, BaseSkin, canvasTexture, rng } from './base';
import type { PlacardInk, SurfaceRole } from './types';
import { AXIS_ORDER } from './types';

// --- DRAFT: ink on drafting paper ---------------------------------------------------------------

/** How heavily each orientation is hatched: ceilings darkest, floors clean. */
const HATCH: Record<GravityAxis, { density: number; angle: number }> = {
  '-Y': { density: 0, angle: 0 },
  '+Y': { density: 3, angle: Math.PI / 4 },
  '+X': { density: 1, angle: Math.PI / 4 },
  '-X': { density: 2, angle: -Math.PI / 4 },
  '+Z': { density: 2, angle: Math.PI / 4 },
  '-Z': { density: 1, angle: -Math.PI / 4 },
};

const DRAFT_INK: Record<GravityAxis, Color3> = {
  '-Y': Color3.FromHexString('#b8862f'),
  '+Y': Color3.FromHexString('#2f6fb8'),
  '+X': Color3.FromHexString('#c4442f'),
  '-X': Color3.FromHexString('#2f9a6f'),
  '+Z': Color3.FromHexString('#7a4fb8'),
  '-Z': Color3.FromHexString('#c48a1f'),
};

export class DraftSkin extends BaseSkin {
  readonly id = 'draft' as const;
  readonly textureScale = 2;
  readonly placardInk: PlacardInk = { color: '#1c2333', outline: true, weathered: false, glow: false };
  private readonly sheets = new Map<string, DynamicTexture>();

  constructor(scene: Scene, glow: GlowLayer, colorAssist: boolean) {
    super(scene, colorAssist);
    this.env = applyEnvironment(scene, glow, {
      sky: ['#f4eedf', '#efe7d3', '#e6dcc4'],
      fog: { color: Color3.FromHexString('#f1eadb'), density: 0.03 },
      hemi: { intensity: 1, sky: Color3.White(), ground: Color3.White(), direction: Vector3.Up() },
      glow: 0,
      exposure: 1,
      contrast: 1,
      vignette: 0.6,
      toneMapping: false,
    });
  }

  private sheet(density: number, angle: number, wash?: string): DynamicTexture {
    const key = `${density}:${angle}:${wash ?? ''}`;
    let tex = this.sheets.get(key);
    if (tex) return tex;
    tex = canvasTexture(this.scene, `draft_${key}`, 1024, (ctx, s) => {
      const r = rng(23 + density * 7);
      ctx.fillStyle = '#f6f0e1';
      ctx.fillRect(0, 0, s, s);
      if (wash) {
        ctx.fillStyle = wash;
        ctx.fillRect(0, 0, s, s);
      }
      // Paper grain.
      for (let i = 0; i < 9000; i++) {
        const v = 200 + r() * 55;
        ctx.fillStyle = `rgba(${v},${v * 0.97},${v * 0.9},0.12)`;
        ctx.fillRect(r() * s, r() * s, 2, 2);
      }
      // Drafting grid: fine every 0.25 units, heavier every unit (texture spans 2 units).
      ctx.strokeStyle = 'rgba(80,120,170,0.18)';
      ctx.lineWidth = 1.5;
      for (let i = 0; i <= 8; i++) {
        const p = (i * s) / 8;
        ctx.beginPath();
        ctx.moveTo(p, 0);
        ctx.lineTo(p, s);
        ctx.moveTo(0, p);
        ctx.lineTo(s, p);
        ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(60,100,160,0.35)';
      ctx.lineWidth = 3;
      for (const p of [0, s / 2, s]) {
        ctx.beginPath();
        ctx.moveTo(p, 0);
        ctx.lineTo(p, s);
        ctx.moveTo(0, p);
        ctx.lineTo(s, p);
        ctx.stroke();
      }
      // Hand-drawn hatching, slightly wobbly, tiled seamlessly by drawing across the wrap.
      if (density > 0) {
        const spacing = [0, 40, 26, 16][density];
        ctx.save();
        ctx.translate(s / 2, s / 2);
        ctx.rotate(angle);
        ctx.strokeStyle = 'rgba(30,30,40,0.7)';
        for (let d = -s; d <= s; d += spacing) {
          ctx.lineWidth = 2.2 + r() * 1.6;
          ctx.beginPath();
          const j = (r() - 0.5) * 3;
          ctx.moveTo(-s, d + j);
          ctx.quadraticCurveTo(0, d + (r() - 0.5) * 6, s, d + (r() - 0.5) * 3);
          ctx.stroke();
        }
        ctx.restore();
      }
    });
    this.sheets.set(key, tex);
    this.owned.push(tex);
    return tex;
  }

  protected build(role: SurfaceRole): Material[] {
    return AXIS_ORDER.map((axis) => {
      const h = HATCH[axis];
      const wash = role === 'exit' ? 'rgba(90,190,120,0.35)' : role === 'alcove' ? 'rgba(150,130,100,0.12)' : undefined;
      const m = new StandardMaterial(`draft_${role}_${axis}`, this.scene);
      // Unlit: tone comes from the hatching, not the lights.
      m.disableLighting = true;
      m.emissiveTexture = this.sheet(h.density, h.angle, wash);
      m.diffuseColor = Color3.Black();
      m.specularColor = Color3.Black();
      return m;
    });
  }

  public decorate(mesh: Mesh): void {
    mesh.enableEdgesRendering(0.95);
    mesh.edgesWidth = 2.5;
    mesh.edgesColor = new Color4(0.12, 0.11, 0.14, 1);
  }

  public decorateProp(mesh: Mesh): void {
    mesh.enableEdgesRendering(0.95);
    mesh.edgesWidth = 2;
    mesh.edgesColor = new Color4(0.12, 0.11, 0.14, 1);
  }

  public leverColor(axis: GravityAxis): Color3 {
    return this.axisColor(DRAFT_INK, axis);
  }
}
