import { BoxParticleEmitter } from '@babylonjs/core/Particles/EmitterTypes/boxParticleEmitter';
import { Color4 } from '@babylonjs/core/Maths/math.color';
import { Constants } from '@babylonjs/core/Engines/constants';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { Effect } from '@babylonjs/core/Materials/effect';
import { GlowLayer } from '@babylonjs/core/Layers/glowLayer';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { CreateSphere } from '@babylonjs/core/Meshes/Builders/sphereBuilder';
import { ParticleSystem } from '@babylonjs/core/Particles/particleSystem';
import { Scene } from '@babylonjs/core/scene';
import { ShaderMaterial } from '@babylonjs/core/Materials/shaderMaterial';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';

/** Planet radius in world units. */
export const PLANET_RADIUS = 150;

export interface BackdropFrame {
  /** Camera world position this frame. */
  cameraPosition: Vector3;
  /** 0 = hidden (in-chamber play), 1 = fully visible. Fades everything. */
  visibility: number;
  /** Unit vector from the camera towards the planet centre (smoothed gravity direction). */
  planetDirection: Vector3;
  /** Distance from the camera to the planet centre, in world units (between ~190 and ~400). */
  planetDistance: number;
  /** Fall speed in units/s (0 to ~150), drives the speed streaks. */
  speed: number;
  /** Frame time in seconds. */
  dt: number;
}

const HALO_SCALE = 1.12;
const MAX_STREAKS = 80;

// Shared GLSL (WebGL1 style). SUN is normalize(0.5, 0.62, 0.6), written out as literals.
const COMMON = `
  const vec3 SUN = vec3(0.50141, 0.62174, 0.60169);

  float hash(vec3 p) {
    p = fract(p * 0.3183099 + vec3(0.1, 0.2, 0.3));
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }

  float vnoise(vec3 x) {
    vec3 i = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(hash(i), hash(i + vec3(1.0, 0.0, 0.0)), f.x),
          mix(hash(i + vec3(0.0, 1.0, 0.0)), hash(i + vec3(1.0, 1.0, 0.0)), f.x), f.y),
      mix(mix(hash(i + vec3(0.0, 0.0, 1.0)), hash(i + vec3(1.0, 0.0, 1.0)), f.x),
          mix(hash(i + vec3(0.0, 1.0, 1.0)), hash(i + vec3(1.0, 1.0, 1.0)), f.x), f.y),
      f.z);
  }

  float fbm(vec3 p) {
    float a = 0.5;
    float s = 0.0;
    for (int i = 0; i < 4; i++) {
      s += a * vnoise(p);
      p = p * 2.03 + vec3(1.7, 9.2, 3.1);
      a *= 0.5;
    }
    return s;
  }
`;

const STARS_VERTEX = `
  precision highp float;
  attribute vec3 position;
  uniform mat4 worldViewProjection;
  varying vec3 vDir;
  void main() {
    vDir = position;
    gl_Position = worldViewProjection * vec4(position, 1.0);
  }
`;

const STARS_FRAGMENT = `
  precision highp float;
  varying vec3 vDir;
  uniform float fade;
  uniform float time;
  ${COMMON}

  vec3 starLayer(vec3 dir, float scale, float density, float seed) {
    vec3 p = dir * scale;
    vec3 id = floor(p);
    vec3 f = fract(p);
    float h = hash(id + seed);
    vec3 c = vec3(0.2) + 0.6 * vec3(hash(id + seed + 1.7), hash(id + seed + 3.1), hash(id + seed + 5.3));
    float d = length(f - c);
    float m = hash(id + seed + 7.7);
    float present = step(1.0 - density, h);
    float size = 0.06 + 0.07 * m;
    float s = 1.0 - smoothstep(0.0, size, d);
    s *= s;
    float tw = 1.0 + 0.25 * sin(time * (2.0 + 4.0 * m) + h * 50.0);
    vec3 tint = mix(vec3(0.7, 0.82, 1.0), vec3(1.0, 0.85, 0.65), hash(id + seed + 9.1));
    return tint * s * present * tw * (0.6 + 2.0 * m * m);
  }

  void main() {
    vec3 dir = normalize(vDir);
    vec3 col = vec3(0.004, 0.008, 0.02);

    // Faint milky band
    vec3 bandN = normalize(vec3(0.3, 0.8, -0.5));
    float band = exp(-pow(dot(dir, bandN) * 3.2, 2.0));
    float cloud = vnoise(dir * 4.0 + vec3(3.0, 1.0, 7.0)) * 0.6 + vnoise(dir * 9.0) * 0.4;
    col += vec3(0.05, 0.06, 0.12) * band * cloud * 0.9;

    col += starLayer(dir, 28.0, 0.10, 0.0);
    col += starLayer(dir, 55.0, 0.07, 11.0);
    col += starLayer(dir, 100.0, 0.05, 23.0) * 0.8;

    // Sun disc and glow
    float sd = max(dot(dir, SUN), 0.0);
    float disc = smoothstep(0.9993, 0.9997, sd);
    float halo = pow(sd, 90.0) * 0.55 + pow(sd, 10.0) * 0.1;
    col += vec3(1.0, 0.95, 0.85) * disc * 2.0 + vec3(1.0, 0.8, 0.55) * halo;

    gl_FragColor = vec4(min(col, vec3(1.5)), fade);
  }
`;

const PLANET_VERTEX = `
  precision highp float;
  attribute vec3 position;
  attribute vec3 normal;
  uniform mat4 worldViewProjection;
  uniform mat4 world;
  varying vec3 vN;
  varying vec3 vW;
  void main() {
    vN = normal;
    vW = (world * vec4(position, 1.0)).xyz;
    gl_Position = worldViewProjection * vec4(position, 1.0);
  }
`;

// The planet is never rotated or non-uniformly scaled, so the object-space normal doubles as the world normal.
const PLANET_FRAGMENT = `
  precision highp float;
  varying vec3 vN;
  varying vec3 vW;
  uniform float fade;
  uniform vec3 camPos;
  ${COMMON}

  void main() {
    vec3 n = normalize(vN);
    vec3 v = normalize(camPos - vW);
    float ndl = dot(n, SUN);

    float e = fbm(n * 3.2 + vec3(3.1, 1.7, 5.3));
    float land = smoothstep(0.50, 0.54, e);
    vec3 ocean = mix(vec3(0.02, 0.12, 0.30), vec3(0.05, 0.40, 0.52), smoothstep(0.30, 0.50, e));
    vec3 ground = mix(vec3(0.16, 0.42, 0.28), vec3(0.46, 0.40, 0.30), smoothstep(0.54, 0.72, e));
    vec3 surf = mix(ocean, ground, land);
    // The poles sit on a tilted axis: gravity is axis-aligned, so an axis-aligned pole would face the camera.
    float ice = smoothstep(0.90, 0.97, abs(dot(n, vec3(0.45, 0.35, -0.82))) + (e - 0.5) * 0.2);
    surf = mix(surf, vec3(0.88, 0.93, 0.97), ice);

    float cl = smoothstep(0.56, 0.8, fbm(n * vec3(3.5, 6.5, 3.5) + vec3(7.0, 2.0, 1.0)));

    float lam = smoothstep(-0.1, 0.5, ndl);
    vec3 col = surf * (0.04 + lam * 1.05);
    float spec = pow(max(dot(reflect(-SUN, n), v), 0.0), 40.0) * (1.0 - land) * (1.0 - cl) * lam;
    col += vec3(0.7, 0.85, 1.0) * spec * 0.5;
    col = mix(col, vec3(1.0) * (0.03 + lam), cl * 0.75);

    // Night side: faint blue ambient and a few city lights
    float night = 1.0 - smoothstep(-0.15, 0.05, ndl);
    col += vec3(0.01, 0.03, 0.07) * night;
    float city = step(0.985, hash(floor(n * 85.0))) * land * (1.0 - cl) * (1.0 - ice);
    col += vec3(1.0, 0.75, 0.4) * city * night * 0.8;

    // Atmosphere rim
    float fr = pow(1.0 - max(dot(n, v), 0.0), 3.0);
    float rimLight = 0.15 + 0.85 * smoothstep(-0.35, 0.35, ndl);
    col += vec3(0.25, 0.55, 1.0) * fr * 1.4 * rimLight;

    gl_FragColor = vec4(min(col, vec3(2.0)), fade);
  }
`;

const HALO_VERTEX = `
  precision highp float;
  attribute vec3 position;
  uniform mat4 worldViewProjection;
  uniform mat4 world;
  varying vec3 vW;
  void main() {
    vW = (world * vec4(position, 1.0)).xyz;
    gl_Position = worldViewProjection * vec4(position, 1.0);
  }
`;

// Additive shell: brightness depends on how close the view ray passes to the planet centre, so it glows just outside
// the planet's limb and fades to nothing at the shell's edge.
const HALO_FRAGMENT = `
  precision highp float;
  varying vec3 vW;
  uniform float fade;
  uniform vec3 camPos;
  uniform vec3 planetCenter;
  ${COMMON}

  void main() {
    float r = ${PLANET_RADIUS.toFixed(1)};
    float rh = r * ${HALO_SCALE.toFixed(2)};
    vec3 rd = normalize(vW - camPos);
    vec3 c = planetCenter - camPos;
    float h = length(c - rd * dot(c, rd));
    float g = 1.0 - smoothstep(r * 0.96, rh, h);
    g = g * g;
    float sunSide = smoothstep(-0.35, 0.45, dot(normalize(vW - planetCenter), SUN));
    vec3 col = mix(vec3(0.2, 0.5, 1.0), vec3(0.5, 0.8, 1.0), sunSide);
    gl_FragColor = vec4(col, g * fade * (0.1 + 0.9 * sunSide) * 0.8);
  }
`;

function registerShader(name: string, vertex: string, fragment: string): void {
  Effect.ShadersStore[`${name}VertexShader`] = vertex;
  Effect.ShadersStore[`${name}FragmentShader`] = fragment;
}

registerShader('spaceStars', STARS_VERTEX, STARS_FRAGMENT);
registerShader('spacePlanet', PLANET_VERTEX, PLANET_FRAGMENT);
registerShader('spaceHalo', HALO_VERTEX, HALO_FRAGMENT);

/**
 * The outer-space scene seen after falling out of a chamber: stars and a sun, a procedural planet with an
 * atmosphere, and speed streaks.
 *
 * Layering: every skin draws an opaque, depth-writing, `infiniteDistance` sky sphere of diameter 900 (radius 450)
 * around the camera. Everything here lives inside that radius (stars at 430, the planet's visible surface at most
 * ~370 away), so it passes the depth test against the sky, and being in rendering group 0 it is still depth-tested
 * against level geometry. All of it is transparent, so it draws after the opaque sky; `alphaIndex` orders it:
 * stars (0), planet (1), atmosphere halo (2), then the particle streaks. Nothing writes depth except the planet, and
 * nothing is affected by fog or the glow layer. At visibility 0 the meshes are disabled and the particles stopped.
 */
export class SpaceBackdrop {
  private readonly stars: Mesh;
  private readonly planet: Mesh;
  private readonly halo: Mesh;
  private readonly starsMat: ShaderMaterial;
  private readonly planetMat: ShaderMaterial;
  private readonly haloMat: ShaderMaterial;
  private readonly streakTex: DynamicTexture;
  private readonly streaks: ParticleSystem;
  private readonly streakEmitter = new Vector3();
  private readonly streakDir = new Vector3();
  private readonly glow: GlowLayer;
  private enabled = true;
  private streaming = false;
  private time = 0;

  constructor(scene: Scene, glow: GlowLayer) {
    this.glow = glow;

    this.stars = CreateSphere(
      'spaceStars',
      { diameter: 860, segments: 16, sideOrientation: Mesh.BACKSIDE },
      scene,
    );
    this.starsMat = new ShaderMaterial(
      'spaceStarsMat',
      scene,
      { vertex: 'spaceStars', fragment: 'spaceStars' },
      {
        attributes: ['position'],
        uniforms: ['worldViewProjection', 'fade', 'time'],
        needAlphaBlending: true,
      },
    );
    this.starsMat.backFaceCulling = false;
    this.starsMat.disableDepthWrite = true;
    this.starsMat.fogEnabled = false;
    this.stars.material = this.starsMat;
    this.stars.infiniteDistance = true;
    this.stars.alwaysSelectAsActiveMesh = true;
    this.stars.alphaIndex = 0;

    this.planet = CreateSphere('spacePlanet', { diameter: PLANET_RADIUS * 2, segments: 48 }, scene);
    this.planetMat = new ShaderMaterial(
      'spacePlanetMat',
      scene,
      { vertex: 'spacePlanet', fragment: 'spacePlanet' },
      {
        attributes: ['position', 'normal'],
        uniforms: ['worldViewProjection', 'world', 'fade', 'camPos'],
        needAlphaBlending: true,
      },
    );
    this.planetMat.fogEnabled = false;
    this.planet.material = this.planetMat;
    this.planet.alphaIndex = 1;

    this.halo = CreateSphere(
      'spaceHalo',
      { diameter: PLANET_RADIUS * 2 * HALO_SCALE, segments: 32 },
      scene,
    );
    this.haloMat = new ShaderMaterial(
      'spaceHaloMat',
      scene,
      { vertex: 'spaceHalo', fragment: 'spaceHalo' },
      {
        attributes: ['position'],
        uniforms: ['worldViewProjection', 'world', 'fade', 'camPos', 'planetCenter'],
        needAlphaBlending: true,
      },
    );
    this.haloMat.alphaMode = Constants.ALPHA_ADD;
    this.haloMat.disableDepthWrite = true;
    this.haloMat.fogEnabled = false;
    this.halo.material = this.haloMat;
    this.halo.alphaIndex = 2;

    for (const mesh of [this.stars, this.planet, this.halo]) {
      mesh.isPickable = false;
      mesh.checkCollisions = false;
      mesh.receiveShadows = false;
      mesh.applyFog = false;
      mesh.renderingGroupId = 0;
      glow.addExcludedMesh(mesh);
    }

    // Streaks: a tiny radial dot, stretched along the velocity.
    this.streakTex = new DynamicTexture('spaceStreakDot', { width: 32, height: 32 }, scene, false);
    const ctx = this.streakTex.getContext();
    const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 32, 32);
    this.streakTex.update();

    const ps = new ParticleSystem('spaceStreaks', MAX_STREAKS, scene);
    ps.particleTexture = this.streakTex;
    ps.emitter = this.streakEmitter;
    ps.particleEmitterType = new BoxParticleEmitter();
    const box = ps.particleEmitterType as BoxParticleEmitter;
    box.minEmitBox = new Vector3(-30, -30, -30);
    box.maxEmitBox = new Vector3(30, 30, 30);
    ps.billboardMode = ParticleSystem.BILLBOARDMODE_STRETCHED;
    ps.blendMode = ParticleSystem.BLENDMODE_ADD;
    ps.color1 = new Color4(0.7, 0.8, 1, 0.22);
    ps.color2 = new Color4(0.9, 0.95, 1, 0.3);
    ps.colorDead = new Color4(0.7, 0.8, 1, 0);
    ps.minSize = 0.3;
    ps.maxSize = 0.6;
    ps.minScaleX = 0.12;
    ps.maxScaleX = 0.2;
    ps.minScaleY = 3;
    ps.maxScaleY = 5;
    ps.minLifeTime = 0.5;
    ps.maxLifeTime = 0.9;
    ps.minEmitPower = 1;
    ps.maxEmitPower = 1;
    ps.emitRate = 0;
    ps.updateSpeed = 1 / 60;
    ps.renderingGroupId = 0;
    ps.disposeOnStop = false;
    this.streaks = ps;

    this.setActive(false);
  }

  update(frame: BackdropFrame): void {
    const vis = Math.min(Math.max(frame.visibility, 0), 1);
    if (vis <= 0) {
      this.setActive(false);
      return;
    }
    this.setActive(true);
    this.time += frame.dt;

    const { cameraPosition: cam, planetDirection: dir } = frame;
    const px = cam.x + dir.x * frame.planetDistance;
    const py = cam.y + dir.y * frame.planetDistance;
    const pz = cam.z + dir.z * frame.planetDistance;
    this.planet.position.set(px, py, pz);
    this.halo.position.set(px, py, pz);

    this.starsMat.setFloat('fade', vis);
    this.starsMat.setFloat('time', this.time);
    this.planetMat.setFloat('fade', vis);
    this.planetMat.setVector3('camPos', cam);
    this.haloMat.setFloat('fade', vis);
    this.haloMat.setVector3('camPos', cam);
    this.haloMat.setVector3('planetCenter', this.planet.position);

    // Streaks: emitted ahead of the camera, moving away from the planet, so they rush past "upwards".
    const strength = Math.min(Math.max(frame.speed / 150, 0), 1) * vis;
    if (strength < 0.01) {
      this.stopStreaks();
      return;
    }
    this.streakEmitter.set(cam.x + dir.x * 40, cam.y + dir.y * 40, cam.z + dir.z * 40);
    this.streakDir.set(-dir.x, -dir.y, -dir.z);
    const box = this.streaks.particleEmitterType as BoxParticleEmitter;
    box.direction1.copyFrom(this.streakDir);
    box.direction2.copyFrom(this.streakDir);
    this.streaks.minEmitPower = this.streaks.maxEmitPower = Math.max(frame.speed * 0.3, 1);
    this.streaks.emitRate = strength * 90;
    this.streaks.minScaleY = 1 + strength * 3;
    this.streaks.maxScaleY = 2 + strength * 4;
    if (!this.streaming) {
      this.streaks.start();
      this.streaming = true;
    }
  }

  dispose(): void {
    this.stopStreaks();
    this.streaks.dispose();
    this.streakTex.dispose();
    for (const mesh of [this.stars, this.planet, this.halo]) {
      this.glow.removeExcludedMesh(mesh);
      mesh.dispose();
    }
    this.starsMat.dispose();
    this.planetMat.dispose();
    this.haloMat.dispose();
  }

  private setActive(on: boolean): void {
    if (on === this.enabled) return;
    this.enabled = on;
    this.stars.setEnabled(on);
    this.planet.setEnabled(on);
    this.halo.setEnabled(on);
    if (!on) this.stopStreaks();
  }

  private stopStreaks(): void {
    if (!this.streaming) return;
    this.streaks.stop();
    this.streaks.reset();
    this.streaming = false;
  }
}
