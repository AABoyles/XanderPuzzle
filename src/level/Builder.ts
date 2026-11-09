import { Color3, Mesh, MeshBuilder, MultiMaterial, Scene, SubMesh, Vector3, VertexBuffer } from '@babylonjs/core';
import { GravityAxis } from '../gravity/GravitySystem';
import { Door, DynamicsEvents, LevelDynamics, PressurePlate } from './Dynamics';
import { Crate } from './Dynamics';
import { GravitySwitch } from './GravitySwitch';
import { Aabb } from '../physics/boxPhysics';
import { AXIS_ORDER, SkinRuntime, SurfaceRole } from '../skins/Skin';

export interface BuiltLevel {
  name: string;
  hint: string;
  spawnPosition: Vector3;
  entranceAxis: GravityAxis;
  exitAxis: GravityAxis;
  switches: GravitySwitch[];
  exitCenter: Vector3;
  exitRadius: number;
  dynamics: LevelDynamics;
  /** Advances crates, plates and doors. */
  update(dt: number, gravity: Vector3, playerPos: Vector3): DynamicsEvents;
  dispose(): void;
}

type Axis = 'x' | 'y' | 'z';
type Face = '+x' | '-x' | '+y' | '-y' | '+z' | '-z';
/** Wall thickness. */
export const T = 1;

/** Small helper that accumulates a level's meshes/materials so it can be torn down again. */
export class Builder {
  public readonly meshes: Mesh[] = [];
  public readonly switches: GravitySwitch[] = [];
  public readonly solids: Aabb[] = [];
  public readonly dynamics = new LevelDynamics(this.solids);
  /** Surface roles, named for how level code uses them. */
  public readonly wall: SurfaceRole = 'shell';
  public readonly floor: SurfaceRole = 'shell';
  public readonly alcove: SurfaceRole = 'alcove';
  public readonly exit: SurfaceRole = 'exit';
  private readonly multiMaterials = new Map<SurfaceRole, MultiMaterial>();
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
    const m = MeshBuilder.CreateBox(`lvl_${this.n++}`, { width: size.x, height: size.y, depth: size.z }, this.scene);
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

  public addSwitch(position: Vector3, wallNormal: Vector3, target: GravityAxis): void {
    const sw = new GravitySwitch(this.scene, position, wallNormal, target, this.skin.leverColor(target));
    sw.root.getChildMeshes().forEach((m) => this.skin.decorateProp(m as Mesh));
    this.switches.push(sw);
  }

  /** A gravity-driven cube. `center` is where it starts; it will fall from there. */
  public addCrate(center: Vector3, size = 1.5): Crate {
    const crate = new Crate(this.scene, center, size);
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

  public finish(info: Omit<BuiltLevel, 'switches' | 'dispose' | 'dynamics' | 'update'>): BuiltLevel {
    return {
      ...info,
      switches: this.switches,
      dynamics: this.dynamics,
      update: (dt, gravity, playerPos) => this.dynamics.update(dt, gravity, playerPos),
      dispose: () => {
        this.meshes.forEach((m) => m.dispose());
        this.switches.forEach((s) => s.dispose());
        this.dynamics.dispose();
        // Sub-materials belong to the skin and outlive the level.
        this.multiMaterials.forEach((mm) => mm.dispose(false, false, false));
      },
    };
  }
}

/** Shorthand for `new Vector3(x, y, z)`, used throughout chamber layouts. */
export const V = (x: number, y: number, z: number) => new Vector3(x, y, z);

export type LevelFactory = (scene: Scene, skin: SkinRuntime) => BuiltLevel;
