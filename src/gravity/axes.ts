/**
 * Dependency-free gravity-axis arithmetic. Kept free of Babylon imports so Node can test it.
 */

/** The six axis-aligned directions gravity can point in. */
export type GravityAxis = '+X' | '-X' | '+Y' | '-Y' | '+Z' | '-Z';

export type Vec3 = [number, number, number];

export const AXES: GravityAxis[] = ['+X', '-X', '+Y', '-Y', '+Z', '-Z'];

const VECTORS: Record<GravityAxis, Vec3> = {
  '+X': [1, 0, 0],
  '-X': [-1, 0, 0],
  '+Y': [0, 1, 0],
  '-Y': [0, -1, 0],
  '+Z': [0, 0, 1],
  '-Z': [0, 0, -1],
};

export function axisVec(axis: GravityAxis): Vec3 {
  return [...VECTORS[axis]];
}

/** The axis a (near) axis-aligned vector points along. */
export function axisOf(v: Vec3): GravityAxis {
  const a = v.map(Math.abs);
  const i = a[0] >= a[1] && a[0] >= a[2] ? 0 : a[1] >= a[2] ? 1 : 2;
  return `${v[i] >= 0 ? '+' : '-'}${'XYZ'[i]}` as GravityAxis;
}

export function opposite(axis: GravityAxis): GravityAxis {
  return `${axis[0] === '+' ? '-' : '+'}${axis[1]}` as GravityAxis;
}

/** True if the two axes are 90 degrees apart. */
export function areAdjacent(a: GravityAxis, b: GravityAxis): boolean {
  return a[1] !== b[1];
}

/**
 * Rotates `axis` a quarter turn clockwise around `around`, as seen by someone looking at a wall
 * whose outward normal is `around` (that is, looking along -around). An axis parallel to
 * `around` is unchanged.
 */
export function rotateClockwise(axis: GravityAxis, around: GravityAxis): GravityAxis {
  const v = VECTORS[axis];
  const n = VECTORS[around];
  // Babylon's world is left-handed (+X right, +Y up, +Z forward), so a turn that looks clockwise
  // from the +n side is Rodrigues' formula at +90deg: v' = n (n.v) + n x v.
  const dot = n[0] * v[0] + n[1] * v[1] + n[2] * v[2];
  const cross: Vec3 = [n[1] * v[2] - n[2] * v[1], n[2] * v[0] - n[0] * v[2], n[0] * v[1] - n[1] * v[0]];
  return axisOf([n[0] * dot + cross[0], n[1] * dot + cross[1], n[2] * dot + cross[2]]);
}

/**
 * Cycles gravity through a fixed list of axes, one step every `period` seconds, once started.
 * Consecutive axes (including last -> first) must be 90 degrees apart.
 */
export class GravitySequencer {
  public active = false;
  /** Seconds until the next change, while active. */
  public remaining = 0;
  public readonly axes: GravityAxis[];
  public readonly period: number;
  private index = 0;

  // No parameter properties: Node's type stripping (used by the tests) does not support them.
  constructor(axes: GravityAxis[], period: number) {
    this.axes = axes;
    this.period = period;
    if (axes.length < 2) throw new Error('A sequence needs at least two axes');
    axes.forEach((a, i) => {
      const b = axes[(i + 1) % axes.length];
      if (!areAdjacent(a, b)) throw new Error(`Sequence step ${a} -> ${b} is not a quarter turn`);
    });
  }

  /** Starts cycling. If `current` is in the list the cycle continues from it, else from the first entry. */
  public start(current: GravityAxis): void {
    const i = this.axes.indexOf(current);
    this.index = i < 0 ? this.axes.length - 1 : i;
    this.active = true;
    this.remaining = i < 0 ? 0 : this.period;
  }

  public stop(): void {
    this.active = false;
  }

  /** The clock's state, for undo: restored by `restore`. */
  public snapshot(): { active: boolean; remaining: number; index: number } {
    return { active: this.active, remaining: this.remaining, index: this.index };
  }

  public restore(s: { active: boolean; remaining: number; index: number }): void {
    this.active = s.active;
    this.remaining = s.remaining;
    this.index = s.index;
  }

  /** The axis the next change will switch to. */
  public get next(): GravityAxis {
    return this.axes[(this.index + 1) % this.axes.length];
  }

  /** Advances the clock; returns the axis to switch to if a change is due this frame. */
  public update(dt: number): GravityAxis | null {
    if (!this.active) return null;
    this.remaining -= dt;
    if (this.remaining > 0) return null;
    this.index = (this.index + 1) % this.axes.length;
    this.remaining += this.period;
    if (this.remaining <= 0) this.remaining = this.period;
    return this.axes[this.index];
  }
}
