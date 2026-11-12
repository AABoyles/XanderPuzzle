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
import { GravityAxis } from '../gravity/GravitySystem';
import { COLOR_ASSIST_AXIS } from './axisPalette';
import type { PlacardInk, SkinId, SkinRuntime, SurfaceRole } from './types';

export const hex = (c: Color3) => c.toHexString();

// --- Shared helpers -----------------------------------------------------------------------------

/** Deterministic PRNG so procedural textures look the same every load. */
export function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function canvasTexture(
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
export function applyEnvironment(scene: Scene, glow: GlowLayer, env: Environment) {
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
export abstract class BaseSkin implements SkinRuntime {
  abstract readonly id: SkinId;
  abstract readonly textureScale: number;
  abstract readonly placardInk: PlacardInk;
  protected readonly cache = new Map<string, Material[]>();
  protected readonly owned: { dispose(): void }[] = [];
  protected env?: ReturnType<typeof applyEnvironment>;

  constructor(
    protected readonly scene: Scene,
    /** The colour-blind palette replaces this skin's own axis colours (lever, HUD and any axis-coloured surface). */
    protected readonly colorAssist: boolean,
  ) {}

  /** An axis's colour: the skin's own, or the colour-blind palette's when the player has asked for it. */
  protected axisColor(own: Record<GravityAxis, Color3>, axis: GravityAxis): Color3 {
    if (!this.colorAssist) return own[axis];
    const [r, g, b] = COLOR_ASSIST_AXIS[axis];
    return new Color3(r, g, b);
  }

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
export function heightToNormal(ctx: CanvasRenderingContext2D, size: number, strength: number): void {
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
