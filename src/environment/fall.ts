import type { Aabb } from '../physics/boxPhysics';

/**
 * Babylon-free maths for the fall out of a chamber: when the player counts as having escaped,
 * how long the fall lasts, and where the planet sits while it happens. Tested directly by Node.
 */

export type Vec3 = [number, number, number];

/** How far outside the level's bounding box the player must be before it counts as an escape. */
export const ESCAPE_MARGIN = 2;
/** Seconds of falling before the player is put back at the chamber entrance. */
export const FALL_DURATION = 6;
/** Seconds for the backdrop to fade in after an escape (and out again if the player gets back). */
export const FADE_TIME = 0.5;
/** Distance from the camera to the planet's centre at the start and at the end of the fall. */
export const PLANET_FAR = 400;
export const PLANET_NEAR = 190;
/** The final fall out of the Descent: long, and it ends just above the planet's surface (radius 150). */
export const DESCENT_DURATION = 25;
export const PLANET_LAST = 162;

/** The box enclosing every solid of a level. */
export function boundsOf(solids: readonly Aabb[]): Aabb {
  const min: Vec3 = [Infinity, Infinity, Infinity];
  const max: Vec3 = [-Infinity, -Infinity, -Infinity];
  for (const s of solids) {
    for (let i = 0; i < 3; i++) {
      min[i] = Math.min(min[i], s.min[i]);
      max[i] = Math.max(max[i], s.max[i]);
    }
  }
  return solids.length ? { min, max } : { min: [0, 0, 0], max: [0, 0, 0] };
}

/** How far `p` is outside `bounds`; 0 anywhere inside it. */
export function distanceOutside(bounds: Aabb, p: Readonly<Vec3>): number {
  let sq = 0;
  for (let i = 0; i < 3; i++) {
    const d = Math.max(bounds.min[i] - p[i], 0, p[i] - bounds.max[i]);
    sq += d * d;
  }
  return Math.sqrt(sq);
}

/** Tracks one escape: whether the player is outside, for how long, and how visible space is. */
export class FallTracker {
  /** Seconds a fall lasts before it is over. */
  public duration = FALL_DURATION;
  /** Seconds since the player escaped; 0 while they are inside. */
  public time = 0;
  /** 0 in normal play, rising to 1 shortly after an escape. */
  public visibility = 0;

  public get falling(): boolean {
    return this.time > 0;
  }

  /** True once the fall has run its course and the player should be respawned. */
  public get finished(): boolean {
    return this.time >= this.duration;
  }

  /** Advance by `dt` seconds, given how far outside the level bounds the player is now. */
  public update(dt: number, outside: number): void {
    if (outside > ESCAPE_MARGIN) {
      this.time += dt;
      this.visibility = Math.min(1, this.visibility + dt / FADE_TIME);
    } else {
      // Back inside (or never left): the backdrop fades away again.
      this.time = 0;
      this.visibility = Math.max(0, this.visibility - dt / FADE_TIME);
    }
  }

  public reset(): void {
    this.time = 0;
    this.visibility = 0;
  }
}

/**
 * Distance to the planet's centre `time` seconds into a fall lasting `duration`: it closes in, fastest at first, to
 * `near` at the end.
 */
export function planetDistance(time: number, duration = FALL_DURATION, near = PLANET_NEAR): number {
  const t = Math.min(Math.max(time / duration, 0), 1);
  const eased = 1 - (1 - t) * (1 - t);
  return PLANET_FAR + (near - PLANET_FAR) * eased;
}

/**
 * Turns the unit vector `current` towards the unit vector `target` at `rate` (1/s), so the planet
 * swings round to the new "down" after a gravity shift instead of jumping there.
 */
export function chaseDirection(current: Readonly<Vec3>, target: Readonly<Vec3>, dt: number, rate: number): Vec3 {
  const t = 1 - Math.exp(-rate * dt);
  const from: Vec3 = [current[0], current[1], current[2]];
  const dot = from[0] * target[0] + from[1] * target[1] + from[2] * target[2];
  if (dot < -0.999) {
    // Exactly opposite: a straight blend would pass through zero, so step off sideways first.
    const side: Vec3 = Math.abs(from[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
    for (let i = 0; i < 3; i++) from[i] += side[i] * 0.05;
  }
  const out: Vec3 = [0, 0, 0];
  for (let i = 0; i < 3; i++) out[i] = from[i] + (target[i] - from[i]) * t;
  const len = Math.hypot(out[0], out[1], out[2]);
  if (len < 1e-6) return [target[0], target[1], target[2]];
  return [out[0] / len, out[1] / len, out[2] / len];
}
