import { Color3, Material, Mesh, MeshBuilder, Scene, Vector3 } from '@babylonjs/core';
import { GridMaterial } from '@babylonjs/materials';
import { GravityAxis } from '../gravity/GravitySystem';
import { GravitySwitch } from './GravitySwitch';

export interface BuiltLevel {
  name: string;
  hint: string;
  spawnPosition: Vector3;
  entranceAxis: GravityAxis;
  exitAxis: GravityAxis;
  switches: GravitySwitch[];
  exitCenter: Vector3;
  exitRadius: number;
  dispose(): void;
}

type Axis = 'x' | 'y' | 'z';
type Face = '+x' | '-x' | '+y' | '-y' | '+z' | '-z';
const T = 1; // wall thickness

/** Small helper that accumulates a level's meshes/materials so it can be torn down again. */
class Builder {
  public readonly meshes: Mesh[] = [];
  public readonly switches: GravitySwitch[] = [];
  public readonly wall: GridMaterial;
  public readonly floor: GridMaterial;
  public readonly alcove: GridMaterial;
  public readonly exit: GridMaterial;
  private n = 0;

  constructor(private readonly scene: Scene, accent: Color3) {
    this.wall = this.grid('wallMat', new Color3(0.08, 0.09, 0.12), accent, 1);
    this.floor = this.grid('floorMat', new Color3(0.1, 0.1, 0.13), new Color3(0.9, 0.6, 0.2), 1);
    this.alcove = this.grid('alcoveMat', new Color3(0.07, 0.08, 0.1), new Color3(0.5, 0.35, 0.8), 0.8);
    this.exit = this.grid('exitMat', new Color3(0.05, 0.12, 0.08), new Color3(0.3, 1.0, 0.5), 0.8);
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

  public box(min: Vector3, max: Vector3, material: Material): void {
    const size = max.subtract(min);
    if (size.x <= 1e-6 || size.y <= 1e-6 || size.z <= 1e-6) return;
    const m = MeshBuilder.CreateBox(`lvl_${this.n++}`, { width: size.x, height: size.y, depth: size.z }, this.scene);
    m.position = min.add(max).scale(0.5);
    m.material = material;
    m.checkCollisions = true;
    m.isPickable = true;
    m.freezeWorldMatrix();
    this.meshes.push(m);
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
    material: Material,
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
  public tube(min: Vector3, max: Vector3, open: Face[], material: Material): void {
    const has = (f: Face) => !open.includes(f);
    if (has('-x')) this.slab('x', min.x - T, min.x, [min.y, max.y], [min.z, max.z], material);
    if (has('+x')) this.slab('x', max.x, max.x + T, [min.y, max.y], [min.z, max.z], material);
    if (has('-y')) this.slab('y', min.y - T, min.y, [min.x, max.x], [min.z, max.z], material);
    if (has('+y')) this.slab('y', max.y, max.y + T, [min.x, max.x], [min.z, max.z], material);
    if (has('-z')) this.slab('z', min.z - T, min.z, [min.x, max.x], [min.y, max.y], material);
    if (has('+z')) this.slab('z', max.z, max.z + T, [min.x, max.x], [min.y, max.y], material);
  }

  public addSwitch(position: Vector3, wallNormal: Vector3, target: GravityAxis): void {
    this.switches.push(new GravitySwitch(this.scene, position, wallNormal, target));
  }

  public finish(info: Omit<BuiltLevel, 'switches' | 'dispose'>): BuiltLevel {
    return {
      ...info,
      switches: this.switches,
      dispose: () => {
        this.meshes.forEach((m) => m.dispose());
        this.switches.forEach((s) => s.dispose());
        [this.wall, this.floor, this.alcove, this.exit].forEach((m) => m.dispose());
      },
    };
  }
}

const V = (x: number, y: number, z: number) => new Vector3(x, y, z);

/**
 * Level 1 - a hollow cube. -Y -> +Z -> +X, then drop through the hole in the final floor.
 */
function buildVault(scene: Scene): BuiltLevel {
  const b = new Builder(scene, new Color3(0.25, 0.55, 0.9));
  const R = 12;
  const full: [number, number] = [-R, R];

  b.slab('y', -R - T, -R, full, full, b.floor);
  b.slab('y', R, R + T, full, full, b.wall);
  b.slab('z', R, R + T, full, full, b.wall);
  b.slab('x', -R - T, -R, full, full, b.wall);
  b.slab('z', -R - T, -R, full, full, b.wall, { u: [-2, 2], v: [-R, -R + 3] });
  b.slab('x', R, R + T, full, full, b.wall, { u: [-2.5, 2.5], v: [-2.5, 2.5] });

  b.tube(V(-2, -R, -R - 9), V(2, -R + 3, -R - T), ['+z'], b.alcove);
  b.tube(V(R + T, -2.5, -2.5), V(R + 9, 2.5, 2.5), ['-x'], b.exit);

  b.addSwitch(V(0, -R + 1.5, R - 0.3), V(0, 0, -1), '+Z');
  b.addSwitch(V(R - 0.3, 0, R - 1.5), V(-1, 0, 0), '+X');

  return b.finish({
    name: 'I · THE VAULT',
    hint: 'Levers pull gravity toward the wall their arrow points at.',
    spawnPosition: V(0, -R + 0.5, -R - 5),
    entranceAxis: '-Y',
    exitAxis: '+X',
    exitCenter: V(R + 7, 0, 0),
    exitRadius: 2.5,
  });
}

/**
 * Level 2 - a 40-unit vertical shaft. The exit door is at the very top, upside down.
 * -Y -> +X (walk up the wall) -> +Y (stand on the ceiling).
 */
function buildShaft(scene: Scene): BuiltLevel {
  const b = new Builder(scene, new Color3(0.9, 0.35, 0.55));
  const W = 5;
  const y0 = -5;
  const y1 = 35;
  const w: [number, number] = [-W, W];
  const h: [number, number] = [y0, y1];

  b.slab('y', y0 - T, y0, w, w, b.floor);
  b.slab('y', y1, y1 + T, w, w, b.wall);
  b.slab('x', W, W + T, h, w, b.wall);
  b.slab('z', W, W + T, w, h, b.wall);
  b.slab('z', -W - T, -W, w, h, b.wall, { u: [-2, 2], v: [y0, y0 + 3] });
  b.slab('x', -W - T, -W, h, w, b.wall, { u: [y1 - 3, y1], v: [-2, 2] });

  b.tube(V(-2, y0, -W - 9), V(2, y0 + 3, -W - T), ['+z'], b.alcove);
  b.tube(V(-W - 9, y1 - 3, -2), V(-W - T, y1, 2), ['+x'], b.exit);

  b.addSwitch(V(W - 0.3, y0 + 1.5, 0), V(-1, 0, 0), '+X');
  b.addSwitch(V(W - 1.5, y1 - 0.3, 0), V(0, -1, 0), '+Y');

  return b.finish({
    name: 'II · THE SHAFT',
    hint: 'The way out is a long way up. Walls are just floors you have not met yet.',
    spawnPosition: V(0, y0 + 0.5, -W - 5),
    entranceAxis: '-Y',
    exitAxis: '+Y',
    exitCenter: V(-W - 7, y1 - 1, 0),
    exitRadius: 2,
  });
}

/**
 * Level 3 - a room split by a partition that stops short of the ceiling.
 * -Y -> +X (walk up and over the partition) -> +Z (the far wall, with the exit pit).
 */
function buildDivide(scene: Scene): BuiltLevel {
  const b = new Builder(scene, new Color3(0.3, 0.85, 0.75));
  const R = 8;
  const full: [number, number] = [-R, R];

  b.slab('y', -R - T, -R, full, full, b.floor);
  b.slab('y', R, R + T, full, full, b.wall);
  b.slab('x', -R - T, -R, full, full, b.wall);
  b.slab('x', R, R + T, full, full, b.wall);
  b.slab('z', -R - T, -R, full, full, b.wall, { u: [-2, 2], v: [-R, -R + 3] });
  b.slab('z', R, R + T, full, full, b.wall, { u: [-6, -2], v: [-6, -2] });

  // The partition: full width, 12 of the room's 16 units tall.
  b.box(V(-R, -R, 0), V(R, 4, 1), b.alcove);

  b.tube(V(-2, -R, -R - 9), V(2, -R + 3, -R - T), ['+z'], b.alcove);
  b.tube(V(-6, -6, R + T), V(-2, -2, R + 9), ['-z'], b.exit);

  b.addSwitch(V(R - 0.3, -R + 1.5, -4), V(-1, 0, 0), '+X');
  b.addSwitch(V(R - 1.5, 6, R - 0.3), V(0, 0, -1), '+Z');

  return b.finish({
    name: 'III · THE DIVIDE',
    hint: 'Too tall to jump. But is it too tall to walk around?',
    spawnPosition: V(0, -R + 0.5, -R - 5),
    entranceAxis: '-Y',
    exitAxis: '+Z',
    exitCenter: V(-4, -4, R + 7),
    exitRadius: 2.5,
  });
}

/**
 * Level 4 - three shifts around the room: -Y -> -X -> +Y -> +X, each lever only reachable
 * from the surface the previous one puts you on.
 */
function buildSpiral(scene: Scene): BuiltLevel {
  const b = new Builder(scene, new Color3(0.95, 0.8, 0.3));
  const R = 8;
  const full: [number, number] = [-R, R];

  b.slab('y', -R - T, -R, full, full, b.floor);
  b.slab('y', R, R + T, full, full, b.wall);
  b.slab('x', -R - T, -R, full, full, b.wall);
  b.slab('z', R, R + T, full, full, b.wall);
  b.slab('z', -R - T, -R, full, full, b.wall, { u: [-2, 2], v: [-R, -R + 3] });
  b.slab('x', R, R + T, full, full, b.wall, { u: [-6, -2], v: [-6, -2] });

  b.tube(V(-2, -R, -R - 9), V(2, -R + 3, -R - T), ['+z'], b.alcove);
  b.tube(V(R + T, -6, -6), V(R + 9, -2, -2), ['-x'], b.exit);

  b.addSwitch(V(-R + 0.3, -R + 1.5, 0), V(1, 0, 0), '-X');
  b.addSwitch(V(-R + 1.5, R - 0.3, 0), V(0, -1, 0), '+Y');
  b.addSwitch(V(R - 0.3, R - 1.5, 0), V(-1, 0, 0), '+X');
  // Decoy: the far wall is a dead end, with a lever on the old floor to come back.
  b.addSwitch(V(0, -R + 1.5, R - 0.3), V(0, 0, -1), '+Z');
  b.addSwitch(V(0, -R + 0.3, R - 1.5), V(0, 1, 0), '-Y');

  return b.finish({
    name: 'IV · THE SPIRAL',
    hint: 'One lever leads to the next. Not every lever leads somewhere.',
    spawnPosition: V(0, -R + 0.5, -R - 5),
    entranceAxis: '-Y',
    exitAxis: '+X',
    exitCenter: V(R + 7, -4, -4),
    exitRadius: 2.5,
  });
}

export const LEVELS: Array<(scene: Scene) => BuiltLevel> = [buildVault, buildShaft, buildDivide, buildSpiral];
