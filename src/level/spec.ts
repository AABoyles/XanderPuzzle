// Babylon-free: a simple chamber described as plain data. `buildFromSpec` (buildSpec.ts) reads it with the Builder;
// `checkSpec` checks it without building anything, so tests and a future level editor need no engine.
import { AXES, type GravityAxis } from '../gravity/axes.ts';
import { reachableAxes } from '../game/stuck.ts';

/** The wall thickness; `Builder`'s `T`, which a test keeps equal. */
export const WALL_T = 1;

export type Vec = [number, number, number];
export type Pair = [number, number];
/** The surface roles of the Builder: `wall` and `floor` are both `shell`. */
export type Role = 'shell' | 'alcove' | 'exit' | 'feature';
export type Face = '+x' | '-x' | '+y' | '-y' | '+z' | '-z';

export type Part =
  /** A wall: a slab between `lo` and `hi` along `axis`, covering `u` x `v` (the other two axes in x, y, z order), with an optional hole. */
  | {
      kind: 'slab';
      axis: 'x' | 'y' | 'z';
      lo: number;
      hi: number;
      u: Pair;
      v: Pair;
      role: Role;
      hole?: { u: Pair; v: Pair };
    }
  | { kind: 'box'; min: Vec; max: Vec; role?: Role }
  /** Walls round a box, except on the `open` faces. */
  | { kind: 'tube'; min: Vec; max: Vec; open: Face[]; role: Role }
  | { kind: 'glass'; min: Vec; max: Vec };

export interface LeverSpec {
  at: Vec;
  /** The way the lever faces: out of its wall into the room. */
  normal: Vec;
  target: GravityAxis;
  once?: boolean;
}

export interface PlacardSpec {
  at: Vec;
  normal: Vec;
  readAs: GravityAxis;
  text: string;
  /** `margin` is a handwritten note; the default is a stencil. */
  voice?: 'stencil' | 'margin';
  width?: number;
  lineHeight?: number;
  top?: Vec;
}

export interface ChamberSpec {
  /** The accent colour, as red, green, blue in 0..1. */
  accent: Vec;
  parts: Part[];
  /** In the order the chamber's `__debug.switches()` and e2e row index them. */
  levers: LeverSpec[];
  placards: PlacardSpec[];
  /** What `finish()` takes. */
  name: string;
  hint: string;
  spawn: Vec;
  entranceAxis: GravityAxis;
  exitAxis: GravityAxis;
  exitCenter: Vec;
  exitRadius: number;
  vista?: boolean;
  /** The chamber ends the game: no reclaimer at the exit. */
  ending?: boolean;
}

const isAxisNormal = (n: Vec) => n.filter((c) => c !== 0).length === 1 && n.every((c) => c === 0 || Math.abs(c) === 1);
const finite = (v: number[]) => v.every(Number.isFinite);

/**
 * Problems with a spec that need no build to find: bad axes, normals that are not axis-aligned unit vectors, empty or
 * inverted boxes, and an exit gravity the levers cannot reach (the same lever-only check as `leversExhausted`).
 * Empty when it is sound. Geometry checks (spawn floor, placards on faces) still belong to the built-level tests.
 */
export function checkSpec(spec: ChamberSpec): string[] {
  const out: string[] = [];
  for (const [what, axis] of [
    ['entranceAxis', spec.entranceAxis],
    ['exitAxis', spec.exitAxis],
  ] as const) {
    if (!AXES.includes(axis)) out.push(`${what} ${axis} is not a gravity axis`);
  }
  const box = (what: string, min: Vec, max: Vec) => {
    if (!finite([...min, ...max])) out.push(`${what} has a non-finite coordinate`);
    else if (min.some((c, i) => c >= max[i])) out.push(`${what} is empty or inverted: ${min} to ${max}`);
  };
  spec.parts.forEach((p, i) => {
    if (p.kind === 'slab') {
      if (!(p.lo < p.hi) || !(p.u[0] < p.u[1]) || !(p.v[0] < p.v[1])) out.push(`part ${i} (slab) is empty or inverted`);
      if (p.hole && !(p.hole.u[0] < p.hole.u[1] && p.hole.v[0] < p.hole.v[1]))
        out.push(`part ${i} (slab) has a bad hole`);
    } else box(`part ${i} (${p.kind})`, p.min, p.max);
  });
  spec.levers.forEach((l, i) => {
    if (!AXES.includes(l.target)) out.push(`lever ${i} targets ${l.target}`);
    if (!isAxisNormal(l.normal)) out.push(`lever ${i} normal ${l.normal} is not an axis-aligned unit vector`);
  });
  spec.placards.forEach((p, i) => {
    if (!isAxisNormal(p.normal)) out.push(`placard ${i} normal ${p.normal} is not an axis-aligned unit vector`);
    if (!AXES.includes(p.readAs)) out.push(`placard ${i} reads as ${p.readAs}`);
    if (!p.text.trim()) out.push(`placard ${i} has no text`);
  });
  if (!finite([...spec.spawn, ...spec.exitCenter, spec.exitRadius]) || spec.exitRadius <= 0) {
    out.push('spawn or exit is not a finite position with a positive radius');
  }
  // A fixed lever turns gravity a quarter turn to its target: not from the same or the opposite axis.
  const levers = spec.levers.map((l) => ({ targetFor: (c: GravityAxis) => (c[1] !== l.target[1] ? l.target : null) }));
  if (!reachableAxes(spec.entranceAxis, levers).has(spec.exitAxis)) {
    out.push(`the levers cannot take gravity from ${spec.entranceAxis} to ${spec.exitAxis}`);
  }
  return out;
}
