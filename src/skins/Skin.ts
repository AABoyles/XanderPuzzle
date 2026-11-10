import { Color3, Color4 } from '@babylonjs/core/Maths/math.color';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { GlowLayer } from '@babylonjs/core/Layers/glowLayer';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { ImageProcessingConfiguration } from '@babylonjs/core/Materials/imageProcessingConfiguration';
import { Material } from '@babylonjs/core/Materials/material';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { CreateSphere } from '@babylonjs/core/Meshes/Builders/sphereBuilder';
import { Scene } from '@babylonjs/core/scene';
import { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { GridMaterial } from '@babylonjs/materials/grid/gridMaterial';
import { GravityAxis } from '../gravity/GravitySystem';

/**
 * A skin decides how level geometry, levers and the world around them look. Geometry is always
 * axis-aligned, so every face of every box is "the floor" under exactly one gravity axis: the
 * one pointing into it. Skins colour faces by that axis, which is what lets Axis match each
 * wall to the lever that makes it the floor.
 */

export type SkinId = 'neon' | 'axis' | 'monolith' | 'draft';
export const SKIN_IDS: SkinId[] = ['axis', 'monolith', 'draft', 'neon'];
export const SKIN_LABELS: Record<SkinId, string> = {
  neon: 'NEON',
  axis: 'AXIS',
  monolith: 'MONOLITH',
  draft: 'DRAFT',
};

/** What a surface is for. `shell` is the outer walls of rooms; `feature` is anything inside. */
export type SurfaceRole = 'shell' | 'feature' | 'alcove' | 'exit';

/** Order used for per-face sub-materials. */
export const AXIS_ORDER: GravityAxis[] = ['+X', '-X', '+Y', '-Y', '+Z', '-Z'];

/** How the facility's stencilled placards are painted in a skin (the Margin's notes look the same in every skin). */
export interface PlacardInk {
  /** CSS colour of the paint. */
  color: string;
  /** Lettering drawn as an outline instead of filled. */
  outline: boolean;
  /** Paint flaked off in places. */
  weathered: boolean;
  /** Self-lit, so it glows rather than taking the scene's light. */
  glow: boolean;
}

export interface SkinRuntime {
  readonly id: SkinId;
  /** How stencilled placards are painted. */
  readonly placardInk: PlacardInk;
  /** One material per gravity axis, in AXIS_ORDER. `accent` is the level's signature colour. */
  materials(role: SurfaceRole, accent: Color3): Material[];
  /** World units covered by one repeat of the surface texture. */
  readonly textureScale: number;
  leverColor(axis: GravityAxis): Color3;
  /** HUD text colour for the current gravity, as a CSS colour. */
  hudColor(axis: GravityAxis): string;
  /** Hook for each level mesh after it is built (shadows, outlines). */
  decorate(mesh: Mesh, role: SurfaceRole): void;
  /** Hook for lever and prop meshes. */
  decorateProp(mesh: Mesh): void;
  dispose(): void;
}

const hex = (c: Color3) => c.toHexString();

// --- Shared helpers -----------------------------------------------------------------------------

/** Deterministic PRNG so procedural textures look the same every load. */
function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function canvasTexture(
  scene: Scene,
  name: string,
  size: number,
  paint: (ctx: CanvasRenderingContext2D, size: number) => void,
): DynamicTexture {
  const tex = new DynamicTexture(name, { width: size, height: size }, scene, true);
  paint(tex.getContext() as unknown as CanvasRenderingContext2D, size);
  tex.update();
  tex.wrapU = Texture.WRAP_ADDRESSMODE;
  tex.wrapV = Texture.WRAP_ADDRESSMODE;
  tex.anisotropicFilteringLevel = 8;
  return tex;
}

interface Environment {
  sky: [string, string, string];
  fog?: { color: Color3; density: number };
  hemi: { intensity: number; sky: Color3; ground: Color3; direction: Vector3 };
  sun?: { direction: Vector3; intensity: number; color: Color3; shadowDarkness: number };
  glow: number;
  exposure: number;
  contrast: number;
  vignette: number;
  toneMapping: boolean;
}

/** Lights, sky, fog and post-processing for a skin. Returns what it made, for disposal. */
function applyEnvironment(scene: Scene, glow: GlowLayer, env: Environment) {
  const sky = CreateSphere('sky', { diameter: 900, sideOrientation: Mesh.BACKSIDE }, scene);
  const skyTex = new DynamicTexture('skyGradient', { width: 4, height: 256 }, scene, false);
  const ctx = skyTex.getContext();
  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, env.sky[0]);
  grad.addColorStop(0.55, env.sky[1]);
  grad.addColorStop(1, env.sky[2]);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 4, 256);
  skyTex.update();
  const skyMat = new StandardMaterial('skyMat', scene);
  skyMat.emissiveTexture = skyTex;
  skyMat.diffuseColor = Color3.Black();
  skyMat.specularColor = Color3.Black();
  skyMat.disableLighting = true;
  skyMat.backFaceCulling = false;
  skyMat.fogEnabled = false;
  sky.material = skyMat;
  sky.infiniteDistance = true;
  sky.isPickable = false;
  sky.applyFog = false;

  const top = Color3.FromHexString(env.sky[0]);
  scene.clearColor = new Color4(top.r, top.g, top.b, 1);

  if (env.fog) {
    scene.fogMode = Scene.FOGMODE_EXP2;
    scene.fogColor = env.fog.color;
    scene.fogDensity = env.fog.density;
  } else {
    scene.fogMode = Scene.FOGMODE_NONE;
  }

  const hemi = new HemisphericLight('skinHemi', env.hemi.direction, scene);
  hemi.intensity = env.hemi.intensity;
  hemi.diffuse = env.hemi.sky;
  hemi.groundColor = env.hemi.ground;
  hemi.specular = Color3.Black();

  let sun: DirectionalLight | undefined;
  let shadows: ShadowGenerator | undefined;
  if (env.sun) {
    sun = new DirectionalLight('skinSun', env.sun.direction.normalizeToNew(), scene);
    sun.intensity = env.sun.intensity;
    sun.diffuse = env.sun.color;
    sun.specular = env.sun.color.scale(0.2);
    sun.position = env.sun.direction.normalizeToNew().scale(-60);
    shadows = new ShadowGenerator(2048, sun);
    shadows.usePercentageCloserFiltering = true;
    shadows.filteringQuality = ShadowGenerator.QUALITY_MEDIUM;
    shadows.darkness = env.sun.shadowDarkness;
    shadows.bias = 0.002;
    shadows.normalBias = 0.02;
  }

  glow.intensity = env.glow;

  const ip = scene.imageProcessingConfiguration;
  ip.toneMappingEnabled = env.toneMapping;
  ip.toneMappingType = ImageProcessingConfiguration.TONEMAPPING_ACES;
  ip.exposure = env.exposure;
  ip.contrast = env.contrast;
  ip.vignetteEnabled = env.vignette > 0;
  ip.vignetteWeight = env.vignette;
  ip.vignetteColor = new Color4(0, 0, 0, 0);
  ip.vignetteBlendMode = ImageProcessingConfiguration.VIGNETTEMODE_MULTIPLY;

  return {
    shadows,
    dispose() {
      shadows?.dispose();
      sun?.dispose();
      hemi.dispose();
      sky.dispose(false, true);
    },
  };
}

/** Shared bookkeeping: caches per-role material arrays and disposes them with the skin. */
abstract class BaseSkin implements SkinRuntime {
  abstract readonly id: SkinId;
  abstract readonly textureScale: number;
  abstract readonly placardInk: PlacardInk;
  protected readonly cache = new Map<string, Material[]>();
  protected readonly owned: { dispose(): void }[] = [];
  protected env?: ReturnType<typeof applyEnvironment>;

  constructor(protected readonly scene: Scene) {}

  public materials(role: SurfaceRole, accent: Color3): Material[] {
    const key = `${role}:${this.usesAccent ? hex(accent) : ''}`;
    let mats = this.cache.get(key);
    if (!mats) {
      mats = this.build(role, accent);
      new Set(mats).forEach((m) => this.owned.push(m));
      this.cache.set(key, mats);
    }
    return mats;
  }

  protected usesAccent = false;
  protected abstract build(role: SurfaceRole, accent: Color3): Material[];
  public abstract leverColor(axis: GravityAxis): Color3;

  public hudColor(axis: GravityAxis): string {
    // Lightened so it reads on the HUD's dark panel.
    return hex(Color3.Lerp(this.leverColor(axis), Color3.White(), 0.45));
  }

  public decorate(mesh: Mesh, role: SurfaceRole): void {
    if (!this.env?.shadows) return;
    mesh.receiveShadows = true;
    // Shell walls would shadow the whole interior from an outside sun; only features cast.
    if (role === 'feature') this.env.shadows.addShadowCaster(mesh);
  }

  public decorateProp(mesh: Mesh): void {
    if (!this.env?.shadows) return;
    mesh.receiveShadows = true;
    this.env.shadows.addShadowCaster(mesh);
  }

  public dispose(): void {
    this.owned.forEach((o) => o.dispose());
    this.env?.dispose();
  }
}

/** Converts a greyscale height map drawn on `ctx` into a tangent-space normal map, in place. */
function heightToNormal(ctx: CanvasRenderingContext2D, size: number, strength: number): void {
  const img = ctx.getImageData(0, 0, size, size);
  const h = new Float32Array(size * size);
  for (let i = 0; i < size * size; i++) h[i] = img.data[i * 4] / 255;
  const at = (x: number, y: number) => h[((y + size) % size) * size + ((x + size) % size)];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * strength;
      const dy = (at(x, y + 1) - at(x, y - 1)) * strength;
      const len = Math.hypot(dx, dy, 1);
      const o = (y * size + x) * 4;
      img.data[o] = ((-dx / len) * 0.5 + 0.5) * 255;
      img.data[o + 1] = ((-dy / len) * 0.5 + 0.5) * 255;
      img.data[o + 2] = ((1 / len) * 0.5 + 0.5) * 255;
      img.data[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
}

// --- NEON: the original look -------------------------------------------------------------------

const NEON_LEVER: Record<GravityAxis, Color3> = {
  '+X': new Color3(1.0, 0.35, 0.35),
  '-X': new Color3(0.6, 0.15, 0.15),
  '+Y': new Color3(0.35, 1.0, 0.45),
  '-Y': new Color3(0.15, 0.55, 0.2),
  '+Z': new Color3(0.35, 0.55, 1.0),
  '-Z': new Color3(0.15, 0.25, 0.6),
};

class NeonSkin extends BaseSkin {
  readonly id = 'neon' as const;
  readonly textureScale = 1;
  readonly placardInk: PlacardInk = { color: '#7fffd0', outline: false, weathered: false, glow: true };
  protected usesAccent = true;

  constructor(scene: Scene, glow: GlowLayer) {
    super(scene);
    this.env = applyEnvironment(scene, glow, {
      sky: ['#0a1420', '#050810', '#000000'],
      hemi: { intensity: 0.55, sky: Color3.White(), ground: new Color3(0.15, 0.17, 0.22), direction: new Vector3(0.3, 1, 0.2) },
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
    if (role === 'exit') return Array(6).fill(this.grid('neonExit', new Color3(0.05, 0.12, 0.08), new Color3(0.3, 1, 0.5), 0.8));
    if (role === 'alcove') return Array(6).fill(this.grid('neonAlcove', new Color3(0.07, 0.08, 0.1), new Color3(0.5, 0.35, 0.8), 0.8));
    const wall = this.grid('neonWall', new Color3(0.08, 0.09, 0.12), accent, 1);
    const floor = this.grid('neonFloor', new Color3(0.1, 0.1, 0.13), new Color3(0.9, 0.6, 0.2), 1);
    // The natural floor keeps its orange grid.
    return AXIS_ORDER.map((a) => (a === '-Y' ? floor : wall));
  }

  public leverColor(axis: GravityAxis): Color3 {
    return NEON_LEVER[axis];
  }

  public hudColor(): string {
    return '#bfe3ff';
  }
}

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
const AXIS_LEVER: Record<GravityAxis, Color3> = {
  '-Y': Color3.FromHexString('#c08a2e'),
  '+Y': Color3.FromHexString('#2f78d0'),
  '+X': Color3.FromHexString('#e0482c'),
  '-X': Color3.FromHexString('#1fa874'),
  '+Z': Color3.FromHexString('#7a52d6'),
  '-Z': Color3.FromHexString('#e0a400'),
};

class AxisSkin extends BaseSkin {
  readonly id = 'axis' as const;
  readonly textureScale = 4;
  readonly placardInk: PlacardInk = { color: '#3a3e47', outline: false, weathered: false, glow: false };
  private readonly tiles: DynamicTexture;

  constructor(scene: Scene, glow: GlowLayer) {
    super(scene);
    this.env = applyEnvironment(scene, glow, {
      sky: ['#f6e9df', '#e9d9e6', '#cfd9ec'],
      fog: { color: Color3.FromHexString('#efe3e3'), density: 0.012 },
      hemi: { intensity: 0.6, sky: new Color3(1, 0.97, 0.94), ground: new Color3(0.6, 0.62, 0.72), direction: new Vector3(0.2, 1, -0.3) },
      sun: { direction: new Vector3(-0.45, -1, -0.6), intensity: 0.7, color: new Color3(1, 0.95, 0.88), shadowDarkness: 0.45 },
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
      const base = AXIS_PALETTE[axis];
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
    return AXIS_LEVER[axis];
  }

  public hudColor(axis: GravityAxis): string {
    return hex(AXIS_PALETTE[axis]);
  }
}

// --- MONOLITH: warm board-formed concrete under a low sun ---------------------------------------

class MonolithSkin extends BaseSkin {
  readonly id = 'monolith' as const;
  readonly textureScale = 4;
  readonly placardInk: PlacardInk = { color: '#ece6d8', outline: false, weathered: true, glow: false };
  private readonly concrete: DynamicTexture;
  private readonly bump: DynamicTexture;

  constructor(scene: Scene, glow: GlowLayer) {
    super(scene);
    this.env = applyEnvironment(scene, glow, {
      sky: ['#d9b48a', '#8a6a55', '#2a2220'],
      fog: { color: new Color3(0.62, 0.5, 0.4), density: 0.022 },
      hemi: { intensity: 0.95, sky: new Color3(0.95, 0.86, 0.76), ground: new Color3(0.45, 0.47, 0.55), direction: new Vector3(-0.2, 1, 0.1) },
      sun: { direction: new Vector3(0.5, -0.75, -0.45), intensity: 1.7, color: new Color3(1, 0.86, 0.7), shadowDarkness: 0.2 },
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
    return AXIS_LEVER[axis];
  }
}

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

class DraftSkin extends BaseSkin {
  readonly id = 'draft' as const;
  readonly textureScale = 2;
  readonly placardInk: PlacardInk = { color: '#1c2333', outline: true, weathered: false, glow: false };
  private readonly sheets = new Map<string, DynamicTexture>();

  constructor(scene: Scene, glow: GlowLayer) {
    super(scene);
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
    return DRAFT_INK[axis];
  }
}

export function createSkin(id: SkinId, scene: Scene, glow: GlowLayer): SkinRuntime {
  switch (id) {
    case 'neon':
      return new NeonSkin(scene, glow);
    case 'monolith':
      return new MonolithSkin(scene, glow);
    case 'draft':
      return new DraftSkin(scene, glow);
    default:
      return new AxisSkin(scene, glow);
  }
}
