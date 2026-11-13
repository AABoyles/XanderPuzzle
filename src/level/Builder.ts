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
import { GravitySequencer } from '../gravity/axes';
import { GravityAxis } from '../gravity/GravitySystem';
import { Door, DynamicsEvents, LevelDynamics, PressurePlate } from './Dynamics';
import { Crate } from './Dynamics';
import { GravitySwitch, LeverSpec } from './GravitySwitch';
import { Aabb, sweep } from '../physics/boxPhysics';
import { boundsOf } from '../environment/fall';
import { AXIS_ORDER, SkinRuntime, SurfaceRole } from '../skins/Skin';
import { createPlacard } from './Placard';
import { placardFrame, SURFACE_OFFSET } from './placardText';
import type { PlacardFrame, Voice } from './placardText';
import { axisVec } from '../gravity/axes';
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
  /**
   * This chamber has a window (a glass skylight, or the Descent's hole) meant to be looked out of, so the backdrop
   * shows the stars, the field and the Crown from inside it, not only after an escape. Elsewhere a hole stays black.
   */
  vista?: boolean;
  /** The attendant printer at the entrance (NARRATIVE.md): every chamber has one, around the spawn point. */
  printer: Printer;
  /**
   * The reclaimer at the exit, if the chamber has one: the same bay as the printer, where the attendant is taken apart
   * to be printed again at the next cube. Standing on its plate is how a chamber is won. An ending chamber has none.
   */
  reclaimer?: Reclaimer;
  dynamics: LevelDynamics;
  /** The static boxes crates collide with (shell, features and glass: everything is glass or solid). Used by the headless tests. */
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

/** The print bay the attendant starts in. Set dressing: it collides with nothing. */
export interface Printer {
  /** Where the bed meets the floor, under the spawn point. */
  readonly bed: Vec3;
  readonly online: boolean;
  /** Offline, the bed and the head go dark: this cube prints no one (the Descent, once it is out of trim). */
  setOnline(on: boolean): void;
}

/** The bay at the exit, and the plate on its bed that the attendant stands on to be reclaimed. */
export interface Reclaimer {
  /** Where the bed meets the floor under the exit gravity. */
  readonly bed: Vec3;
  /** A player-sized box overlapping this is on the plate (as for any pressure plate), whatever gravity is. */
  readonly trigger: Aabb;
  /** Where a player stands on the plate: half a unit off the bed. */
  readonly stand: Vec3;
  readonly pressed: boolean;
  /** Sinks and lights the plate, or lets it up again. Returns true if that changed it. */
  setPressed(pressed: boolean): boolean;
}

/** Edge of the reclaimer's plate, and how far it sinks underfoot. */
const RECLAIMER_PLATE = 1.6;
const PLATE_TRAVEL = 0.05;

/** The print bay's footprint (half-width of the bed) and the height of its gantry, in world units. */
const PRINTER_HALF = 1.1;
const PRINTER_HEIGHT = 2.55;
const PRINTER_GLOW = new Color3(0.55, 0.95, 1);
const PRINTER_DEAD = new Color3(0.1, 0.012, 0.012);
/** The reclaimer at the exit is the same machine run backwards, and glows amber. */
const RECLAIMER_GLOW = new Color3(1, 0.62, 0.2);

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
  /** Burnt-out levers that are only set dressing: never updated, never in `switches`. */
  private readonly spentLevers: GravitySwitch[] = [];
  public readonly placards: PlacardInfo[] = [];
  /** Fixed crates own their material and stamps, so they are disposed with them. */
  private readonly fixedCrates: Mesh[] = [];
  /** The reclaimer's plate: like a door's plate, but outside the dynamics, so it is disposed here. */
  private readonly exitPlates: PressurePlate[] = [];
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
  /** The two materials `modelCube` shares, made on first use. */
  private readonly modelMaterials: { lit?: StandardMaterial; dark?: StandardMaterial } = {};
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
      const axis =
        Math.abs(nx) > 0.5
          ? nx > 0
            ? '-X'
            : '+X'
          : Math.abs(ny) > 0.5
            ? ny > 0
              ? '-Y'
              : '+Y'
            : nz > 0
              ? '-Z'
              : '+Z';
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

  /**
   * A lever that was burnt out before you arrived: dark, arrowless and dead. Set dressing only (it is not in
   * `switches` and can never be thrown), for showing what a spent one-shot lever looks like.
   */
  public addSpentLever(position: Vector3, wallNormal: Vector3): void {
    const spec: LeverSpec = { kind: 'fixed', target: '-Y' };
    const sw = new GravitySwitch(this.scene, position, wallNormal, spec, (a) => this.skin.leverColor(a), true);
    sw.root.getChildMeshes().forEach((m) => this.skin.decorateProp(m as Mesh));
    sw.burnOut();
    this.spentLevers.push(sw);
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

  /**
   * The attendant printer: a glowing bed on the floor under `spawn` (the floor under gravity `axis`), four posts and
   * a gantry with the print head over it. The attendant is printed standing on the bed, so the spawn point is inside
   * it. None of it collides or is in `solids`, so it can't block a doorway or a crate.
   */
  private addPrinter(spawn: Vector3, axis: GravityAxis): Printer {
    const bay = this.addBay(spawn, axis, PRINTER_GLOW, 4)!;
    let online = true;
    return {
      bed: bay.bed,
      get online() {
        return online;
      },
      setOnline: (on: boolean) => {
        online = on;
        bay.glow.emissiveColor.copyFrom(on ? PRINTER_GLOW : PRINTER_DEAD);
      },
    };
  }

  /**
   * The reclaimer: a print bay lit amber on the floor under the exit point, with a pressure plate on its bed like the
   * ones that open doors (red until stood on, then green and sunk). The plate belongs to no door and is not in
   * `dynamics.plates`: `stepChamber` wins the chamber when the player has stood on it for a moment.
   */
  private addReclaimer(exit: Vector3, axis: GravityAxis): Reclaimer | undefined {
    const bay = this.addBay(exit, axis, RECLAIMER_GLOW, 8);
    if (!bay) return undefined;
    const down = axisVec(axis);
    const normal = new Vector3(-down[0], -down[1], -down[2]);
    const plate = new PressurePlate(this.scene, Vector3.FromArray(bay.bed), normal, RECLAIMER_PLATE, false);
    this.skin.decorateProp(plate.mesh);
    this.exitPlates.push(plate);
    const rest = plate.mesh.position.clone();
    return {
      bed: bay.bed,
      trigger: plate.trigger,
      stand: [bay.bed[0] + normal.x * 0.5, bay.bed[1] + normal.y * 0.5, bay.bed[2] + normal.z * 0.5],
      get pressed() {
        return plate.pressed;
      },
      setPressed: (pressed: boolean) => {
        if (!plate.setPressed(pressed)) return false;
        plate.mesh.position.copyFrom(rest).subtractInPlace(normal.scale(pressed ? PLATE_TRAVEL : 0));
        return true;
      },
    };
  }

  /**
   * A print bay: bed, posts, gantry and head, standing on the floor under `at` for gravity `axis` and lit in `color`.
   * Returns nothing if there is no floor within `reach` under `at`.
   */
  private addBay(
    spawn: Vector3,
    axis: GravityAxis,
    color: Color3,
    reach: number,
  ): { bed: Vec3; glow: StandardMaterial } | undefined {
    const down = axisVec(axis);
    const k = down.findIndex((c) => c !== 0);
    const [u, v] = [0, 1, 2].filter((i) => i !== k);
    // The floor: where a player-sized box at the spawn comes to rest.
    const r = 0.5;
    const box: Aabb = {
      min: [spawn.x - r, spawn.y - r, spawn.z - r],
      max: [spawn.x + r, spawn.y + r, spawn.z + r],
    };
    const fall = sweep(box, [down[0] * reach, down[1] * reach, down[2] * reach], this.solids);
    if (!fall.hit[k]) return undefined;
    const drop = fall.moved[k];
    const bed = spawn.asArray() as Vec3;
    bed[k] += drop + down[k] * r;

    const frame = this.ownMaterial(new StandardMaterial(`printerFrameMat_${this.n}`, this.scene));
    frame.diffuseColor = new Color3(0.2, 0.22, 0.25);
    frame.emissiveColor = new Color3(0.03, 0.035, 0.04);
    frame.specularColor = new Color3(0.3, 0.3, 0.3);
    const glow = this.ownMaterial(new StandardMaterial(`printerGlowMat_${this.n}`, this.scene));
    glow.diffuseColor = new Color3(0.05, 0.06, 0.07);
    glow.specularColor = Color3.Black();
    glow.emissiveColor = color.clone();

    // A box given by its extent along the two floor axes and its height above the bed (measured against gravity).
    const part = (u0: number, u1: number, v0: number, v1: number, h0: number, h1: number, mat: Material): void => {
      const a = [0, 0, 0];
      const c = [0, 0, 0];
      a[u] = bed[u] + u0;
      c[u] = bed[u] + u1;
      a[v] = bed[v] + v0;
      c[v] = bed[v] + v1;
      a[k] = bed[k] - down[k] * h0;
      c[k] = bed[k] - down[k] * h1;
      const min = new Vector3(Math.min(a[0], c[0]), Math.min(a[1], c[1]), Math.min(a[2], c[2]));
      const max = new Vector3(Math.max(a[0], c[0]), Math.max(a[1], c[1]), Math.max(a[2], c[2]));
      const m = this.plainBox('printer', min, max, mat);
      m.isPickable = false;
      this.skin.decorateProp(m);
    };
    const H = PRINTER_HALF;
    const P = 0.07; // half-thickness of a post
    const top = PRINTER_HEIGHT;
    // The bed, a hair above the floor, with a dark rim.
    part(-H, H, -H, H, 0.02, 0.05, frame);
    part(-H + 0.12, H - 0.12, -H + 0.12, H - 0.12, 0.05, 0.07, glow);
    for (const su of [-1, 1]) {
      for (const sv of [-1, 1]) part(su * H - P, su * H + P, sv * H - P, sv * H + P, 0.05, top, frame);
      // The gantry's four beams, and the rails the head rides on.
      part(su * H - P, su * H + P, -H, H, top - 2 * P, top, frame);
      part(-H, H, su * H - P, su * H + P, top - 2 * P, top, frame);
    }
    // The print head: a bar across the gantry, lit along its underside.
    part(-H, H, -0.14, 0.14, top - 0.3, top - 2 * P, frame);
    part(-H + 0.1, H - 0.1, -0.08, 0.08, top - 0.34, top - 0.3, glow);
    return { bed, glow };
  }

  private ownMaterial<M extends Material>(m: M): M {
    this.ownMaterials.push(m);
    return m;
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

  /**
   * A small solid cube standing for one cube of the ballast field in a model of it (the Orrery): `lit` ones glow warm
   * like the field's cubes that still keep their schedule, dark ones are flat black. One material of each per level.
   */
  public modelCube(center: Vector3, size: number, lit: boolean): void {
    const key = lit ? 'lit' : 'dark';
    let mat = this.modelMaterials[key];
    if (!mat) {
      mat = this.ownMaterial(new StandardMaterial(`modelCubeMat_${key}`, this.scene));
      mat.diffuseColor = lit ? new Color3(0.3, 0.31, 0.34) : new Color3(0.04, 0.04, 0.05);
      mat.emissiveColor = lit ? new Color3(0.85, 0.66, 0.42) : Color3.Black();
      mat.specularColor = Color3.Black();
      this.modelMaterials[key] = mat;
    }
    const h = size / 2;
    const min = center.subtract(new Vector3(h, h, h));
    const max = center.add(new Vector3(h, h, h));
    const m = this.plainBox('modelCube', min, max, mat);
    m.checkCollisions = true;
    this.solids.push({ min: [min.x, min.y, min.z], max: [max.x, max.y, max.z] });
  }

  /**
   * Text on the face whose outward normal is `normal`, centred on `at` (a point on that face), reading upright under
   * gravity `readAs`. Stencil by default, the facility's voice; `note` is the Margin's. Lines break only at `\n`.
   */
  public placard(at: Vector3, normal: Vector3, readAs: GravityAxis, text: string, opts: PlacardOptions = {}): void {
    const voice = opts.voice ?? 'stencil';
    const frame = placardFrame(arr(normal), readAs, opts.top && arr(opts.top));
    const width = opts.width ?? DEFAULT_WIDTH[voice];
    const { mesh, height } = createPlacard(this.scene, `placard_${this.n++}`, {
      text,
      voice,
      width,
      lineHeight: opts.lineHeight,
      frame,
      ink: this.skin.placardInk,
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
    for (const n of [
      [1, 0, 0],
      [-1, 0, 0],
      [0, 1, 0],
      [0, -1, 0],
      [0, 0, 1],
      [0, 0, -1],
    ] as Vec3[]) {
      const frame = placardFrame(n, '-Y', n[1] === 0 ? undefined : [0, 0, 1]);
      const { mesh } = createPlacard(this.scene, `crateStamp_${this.n++}`, {
        text: stamp,
        voice: 'stencil',
        width: size * 0.85,
        lineHeight: size * 0.17,
        frame,
        ink: this.skin.placardInk,
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
    this.solids.push({
      min: [center.x - h, center.y - h, center.z - h],
      max: [center.x + h, center.y + h, center.z + h],
    });
  }

  /** A crate. `stamp` is stencilled on every face; it slides but never turns, so the stamps stay square. */
  public addCrate(center: Vector3, size = 1.5, opts: { stamp?: string } = {}): Crate {
    const crate = new Crate(this.scene, center, size);
    if (opts.stamp) this.stampCrate(crate, size, opts.stamp);
    this.skin.decorateProp(crate.mesh);
    this.dynamics.crates.push(crate);
    return crate;
  }

  /**
   * A pressure plate on the surface at `center`, facing along `normal`. With `cratesOnly` the player cannot press it.
   * An `inverted` plate is the opposite of a normal one: its door needs it clear, and it lights green while it is.
   */
  public addPlate(center: Vector3, normal: Vector3, size = 2.5, cratesOnly = false, inverted = false): PressurePlate {
    const plate = new PressurePlate(this.scene, center, normal, size, cratesOnly, inverted);
    this.skin.decorateProp(plate.mesh);
    this.dynamics.plates.push(plate);
    return plate;
  }

  /**
   * A pane of glass filling [min, max] that slides into the adjoining wall while all of `plates` are satisfied
   * (pressed; clear if inverted). `slide` overrides the direction it retracts in (see `Door`). It is not given the
   * skin's prop treatment: glass casts no shadow.
   */
  public addDoor(min: Vector3, max: Vector3, plates: PressurePlate[], slide?: { axis: 0 | 1 | 2; sign: 1 | -1 }): Door {
    const door = new Door(this.scene, min, max, plates, slide);
    this.dynamics.doors.push(door);
    return door;
  }

  public finish(
    info: Omit<
      BuiltLevel,
      | 'switches'
      | 'dispose'
      | 'dynamics'
      | 'solids'
      | 'bounds'
      | 'update'
      | 'sequencer'
      | 'placards'
      | 'printer'
      | 'reclaimer'
    >,
  ): BuiltLevel {
    // The bounds are the chamber's own geometry; the printer is dressing inside it.
    const bounds = boundsOf(this.solids);
    return {
      ...info,
      printer: this.addPrinter(info.spawnPosition, info.entranceAxis),
      // The exit is a reclaimer, on the floor under `exitCenter`: standing on its plate wins the chamber.
      reclaimer: info.ending ? undefined : this.addReclaimer(info.exitCenter, info.exitAxis),
      switches: this.switches,
      placards: this.placards,
      dynamics: this.dynamics,
      solids: this.solids,
      bounds,
      sequencer: this.sequencer,
      update: (dt, gravity, playerPos) => this.dynamics.update(dt, gravity, playerPos),
      dispose: () => {
        this.meshes.forEach((m) => m.dispose());
        this.switches.forEach((s) => s.dispose());
        this.spentLevers.forEach((s) => s.dispose());
        this.dynamics.dispose();
        this.fixedCrates.forEach((m) => m.dispose(false, true));
        this.exitPlates.forEach((p) => p.mesh.dispose(false, true));
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
