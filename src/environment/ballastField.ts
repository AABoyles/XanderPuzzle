import type { Aabb } from '../physics/boxPhysics';
import type { Vec3 } from './fall';
import { random } from '../random.ts';

/**
 * Babylon-free layout and motion for the ballast field: the other cubes the player falls past after an escape (see
 * NARRATIVE.md). Lit cubes keep their schedule, turning a quarter turn every few seconds; dark ones tumble. Tested
 * directly by Node.
 *
 * Positions are in the field's own frame, fixed at the moment of the escape: the origin is where the player left the
 * chamber, `y` points up (away from the planet), and `x`/`z` are sideways. `fieldBasis` maps that frame to the world.
 */

export interface FieldCube {
  /** Centre in the field frame. */
  position: Vec3;
  /** Edge length. */
  size: number;
  /** Dark cubes have stopped: they tumble instead of turning. */
  dark: boolean;
  /** Unit rotation axis in the field frame: one of the frame's axes for a lit cube, any direction for a dark one. */
  axis: Vec3;
  /** Lit: seconds between quarter turns. Dark: tumble rate in radians per second. */
  rate: number;
  /** Seconds added to the clock, so cubes don't all turn together. */
  phase: number;
}

export const FIELD_COUNT = 48;
/** No cube's centre comes nearer the fall line than this, so even the largest never reaches the player. */
export const FIELD_CLEARANCE = 70;
export const FIELD_RADIUS = 330;
/** Heights span the fall: a little above the escape point to about where the fall ends (~400 units down). */
export const FIELD_TOP = 150;
export const FIELD_BOTTOM = -380;
/** Near the escape point the player's own chamber is still there, so cubes above `CHAMBER_DEPTH` keep further out. */
export const CHAMBER_DEPTH = -90;
export const CHAMBER_CLEARANCE = 150;
export const CUBE_MIN = 18;
export const CUBE_MAX = 44;
/** Seconds a lit cube takes over its quarter turn. */
export const TURN_TIME = 1.4;

/** Lays out `count` cubes, about `darkFraction` of them dark, with no two overlapping. */
export function layoutField(seed: number, darkFraction: number, count = FIELD_COUNT): FieldCube[] {
  const rand = random(seed);
  const cubes: FieldCube[] = [];
  for (let attempt = 0; cubes.length < count && attempt < count * 20; attempt++) {
    const size = CUBE_MIN + rand() * (CUBE_MAX - CUBE_MIN);
    // Uniform over the ring's area, so the field isn't bunched at the fall line.
    const r = Math.sqrt(FIELD_CLEARANCE ** 2 + rand() * (FIELD_RADIUS ** 2 - FIELD_CLEARANCE ** 2));
    const theta = rand() * Math.PI * 2;
    const position: Vec3 = [r * Math.cos(theta), FIELD_BOTTOM + rand() * (FIELD_TOP - FIELD_BOTTOM), r * Math.sin(theta)];
    const dark = rand() < darkFraction;
    const axis = dark ? randomUnit(rand) : frameAxis(Math.floor(rand() * 3));
    const rate = dark ? 0.05 + rand() * 0.25 : 4 + rand() * 6;
    const phase = rand() * 20;
    const clear = (position[1] < CHAMBER_DEPTH || r > CHAMBER_CLEARANCE) && cubes.every((c) => dist(c.position, position) > (c.size + size) * 0.9);
    if (clear) cubes.push({ position, size, dark, axis, rate, phase });
  }
  return cubes;
}

/** How far the cube has turned about its axis at field time `t`. A lit cube rests on whole quarter turns. */
export function cubeAngle(cube: FieldCube, t: number): number {
  const time = t + cube.phase;
  if (cube.dark) return cube.rate * time;
  const turns = Math.floor(time / cube.rate);
  const into = time - turns * cube.rate - (cube.rate - TURN_TIME);
  const s = Math.min(Math.max(into / TURN_TIME, 0), 1);
  return (Math.PI / 2) * (turns + s * s * (3 - 2 * s));
}

/** The field's sideways and up axes in world space, given the world direction towards the planet. */
export function fieldBasis(down: Readonly<Vec3>): { x: Vec3; y: Vec3; z: Vec3 } {
  const y: Vec3 = [-down[0], -down[1], -down[2]];
  const ref: Vec3 = Math.abs(y[0]) < 0.9 ? [1, 0, 0] : [0, 0, 1];
  const z = normalize(cross(ref, y));
  const x = cross(y, z);
  return { x, y, z };
}

/**
 * The outer hull of the chamber the player is in: a cube around its bounds, so from outside it looks like every other
 * cube in the field. Centred on the bounds, as wide as their longest side plus `margin` all round.
 */
export function chamberHull(bounds: Aabb, margin = 1): { center: Vec3; size: number } {
  const center: Vec3 = [0, 0, 0];
  let size = 0;
  for (let i = 0; i < 3; i++) {
    center[i] = (bounds.min[i] + bounds.max[i]) / 2;
    size = Math.max(size, bounds.max[i] - bounds.min[i]);
  }
  return { center, size: size + margin * 2 };
}

/** World position of a field-frame point, given the frame's origin and basis. */
export function toWorld(origin: Readonly<Vec3>, basis: { x: Vec3; y: Vec3; z: Vec3 }, p: Readonly<Vec3>): Vec3 {
  const out: Vec3 = [0, 0, 0];
  for (let i = 0; i < 3; i++) out[i] = origin[i] + basis.x[i] * p[0] + basis.y[i] * p[1] + basis.z[i] * p[2];
  return out;
}

function frameAxis(i: number): Vec3 {
  return i === 0 ? [1, 0, 0] : i === 1 ? [0, 1, 0] : [0, 0, 1];
}

function randomUnit(rand: () => number): Vec3 {
  const z = rand() * 2 - 1;
  const a = rand() * Math.PI * 2;
  const s = Math.sqrt(1 - z * z);
  return [s * Math.cos(a), s * Math.sin(a), z];
}

function cross(a: Readonly<Vec3>, b: Readonly<Vec3>): Vec3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

function normalize(v: Vec3): Vec3 {
  const l = Math.hypot(v[0], v[1], v[2]);
  return [v[0] / l, v[1] / l, v[2] / l];
}

function dist(a: Readonly<Vec3>, b: Readonly<Vec3>): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}
