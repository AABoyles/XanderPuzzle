import { Color3 } from '@babylonjs/core/Maths/math.color';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { GlowLayer } from '@babylonjs/core/Layers/glowLayer';
import { Material } from '@babylonjs/core/Materials/material';
import { Scene } from '@babylonjs/core/scene';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { GravityAxis } from '../gravity/GravitySystem';
import { applyEnvironment, BaseSkin, canvasTexture, hex, heightToNormal, rng } from './base';
import type { PlacardInk, SurfaceRole } from './types';
import { AXIS_ORDER } from './types';

// --- STATION: plated metal under work lights ----------------------------------------------------

/**
 * The paint on each face's trim: the lever colours, a little dusty. The plating itself only takes a faint wash of it,
 * so walls stay grey metal (and the Margin's red pencil stays readable on all of them).
 */
const STATION_TRIM: Record<GravityAxis, Color3> = {
  '-Y': Color3.FromHexString('#d9a13a'),
  '+Y': Color3.FromHexString('#3f8fe0'),
  '+X': Color3.FromHexString('#e2553a'),
  '-X': Color3.FromHexString('#27b583'),
  '+Z': Color3.FromHexString('#8b63e0'),
  '-Z': Color3.FromHexString('#e6c21a'),
};

export class StationSkin extends BaseSkin {
  readonly id = 'station' as const;
  readonly textureScale = 4;
  readonly placardInk: PlacardInk = { color: '#eef1f4', outline: false, weathered: false, glow: false };
  private readonly plates = new Map<GravityAxis, DynamicTexture>();
  private readonly bump: DynamicTexture;

  constructor(scene: Scene, glow: GlowLayer, colorAssist: boolean) {
    super(scene, colorAssist);
    this.env = applyEnvironment(scene, glow, {
      // Behind the walls is space; the backdrop draws over this.
      sky: ['#07090d', '#05070a', '#020304'],
      hemi: {
        intensity: 0.95,
        sky: new Color3(0.92, 0.96, 1),
        ground: new Color3(0.7, 0.73, 0.8),
        direction: new Vector3(0.15, 1, -0.2),
      },
      // A work light, not a sun: cool, and soft enough that shadows only ground the props.
      sun: {
        direction: new Vector3(-0.4, -1, 0.55),
        intensity: 0.55,
        color: new Color3(0.92, 0.96, 1),
        shadowDarkness: 0.55,
      },
      glow: 0.5,
      exposure: 1.05,
      contrast: 1.15,
      vignette: 1.6,
      toneMapping: false,
    });
    this.bump = canvasTexture(scene, 'stationBump', 512, (ctx, s) => {
      StationSkin.paint(ctx, s, undefined, true);
      heightToNormal(ctx, s, 2.5);
    });
    this.owned.push(this.bump);
  }

  /**
   * One repeat is 4 units: 2 x 2 hull plates, each brushed, bolted along its edges and carrying a painted band in the
   * colour of the gravity that makes this face the floor. With `forBump` it paints the height map instead.
   */
  private static paint(ctx: CanvasRenderingContext2D, s: number, trim: Color3 | undefined, forBump: boolean): void {
    const r = rng(41);
    const t = s / 2;
    ctx.fillStyle = forBump ? '#808080' : '#a4aab2';
    ctx.fillRect(0, 0, s, s);
    // Each plate a slightly different sheet.
    for (let i = 0; i < 2; i++) {
      for (let j = 0; j < 2; j++) {
        const v = forBump ? 128 : 158 + Math.floor(r() * 22);
        ctx.fillStyle = forBump ? '#808080' : `rgb(${v - 4},${v},${v + 7})`;
        ctx.fillRect(i * t, j * t, t, t);
      }
    }
    // Brushing: fine streaks along the sheet.
    for (let i = 0; i < (forBump ? 500 : 2600); i++) {
      const y = r() * s;
      const x = r() * s;
      const len = 30 + r() * 160;
      const light = r() < 0.5;
      ctx.strokeStyle = forBump
        ? `rgba(${light ? '150,150,150' : '105,105,105'},0.25)`
        : `rgba(${light ? '235,240,248' : '60,66,76'},${0.04 + r() * 0.07})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + len, y);
      ctx.stroke();
      if (x + len > s) {
        ctx.beginPath();
        ctx.moveTo(x - s, y);
        ctx.lineTo(x + len - s, y);
        ctx.stroke();
      }
    }
    if (!forBump) {
      // Grime gathered along the seams, and a few scuffs.
      for (let i = 0; i < 220; i++) {
        const along = r() * s;
        const off = (r() - 0.5) * 34;
        const seam = Math.floor(r() * 2) * t;
        const [x, y] = r() < 0.5 ? [along, seam + off] : [seam + off, along];
        ctx.fillStyle = `rgba(30,34,40,${0.03 + r() * 0.05})`;
        ctx.beginPath();
        ctx.arc(((x % s) + s) % s, ((y % s) + s) % s, 5 + r() * 16, 0, Math.PI * 2);
        ctx.fill();
      }
      for (let i = 0; i < 26; i++) {
        const x = r() * s;
        const y = r() * s;
        const a = r() * Math.PI;
        const len = 12 + r() * 50;
        ctx.strokeStyle = `rgba(225,230,238,${0.12 + r() * 0.16})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
        ctx.stroke();
      }
    }
    for (let i = 0; i < 2; i++) {
      for (let j = 0; j < 2; j++) {
        const x0 = i * t;
        const y0 = j * t;
        // The painted band along one edge of the plate, chipped where it has been walked on.
        if (trim && !forBump) {
          const band = { x: x0 + 26, y: y0 + t - 50, w: t - 52, h: 24 };
          ctx.fillStyle = hex(trim);
          ctx.fillRect(band.x, band.y, band.w, band.h);
          ctx.fillStyle = 'rgba(255,255,255,0.18)';
          ctx.fillRect(band.x, band.y, band.w, 2);
          for (let k = 0; k < 16; k++) {
            ctx.fillStyle = `rgba(150,156,165,${0.6 + r() * 0.4})`;
            ctx.fillRect(band.x + r() * band.w, band.y + r() * band.h, 2 + r() * 9, 1 + r() * 4);
          }
        }
        // Bolts along the plate's edges.
        const inset = 13;
        const n = 4;
        for (let k = 0; k <= n; k++) {
          const d = inset + (k * (t - inset * 2)) / n;
          for (const [bx, by] of [
            [x0 + d, y0 + inset],
            [x0 + d, y0 + t - inset],
            [x0 + inset, y0 + d],
            [x0 + t - inset, y0 + d],
          ]) {
            ctx.beginPath();
            ctx.arc(bx, by, 4.2, 0, Math.PI * 2);
            ctx.fillStyle = forBump ? '#d8d8d8' : 'rgba(52,57,66,0.9)';
            ctx.fill();
            if (!forBump) {
              ctx.beginPath();
              ctx.arc(bx - 1, by - 1, 1.8, 0, Math.PI * 2);
              ctx.fillStyle = 'rgba(225,232,242,0.85)';
              ctx.fill();
            }
          }
        }
      }
    }
    // Seams between plates: a dark gap with a bright lip.
    for (const p of [0, t]) {
      ctx.fillStyle = forBump ? '#181818' : 'rgba(22,25,31,0.9)';
      ctx.fillRect(p - 3, 0, 6, s);
      ctx.fillRect(0, p - 3, s, 6);
      ctx.fillRect(p - 3 + s, 0, 6, s);
      ctx.fillRect(0, p - 3 + s, s, 6);
      if (!forBump) {
        ctx.fillStyle = 'rgba(232,238,246,0.4)';
        ctx.fillRect(p + 3, 0, 1.5, s);
        ctx.fillRect(0, p + 3, s, 1.5);
      }
    }
  }

  private plate(axis: GravityAxis): DynamicTexture {
    let tex = this.plates.get(axis);
    if (!tex) {
      tex = canvasTexture(this.scene, `stationPlate_${axis}`, 512, (ctx, s) =>
        StationSkin.paint(ctx, s, this.axisColor(STATION_TRIM, axis), false),
      );
      this.plates.set(axis, tex);
      this.owned.push(tex);
    }
    return tex;
  }

  protected build(role: SurfaceRole): Material[] {
    return AXIS_ORDER.map((axis) => {
      const m = new StandardMaterial(`station_${role}_${axis}`, this.scene);
      m.diffuseTexture = this.plate(axis);
      m.bumpTexture = this.bump;
      m.bumpTexture.level = 0.7;
      const trim = this.axisColor(STATION_TRIM, axis);
      // A faint wash of the face's colour over the steel; structure inside the room is a shade lighter than the hull,
      // corridors a shade darker.
      const steel = new Color3(0.74, 0.77, 0.82);
      const shade = role === 'feature' ? 1.14 : role === 'alcove' ? 0.8 : 1;
      m.diffuseColor = Color3.Lerp(steel, trim, 0.07).scale(shade);
      m.emissiveColor = new Color3(0.03, 0.032, 0.036);
      m.specularColor = new Color3(0.3, 0.32, 0.36);
      m.specularPower = 40;
      if (role === 'exit') {
        // The way out is the lit one: white panels under their own light, whichever way they face.
        m.diffuseColor = new Color3(0.82, 0.85, 0.9);
        m.emissiveColor = new Color3(0.2, 0.26, 0.27);
      }
      return m;
    });
  }

  public leverColor(axis: GravityAxis): Color3 {
    return this.axisColor(STATION_TRIM, axis);
  }
}
