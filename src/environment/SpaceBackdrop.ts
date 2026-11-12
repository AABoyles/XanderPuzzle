import { BoxParticleEmitter } from '@babylonjs/core/Particles/EmitterTypes/boxParticleEmitter';
import { Color4 } from '@babylonjs/core/Maths/math.color';
import { Constants } from '@babylonjs/core/Engines/constants';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import './spaceShaders';
import { HALO_SCALE, PLANET_RADIUS } from './spaceShaders';
export { PLANET_RADIUS };
import { GlowLayer } from '@babylonjs/core/Layers/glowLayer';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { CreateBox } from '@babylonjs/core/Meshes/Builders/boxBuilder';
import { CreateSphere } from '@babylonjs/core/Meshes/Builders/sphereBuilder';
import { CreateTorus } from '@babylonjs/core/Meshes/Builders/torusBuilder';
import { ParticleSystem } from '@babylonjs/core/Particles/particleSystem';
import { Scene } from '@babylonjs/core/scene';
import { ShaderMaterial } from '@babylonjs/core/Materials/shaderMaterial';
import { Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { chamberHull, cubeAngle, FIELD_COUNT, fieldBasis, layoutField, toWorld } from './ballastField';
import type { Aabb } from '../physics/boxPhysics';
import type { FieldCube } from './ballastField';
import { stormStrength } from './fall';
import type { Vec3 } from './fall';

/**
 * The Crown is the planet's shield, so it stands between the planet and its star: seen from the field, which hangs
 * under the Crown, the star is this far (radians, 15 degrees) off the line from the planet through the Crown. That
 * puts its glare just outside the ring's rim in a skylight, and leaves the planet below in daylight but for the dusk
 * at one limb. `SUN_AZIMUTH` is which way round that line it is tipped.
 */
export const SUN_OFFSET = (15 * Math.PI) / 180;
const SUN_AZIMUTH = 2.2;

/** Planet radius in world units. */

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
  /** Share of the ballast field that has gone dark (0-1), read when a fall begins. */
  darkFraction?: number;
  /** How many lights show on the planet's night side, 0 (none) to 1. */
  planetLights?: number;
  /**
   * The chamber has a window to look out of (`BuiltLevel.vista`): the stars, the field and the Crown show from inside
   * it too, at full strength, whatever `visibility` is.
   */
  vista?: boolean;
  /**
   * What the planet, the Crown and the field are placed around, when that is not the camera: the title's outside
   * view is anchored on the chamber, so the camera can stand back and see all three with the cube between them.
   */
  anchor?: Vector3;
  /** How far the Crown hangs above the camera or anchor; `CROWN_DISTANCE` unless the title's view pulls it in. */
  crownDistance?: number;
  /**
   * Unit direction towards the star, when it is not the usual `SUN_OFFSET` off the line from the planet through the
   * Crown: the title's view stands to one side, and puts the star where it can be seen above the Crown.
   */
  sunDirection?: Vector3;
  /** The chamber's own hull has gone dark like the field's dead cubes (the Descent's cube, once out of trim). */
  hullDark?: boolean;
  /** 0-1: one new light on the planet, straight below the camera (the end of the Descent). */
  arrival?: number;
}

const MAX_STREAKS = 80;

/**
 * The Crown hangs this far above the camera (opposite the planet), with this diameter: inside the sky sphere. From
 * straight below, its rim is about 14 degrees off the zenith, so a skylight a few units across frames the whole ring.
 */
export const CROWN_DISTANCE = 330;
const CROWN_DIAMETER = 160;
const CROWN_THICKNESS = 12;

/**
 * The outer-space scene seen after falling out of a chamber: stars and a sun, a procedural planet with an
 * atmosphere, the ballast field's other cubes (see `ballastField.ts`), the Crown, and speed streaks. Inside a chamber
 * the star sphere is drawn black over the skin's sky, and the planet stays where gravity points: that is all a hole
 * shows (black, or the planet through a hole in the floor).
 *
 * Layering: every skin draws an opaque, depth-writing, `infiniteDistance` sky sphere of diameter 900 (radius 450)
 * around the camera. Everything here lives inside that radius (stars at 430, the planet's visible surface at most
 * ~370 away), so it passes the depth test against the sky, and being in rendering group 0 it is still depth-tested
 * against level geometry. All of it is transparent, so it draws after the opaque sky; `alphaIndex` orders it:
 * stars (0), the Crown overhead (0.5), planet (1), atmosphere halo (2), field cubes (3, depth-tested against the
 * planet and each other), then the particle streaks. Nothing writes depth except the planet, and
 * nothing is affected by fog or the glow layer (except the hull, which occludes glow). At visibility 0 only the black
 * sky, the planet and its halo are enabled; the rest are disabled and the particles stopped.
 */
export class SpaceBackdrop {
  private readonly stars: Mesh;
  private readonly planet: Mesh;
  private readonly halo: Mesh;
  private readonly starsMat: ShaderMaterial;
  private readonly planetMat: ShaderMaterial;
  private readonly haloMat: ShaderMaterial;
  private readonly crown: Mesh;
  private readonly crownMat: ShaderMaterial;
  private readonly crownTurn = new Quaternion();
  private readonly arrivalDir = new Vector3();
  private readonly sun = new Vector3(0, 1, 0);
  private stormNow = 0;

  /** Jumps the backdrop's clock to `t` seconds (dev and tests: e.g. to the middle of a storm). */
  public seek(t: number): void {
    this.time = t;
  }

  /** How hard the star's storm is blowing right now (0-1); see `stormStrength`. */
  public get storm(): number {
    return this.stormNow;
  }
  /** One box per field cube, laid out afresh at each escape; `cubeMats` are [lit, dark]. */
  private readonly cubeMeshes: Mesh[] = [];
  private readonly cubeMats: [ShaderMaterial, ShaderMaterial];
  /**
   * The outside of the chamber the player is in, dressed as a lit field cube. Its faces point outwards and back faces
   * are culled, so it is invisible from inside the chamber (or looking out of a hole) and only seen after a fall.
   */
  private readonly hull: Mesh;
  private field: FieldCube[] = [];
  /** Where the fall began and the field's axes, fixed for the whole fall so the player falls past the field. */
  private fieldOrigin: Vec3 = [0, 0, 0];
  private fieldAxes = fieldBasis([0, -1, 0]);
  private falls = 0;
  private readonly spin = new Quaternion();
  private readonly spinAxis = new Vector3();
  private readonly streakTex: DynamicTexture;
  private readonly streaks: ParticleSystem;
  private readonly streakEmitter = new Vector3();
  private readonly streakDir = new Vector3();
  private readonly glow: GlowLayer;
  /** The spokes and hub, children of the ring. */
  private readonly crownParts: Mesh[] = [];
  /** True while the field and the Crown show: after an escape, or in a chamber with a window (`vista`). */
  private shown = true;
  /** True while the player is outside the chamber: its hull and the streaks show only then. */
  private outside = true;
  private streaming = false;
  private time = 0;

  constructor(scene: Scene, glow: GlowLayer) {
    this.glow = glow;

    this.stars = CreateSphere('spaceStars', { diameter: 860, segments: 16, sideOrientation: Mesh.BACKSIDE }, scene);
    this.starsMat = new ShaderMaterial(
      'spaceStarsMat',
      scene,
      { vertex: 'spaceStars', fragment: 'spaceStars' },
      {
        attributes: ['position'],
        uniforms: ['sunDir', 'worldViewProjection', 'fade', 'shine', 'time', 'storm'],
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
        uniforms: ['sunDir', 'worldViewProjection', 'world', 'fade', 'lights', 'arrival', 'arrivalDir', 'camPos'],
        needAlphaBlending: true,
      },
    );
    this.planetMat.fogEnabled = false;
    this.planet.material = this.planetMat;
    this.planet.alphaIndex = 1;

    this.halo = CreateSphere('spaceHalo', { diameter: PLANET_RADIUS * 2 * HALO_SCALE, segments: 32 }, scene);
    this.haloMat = new ShaderMaterial(
      'spaceHaloMat',
      scene,
      { vertex: 'spaceHalo', fragment: 'spaceHalo' },
      {
        attributes: ['position'],
        uniforms: ['sunDir', 'worldViewProjection', 'world', 'fade', 'camPos', 'planetCenter', 'storm', 'time'],
        needAlphaBlending: true,
      },
    );
    this.haloMat.alphaMode = Constants.ALPHA_ADD;
    this.haloMat.disableDepthWrite = true;
    this.haloMat.fogEnabled = false;
    this.halo.material = this.haloMat;
    this.halo.alphaIndex = 2;

    this.crown = CreateTorus(
      'spaceCrown',
      { diameter: CROWN_DIAMETER, thickness: CROWN_THICKNESS, tessellation: 96 },
      scene,
    );
    this.crownMat = new ShaderMaterial(
      'spaceCrownMat',
      scene,
      { vertex: 'spaceCrown', fragment: 'spaceCrown' },
      {
        attributes: ['position', 'normal'],
        uniforms: ['sunDir', 'worldViewProjection', 'world', 'fade', 'storm', 'time'],
        needAlphaBlending: true,
      },
    );
    this.crownMat.disableDepthWrite = true;
    this.crownMat.fogEnabled = false;
    this.crown.material = this.crownMat;
    this.crown.rotationQuaternion = new Quaternion();
    // After the stars, before the planet; it is always opposite the planet, so the two never overlap.
    this.crown.alphaIndex = 0.5;
    // Two spokes across the ring and a hub where they cross: what makes it a structure and not a halo.
    const spoke = { width: CROWN_DIAMETER - CROWN_THICKNESS, height: 4, depth: 5 };
    this.crownParts.push(
      CreateBox('spaceCrownSpokeX', spoke, scene),
      CreateBox('spaceCrownSpokeZ', { width: spoke.depth, height: spoke.height, depth: spoke.width }, scene),
      CreateBox('spaceCrownHub', { width: 22, height: 8, depth: 22 }, scene),
    );
    for (const part of this.crownParts) {
      part.parent = this.crown;
      part.material = this.crownMat;
      part.alphaIndex = 0.5;
    }

    const cubeMat = (lit: number): ShaderMaterial => {
      const mat = new ShaderMaterial(
        lit ? 'spaceCubeLitMat' : 'spaceCubeDarkMat',
        scene,
        { vertex: 'spaceCube', fragment: 'spaceCube' },
        {
          attributes: ['position', 'normal'],
          uniforms: ['sunDir', 'worldViewProjection', 'world', 'fade', 'lit', 'camPos'],
          needAlphaBlending: true,
        },
      );
      mat.setFloat('lit', lit);
      mat.fogEnabled = false;
      return mat;
    };
    this.cubeMats = [cubeMat(1), cubeMat(0)];
    const cubeSource = CreateBox('spaceCube0', { size: 1 }, scene);
    this.cubeMeshes.push(cubeSource);
    for (let i = 1; i < FIELD_COUNT; i++) this.cubeMeshes.push(cubeSource.clone(`spaceCube${i}`));
    for (const cube of this.cubeMeshes) {
      cube.rotationQuaternion = new Quaternion();
      cube.alphaIndex = 3;
    }
    this.hull = CreateBox('spaceHull', { size: 1 }, scene);
    this.hull.material = this.cubeMats[0];
    this.hull.alphaIndex = 3;
    // Unlike the other backdrop meshes, the hull stays in the glow layer: it draws there as a black occluder, so the
    // glow of the chamber inside does not bleed through it.
    this.hull.isPickable = false;

    for (const mesh of [this.stars, this.planet, this.halo, this.crown, ...this.crownParts, ...this.cubeMeshes]) {
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

    this.setShown(false, false);
  }

  /**
   * Inside a chamber (visibility 0) only the black sky and the planet show, and only through holes: a hole in a wall or
   * ceiling is pitch black, one in the current floor shows the planet below. After an escape the stars, the field, the
   * Crown, the chamber's hull and the streaks fade in with `visibility`. A chamber with a window (`vista`) shows the
   * stars, the field and the Crown from inside as well.
   */
  update(frame: BackdropFrame): void {
    const out = frame.visibility > 0;
    // How strongly the stars, the field and the Crown show.
    const vis = frame.vista ? 1 : Math.min(Math.max(frame.visibility, 0), 1);
    const show = vis > 0;
    const { cameraPosition: cam, planetDirection: dir } = frame;
    const at = frame.anchor ?? cam;
    if (show && !this.shown) this.layOutField(at, dir, frame.darkFraction);
    this.setShown(show, out);
    this.hull.material = this.cubeMats[frame.hullDark ? 1 : 0];
    this.time += frame.dt;
    if (show) this.updateField(cam, vis, frame.anchor);

    const px = at.x + dir.x * frame.planetDistance;
    const py = at.y + dir.y * frame.planetDistance;
    const pz = at.z + dir.z * frame.planetDistance;
    this.planet.position.set(px, py, pz);
    this.halo.position.set(px, py, pz);

    // The star: beyond the Crown, a little off the line from the planet through it.
    if (frame.sunDirection) this.sun.copyFrom(frame.sunDirection);
    else {
      const axes = fieldBasis([dir.x, dir.y, dir.z]);
      const c = Math.cos(SUN_OFFSET);
      const sx = Math.sin(SUN_OFFSET) * Math.cos(SUN_AZIMUTH);
      const sz = Math.sin(SUN_OFFSET) * Math.sin(SUN_AZIMUTH);
      this.sun.set(
        axes.y[0] * c + axes.x[0] * sx + axes.z[0] * sz,
        axes.y[1] * c + axes.x[1] * sx + axes.z[1] * sz,
        axes.y[2] * c + axes.x[2] * sx + axes.z[2] * sz,
      );
    }
    this.sun.normalize();
    for (const mat of [this.starsMat, this.planetMat, this.haloMat, this.crownMat, ...this.cubeMats]) {
      mat.setVector3('sunDir', this.sun);
    }

    this.starsMat.setFloat('fade', 1);
    this.starsMat.setFloat('shine', vis);
    this.starsMat.setFloat('time', this.time);
    this.stormNow = stormStrength(this.time);
    this.starsMat.setFloat('storm', this.stormNow);
    this.haloMat.setFloat('storm', this.stormNow);
    this.haloMat.setFloat('time', this.time);
    this.crownMat.setFloat('storm', this.stormNow);
    this.crownMat.setFloat('time', this.time);
    this.planetMat.setFloat('fade', 1);
    this.planetMat.setFloat('lights', frame.planetLights ?? 0);
    this.planetMat.setVector3('camPos', cam);
    // The new light is at the point of the planet nearest the camera: where this fall comes down.
    this.arrivalDir.set(cam.x - px, cam.y - py, cam.z - pz).normalize();
    this.planetMat.setFloat('arrival', Math.min(Math.max(frame.arrival ?? 0, 0), 1));
    this.planetMat.setVector3('arrivalDir', this.arrivalDir);
    this.haloMat.setFloat('fade', 1);
    this.haloMat.setVector3('camPos', cam);
    this.haloMat.setVector3('planetCenter', this.planet.position);

    // The Crown: overhead, its ring square to the fall line.
    const up = frame.crownDistance ?? CROWN_DISTANCE;
    this.crown.position.set(at.x - dir.x * up, at.y - dir.y * up, at.z - dir.z * up);
    Quaternion.FromUnitVectorsToRef(Vector3.Up(), dir, this.crownTurn);
    this.crown.rotationQuaternion!.copyFrom(this.crownTurn);
    this.crownMat.setFloat('fade', vis);

    // Streaks: emitted ahead of the camera, moving away from the planet, so they rush past "upwards".
    // Only out in the open: a fall inside a chamber with a window has no streaks.
    const strength = Math.min(Math.max(frame.speed / 150, 0), 1) * Math.min(Math.max(frame.visibility, 0), 1);
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
    for (const mesh of [this.stars, this.planet, this.halo, ...this.crownParts, this.crown, ...this.cubeMeshes]) {
      this.glow.removeExcludedMesh(mesh);
      mesh.dispose();
    }
    this.hull.dispose();
    for (const mat of this.cubeMats) mat.dispose();
    this.crownMat.dispose();
    this.starsMat.dispose();
    this.planetMat.dispose();
    this.haloMat.dispose();
  }

  /** `shown`: the field and the Crown. `outside`: the chamber's hull (invisible from inside anyway) and the streaks. */
  private setShown(shown: boolean, outside: boolean): void {
    if (outside !== this.outside) {
      this.outside = outside;
      this.hull.setEnabled(outside);
      if (!outside) this.stopStreaks();
    }
    if (shown === this.shown) return;
    this.shown = shown;
    this.crown.setEnabled(shown);
    this.cubeMeshes.forEach((mesh, i) => mesh.setEnabled(shown && i < this.field.length));
  }

  /** Wraps the chamber with these bounds in its outer hull. Call whenever a chamber is built. */
  public setChamber(bounds: Aabb): void {
    const { center, size } = chamberHull(bounds);
    this.hull.position.fromArray(center);
    this.hull.scaling.setAll(size);
    this.resetField();
  }

  /** Forgets the field, so the next time it shows it is laid out afresh around wherever the view then is. */
  public resetField(): void {
    this.setShown(false, this.outside);
  }

  /**
   * A new field each time it comes into view (a fall, a chamber with a window, the title), anchored at `origin` and
   * turned so its "up" points away from the planet.
   */
  private layOutField(origin: Vector3, dir: Vector3, darkFraction = 0.3): void {
    this.falls++;
    this.field = layoutField(this.falls * 7919 + 1, darkFraction);
    this.fieldOrigin = [origin.x, origin.y, origin.z];
    this.fieldAxes = fieldBasis([dir.x, dir.y, dir.z]);
    this.field.forEach((cube, i) => {
      const mesh = this.cubeMeshes[i];
      mesh.material = this.cubeMats[cube.dark ? 1 : 0];
      mesh.scaling.setAll(cube.size);
    });
  }

  /** With an `anchor` (the title's view), a cube standing between the camera and the anchor is left out. */
  private updateField(cam: Vector3, vis: number, anchor?: Vector3): void {
    for (const mat of this.cubeMats) {
      mat.setFloat('fade', vis);
      mat.setVector3('camPos', cam);
    }
    this.field.forEach((cube, i) => {
      const mesh = this.cubeMeshes[i];
      mesh.position.fromArray(toWorld(this.fieldOrigin, this.fieldAxes, cube.position));
      mesh.setEnabled(!anchor || segmentDistance(mesh.position, cam, anchor) > cube.size + 25);
      // The field's axes are world axes up to sign and order (gravity is axis-aligned), so a lit cube turning about
      // one of them stays square to the world between turns.
      this.spinAxis.fromArray(toWorld([0, 0, 0], this.fieldAxes, cube.axis));
      Quaternion.RotationAxisToRef(this.spinAxis, cubeAngle(cube, this.time), this.spin);
      mesh.rotationQuaternion!.copyFrom(this.spin);
    });
  }

  private stopStreaks(): void {
    if (!this.streaming) return;
    this.streaks.stop();
    this.streaks.reset();
    this.streaming = false;
  }
}

/** Distance from point `p` to the segment from `a` to `b`. */
function segmentDistance(p: Vector3, a: Vector3, b: Vector3): number {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const abz = b.z - a.z;
  const len2 = abx * abx + aby * aby + abz * abz;
  const t =
    len2 === 0 ? 0 : Math.min(Math.max(((p.x - a.x) * abx + (p.y - a.y) * aby + (p.z - a.z) * abz) / len2, 0), 1);
  return Math.hypot(p.x - a.x - abx * t, p.y - a.y - aby * t, p.z - a.z - abz * t);
}
