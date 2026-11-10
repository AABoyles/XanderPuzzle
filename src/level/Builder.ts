import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Material } from '@babylonjs/core/Materials/material';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { CreateBox } from '@babylonjs/core/Meshes/Builders/boxBuilder';
import { MultiMaterial } from '@babylonjs/core/Materials/multiMaterial';
import { Scene } from '@babylonjs/core/scene';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { SubMesh } from '@babylonjs/core/Meshes/subMesh';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
import { GridMaterial } from '@babylonjs/materials/grid/gridMaterial';
import { GravitySequencer } from '../gravity/axes';
import { GravityAxis } from '../gravity/GravitySystem';
import { Door, DynamicsEvents, LevelDynamics, PressurePlate } from './Dynamics';
import { Crate } from './Dynamics';
import { GravitySwitch, LeverSpec } from './GravitySwitch';
import { Aabb } from '../physics/boxPhysics';
import { boundsOf } from '../environment/fall';
import { AXIS_ORDER, SkinRuntime, SurfaceRole } from '../skins/Skin';
import { createPlacard } from './Placard';
import { placardFrame, SURFACE_OFFSET } from './placardText';
import type { PlacardFrame, Voice } from './placardText';
import type { Vec3 } from '../gravity/axes';

export interface BuiltLevel {
  name: string;
  hint: string;
  spawnPosition: Vector3;
  entranceAxis: GravityAxis;
  exitAxis: GravityAxis;
  switches: GravitySwitch[];
  exitCenter: Vector3;
  exitRadius: number;
  /**
   * Leaving this chamber ends the game (the Descent): its exit is a hole into space, so `exitCenter` marks the hole
   * rather than a trigger, and the fall out of it is the final one.
   */
  ending?: boolean;
  dynamics: LevelDynamics;
  /** The static boxes crates collide with (shell, features, glass, barriers; not grates). Used by the headless tests. */
  solids: Aabb[];
  /** The box enclosing all of the level's geometry; a player well outside it has fallen out. */
  bounds: Aabb;
  /** Text painted on the chamber's faces (not crate stamps). Used by the headless tests. */
  placards: PlacardInfo[];
  /** The timed gravity cycle started by this level's sequence lever, if it has one. */
  sequencer?: GravitySequencer;
  /** Advances crates, plates and doors. */
  update(dt: number, gravity: Vector3, playerPos: Vector3): DynamicsEvents;
  dispose(): void;
}

export interface PlacardInfo {
  text: string;
  voice: Voice;
  /** The point on the face the placard is centred on. */
  at: Vec3;
  /** The face's outward normal. */
  normal: Vec3;
  /** The gravity it reads upright under. */
  readAs: GravityAxis;
  frame: PlacardFrame;
  width: number;
  height: number;
}

export interface PlacardOptions {
  voice?: Voice;
  /** World units; the default suits a few short lines. Lines too long for it are squeezed to fit. */
  width?: number;
  lineHeight?: number;
  /** Which way the top of the text points, for a face that is the floor or ceiling under `readAs`. */
  top?: Vector3;
}

const arr = (v: Vector3): Vec3 => [v.x, v.y, v.z];
const DEFAULT_WIDTH: Record<Voice, number> = { stencil: 6, margin: 4 };

type Axis = 'x' | 'y' | 'z';
type Face = '+x' | '-x' | '+y' | '-y' | '+z' | '-z';
/** Wall thickness. */
export const T = 1;

/** Small helper that accumulates a level's meshes/materials so it can be torn down again. */
export class Builder {
  public readonly meshes: Mesh[] = [];
  public readonly switches: GravitySwitch[] = [];
  public readonly placards: PlacardInfo[] = [];
  /** Fixed crates own their material and stamps, so they are disposed with them. */
  private readonly fixedCrates: Mesh[] = [];
  public readonly solids: Aabb[] = [];
  public readonly dynamics = new LevelDynamics(this.solids);
  public sequencer?: GravitySequencer;
  /** Surface roles, named for how level code uses them. */
  public readonly wall: SurfaceRole = 'shell';
  public readonly floor: SurfaceRole = 'shell';
  public readonly alcove: SurfaceRole = 'alcove';
  public readonly exit: SurfaceRole = 'exit';
  private readonly multiMaterials = new Map<SurfaceRole, MultiMaterial>();
  private readonly ownMaterials: Material[] = [];
  private n = 0;

  constructor(
    private readonly scene: Scene,
    private readonly skin: SkinRuntime,
    private readonly accent: Color3,
  ) {}

  /** One MultiMaterial per role; each box face picks the sub-material for its gravity axis. */
  private multi(role: SurfaceRole): MultiMaterial {
    let mm = this.multiMaterials.get(role);
    if (!mm) {
      mm = new MultiMaterial(`mm_${role}`, this.scene);
      mm.subMaterials = this.skin.materials(role, this.accent);
      this.multiMaterials.set(role, mm);
    }
    return mm;
  }

  /** A solid box. Called directly from level code it is an interior `feature`. */
  public box(min: Vector3, max: Vector3, role: SurfaceRole = 'feature'): void {
    const size = max.subtract(min);
    if (size.x <= 1e-6 || size.y <= 1e-6 || size.z <= 1e-6) return;
    const m = CreateBox(`lvl_${this.n++}`, { width: size.x, height: size.y, depth: size.z }, this.scene);
    const center = min.add(max).scale(0.5);
    m.position = center;

    // World-space UVs, so texture scale is the same on every box and continuous across seams.
    const pos = m.getVerticesData(VertexBuffer.PositionKind)!;
    const nrm = m.getVerticesData(VertexBuffer.NormalKind)!;
    const uvs = new Float32Array((pos.length / 3) * 2);
    const k = 1 / this.skin.textureScale;
    for (let i = 0; i < pos.length / 3; i++) {
      const x = pos[i * 3] + center.x;
      const y = pos[i * 3 + 1] + center.y;
      const z = pos[i * 3 + 2] + center.z;
      const [u, v] = Math.abs(nrm[i * 3]) > 0.5 ? [z, y] : Math.abs(nrm[i * 3 + 1]) > 0.5 ? [x, z] : [x, y];
      uvs[i * 2] = u * k;
      uvs[i * 2 + 1] = v * k;
    }
    m.setVerticesData(VertexBuffer.UVKind, uvs);

    // One sub-mesh per face, coloured by the gravity under which that face is the floor
    // (gravity pointing into the face, i.e. opposite its outward normal).
    const idx = m.getIndices()!;
    const total = m.getTotalVertices();
    m.subMeshes = [];
    for (let f = 0; f < idx.length / 6; f++) {
      const vi = idx[f * 6] * 3;
      const [nx, ny, nz] = [nrm[vi], nrm[vi + 1], nrm[vi + 2]];
      const axis = Math.abs(nx) > 0.5 ? (nx > 0 ? '-X' : '+X') : Math.abs(ny) > 0.5 ? (ny > 0 ? '-Y' : '+Y') : nz > 0 ? '-Z' : '+Z';
      new SubMesh(AXIS_ORDER.indexOf(axis), 0, total, f * 6, 6, m);
    }
    m.material = this.multi(role);

    m.checkCollisions = true;
    m.isPickable = true;
    this.skin.decorate(m, role);
    m.freezeWorldMatrix();
    this.meshes.push(m);
    this.solids.push({ min: [min.x, min.y, min.z], max: [max.x, max.y, max.z] });
  }

  /**
   * A slab perpendicular to `axis`, occupying [lo, hi] along it and [u0,u1] x [v0,v1] on the two
   * remaining axes (in x,y,z order), optionally with a rectangular hole.
   */
  public slab(
    axis: Axis,
    lo: number,
    hi: number,
    u: [number, number],
    v: [number, number],
    material: SurfaceRole,
    hole?: { u: [number, number]; v: [number, number] },
  ): void {
    const mk = (u0: number, u1: number, v0: number, v1: number) => {
      const p = (a: number, b: number, c: number) =>
        axis === 'x' ? new Vector3(a, b, c) : axis === 'y' ? new Vector3(b, a, c) : new Vector3(b, c, a);
      this.box(p(lo, u0, v0), p(hi, u1, v1), material);
    };
    if (!hole) return mk(u[0], u[1], v[0], v[1]);
    mk(u[0], u[1], hole.v[1], v[1]);
    mk(u[0], u[1], v[0], hole.v[0]);
    mk(u[0], hole.u[0], hole.v[0], hole.v[1]);
    mk(hole.u[1], u[1], hole.v[0], hole.v[1]);
  }

  /** Walls around a box-shaped interior, leaving the listed faces open. */
  public tube(min: Vector3, max: Vector3, open: Face[], material: SurfaceRole): void {
    const has = (f: Face) => !open.includes(f);
    if (has('-x')) this.slab('x', min.x - T, min.x, [min.y, max.y], [min.z, max.z], material);
    if (has('+x')) this.slab('x', max.x, max.x + T, [min.y, max.y], [min.z, max.z], material);
    if (has('-y')) this.slab('y', min.y - T, min.y, [min.x, max.x], [min.z, max.z], material);
    if (has('+y')) this.slab('y', max.y, max.y + T, [min.x, max.x], [min.z, max.z], material);
    if (has('-z')) this.slab('z', min.z - T, min.z, [min.x, max.x], [min.y, max.y], material);
    if (has('+z')) this.slab('z', max.z, max.z + T, [min.x, max.x], [min.y, max.y], material);
  }

  /** A lever that sets gravity to `target`. With `once`, it can only be thrown once. */
  public addSwitch(
    position: Vector3,
    wallNormal: Vector3,
    target: GravityAxis,
    opts: { once?: boolean } = {},
  ): GravitySwitch {
    return this.lever(position, wallNormal, { kind: 'fixed', target }, opts.once);
  }

  /** A lever that turns gravity a quarter turn clockwise around the wall it is mounted on. */
  public addRelativeSwitch(position: Vector3, wallNormal: Vector3, opts: { once?: boolean } = {}): GravitySwitch {
    return this.lever(position, wallNormal, { kind: 'relative' }, opts.once);
  }

  /**
   * A lever that starts gravity cycling through `axes`, one step every `period` seconds, until
   * any other lever is thrown. A level has at most one sequence.
   */
  public addSequenceSwitch(position: Vector3, wallNormal: Vector3, axes: GravityAxis[], period: number): GravitySwitch {
    if (this.sequencer) throw new Error('A level has at most one gravity sequence');
    this.sequencer = new GravitySequencer(axes, period);
    return this.lever(position, wallNormal, { kind: 'sequence', sequencer: this.sequencer });
  }

  private lever(position: Vector3, wallNormal: Vector3, spec: LeverSpec, once = false): GravitySwitch {
    const sw = new GravitySwitch(this.scene, position, wallNormal, spec, (a) => this.skin.leverColor(a), once);
    sw.root.getChildMeshes().forEach((m) => this.skin.decorateProp(m as Mesh));
    this.switches.push(sw);
    return sw;
  }

  private plainBox(name: string, min: Vector3, max: Vector3, material: Material): Mesh {
    const size = max.subtract(min);
    const dims = { width: size.x, height: size.y, depth: size.z };
    const m = CreateBox(`${name}_${this.n++}`, dims, this.scene);
    m.position = min.add(max).scale(0.5);
    m.material = material;
    m.isPickable = true;
    m.freezeWorldMatrix();
    this.meshes.push(m);
    return m;
  }

  private ownMaterial<M extends Material>(m: M): M {
    this.ownMaterials.push(m);
    return m;
  }

  /** A grate: the player stands on it and cannot pass, but crates fall straight through. */
  public grate(min: Vector3, max: Vector3): void {
    const mat = this.ownMaterial(new GridMaterial(`grateMat_${this.n}`, this.scene));
    mat.mainColor = new Color3(0.05, 0.05, 0.06);
    mat.lineColor = new Color3(0.85, 0.85, 0.9);
    mat.gridRatio = 0.35;
    mat.majorUnitFrequency = 1;
    mat.opacity = 0.75;
    mat.backFaceCulling = false;
    const m = this.plainBox('grate', min, max, mat);
    m.checkCollisions = true;
    // Deliberately not in `solids`: crate physics never sees it.
  }

  /** Glass: you can see through it, but neither the player nor crates can pass. */
  public glass(min: Vector3, max: Vector3): void {
    const mat = this.ownMaterial(new StandardMaterial(`glassMat_${this.n}`, this.scene));
    mat.diffuseColor = new Color3(0.6, 0.85, 1);
    mat.emissiveColor = new Color3(0.08, 0.14, 0.2);
    mat.specularColor = new Color3(0.9, 0.9, 0.9);
    mat.alpha = 0.18;
    mat.backFaceCulling = false;
    const m = this.plainBox('glass', min, max, mat);
    m.checkCollisions = true;
    m.enableEdgesRendering();
    m.edgesWidth = 2;
    m.edgesColor.set(0.6, 0.85, 1, 0.8);
    this.solids.push({ min: [min.x, min.y, min.z], max: [max.x, max.y, max.z] });
  }

  /** A crate barrier: a faint field that stops crates but the player walks straight through. */
  public barrier(min: Vector3, max: Vector3): void {
    const mat = this.ownMaterial(new StandardMaterial(`barrierMat_${this.n}`, this.scene));
    mat.diffuseColor = new Color3(1, 0.6, 0.2);
    mat.emissiveColor = new Color3(0.5, 0.25, 0.05);
    mat.alpha = 0.12;
    mat.backFaceCulling = false;
    const m = this.plainBox('barrier', min, max, mat);
    m.checkCollisions = false;
    m.isPickable = false;
    this.solids.push({ min: [min.x, min.y, min.z], max: [max.x, max.y, max.z] });
  }

  /** A gravity-driven cube. `center` is where it starts; it will fall from there. */
  /**
   * Text on the face whose outward normal is `normal`, centred on `at` (a point on that face), reading upright under
   * gravity `readAs`. Stencil by default, the facility's voice; `note` is the Margin's. Lines break only at `\n`.
   */
  public placard(at: Vector3, normal: Vector3, readAs: GravityAxis, text: string, opts: PlacardOptions = {}): void {
    const voice = opts.voice ?? 'stencil';
    const frame = placardFrame(arr(normal), readAs, opts.top && arr(opts.top));
    const width = opts.width ?? DEFAULT_WIDTH[voice];
    const { mesh, height } = createPlacard(this.scene, `placard_${this.n++}`, {
      text, voice, width, lineHeight: opts.lineHeight, frame, ink: this.skin.placardInk,
    });
    mesh.position = at.add(normal.scale(SURFACE_OFFSET));
    mesh.freezeWorldMatrix();
    this.meshes.push(mesh);
    this.ownMaterials.push(mesh.material!);
    this.placards.push({ text, voice, at: arr(at), normal: arr(normal), readAs, frame, width, height });
  }

  /** A handwritten note from the Margin (see NARRATIVE.md); otherwise as `placard`. */
  public note(
    at: Vector3,
    normal: Vector3,
    readAs: GravityAxis,
    text: string,
    opts: Omit<PlacardOptions, 'voice'> = {},
  ): void {
    this.placard(at, normal, readAs, text, { ...opts, voice: 'margin' });
  }

  /** Stencils `stamp` on every face of a crate mesh; disposing the crate (with materials) releases the stamps. */
  private stampCrate(crate: Crate, size: number, stamp: string): void {
    for (const n of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]] as Vec3[]) {
      const frame = placardFrame(n, '-Y', n[1] === 0 ? undefined : [0, 0, 1]);
      const { mesh } = createPlacard(this.scene, `crateStamp_${this.n++}`, {
        text: stamp, voice: 'stencil', width: size * 0.85, lineHeight: size * 0.17, frame, ink: this.skin.placardInk,
      });
      mesh.parent = crate.mesh;
      mesh.position = Vector3.FromArray(n).scale(size / 2 + SURFACE_OFFSET);
    }
  }

  /**
   * A crate that never moves: it looks like any other crate but is plain solid geometry, outside the crate physics,
   * so it can sit anywhere without disturbing a puzzle. For set dressing (see NARRATIVE.md's reveal).
   */
  public addFixedCrate(center: Vector3, size = 1.5, opts: { stamp?: string } = {}): void {
    const crate = new Crate(this.scene, center, size);
    if (opts.stamp) this.stampCrate(crate, size, opts.stamp);
    this.skin.decorateProp(crate.mesh);
    crate.mesh.freezeWorldMatrix();
    this.fixedCrates.push(crate.mesh);
    const h = size / 2;
    this.solids.push({ min: [center.x - h, center.y - h, center.z - h], max: [center.x + h, center.y + h, center.z + h] });
  }

  /** A crate. `stamp` is stencilled on every face; it slides but never turns, so the stamps stay square. */
  public addCrate(center: Vector3, size = 1.5, opts: { stamp?: string } = {}): Crate {
    const crate = new Crate(this.scene, center, size);
    if (opts.stamp) this.stampCrate(crate, size, opts.stamp);
    this.skin.decorateProp(crate.mesh);
    this.dynamics.crates.push(crate);
    return crate;
  }

  /** A pressure plate on the surface at `center`, facing along `normal`. */
  public addPlate(center: Vector3, normal: Vector3, size = 2.5, cratesOnly = false): PressurePlate {
    const plate = new PressurePlate(this.scene, center, normal, size, cratesOnly);
    this.skin.decorateProp(plate.mesh);
    this.dynamics.plates.push(plate);
    return plate;
  }

  /** A solid slab filling [min, max] that opens while all of `plates` are pressed. */
  public addDoor(min: Vector3, max: Vector3, plates: PressurePlate[]): Door {
    const door = new Door(this.scene, min, max, plates);
    this.skin.decorateProp(door.mesh);
    this.dynamics.doors.push(door);
    return door;
  }

  public finish(
    info: Omit<BuiltLevel, 'switches' | 'dispose' | 'dynamics' | 'solids' | 'bounds' | 'update' | 'sequencer' | 'placards'>,
  ): BuiltLevel {
    return {
      ...info,
      switches: this.switches,
      placards: this.placards,
      dynamics: this.dynamics,
      solids: this.solids,
      bounds: boundsOf(this.solids),
      sequencer: this.sequencer,
      update: (dt, gravity, playerPos) => this.dynamics.update(dt, gravity, playerPos),
      dispose: () => {
        this.meshes.forEach((m) => m.dispose());
        this.switches.forEach((s) => s.dispose());
        this.dynamics.dispose();
        this.fixedCrates.forEach((m) => m.dispose(false, true));
        this.ownMaterials.forEach((m) => m.dispose(true, true));
        // Sub-materials belong to the skin and outlive the level.
        this.multiMaterials.forEach((mm) => mm.dispose(false, false, false));
      },
    };
  }
}

/** Shorthand for `new Vector3(x, y, z)`, used throughout chamber layouts. */
export const V = (x: number, y: number, z: number) => new Vector3(x, y, z);

export type LevelFactory = (scene: Scene, skin: SkinRuntime) => BuiltLevel;
