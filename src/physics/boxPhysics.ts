/**
 * Dependency-free axis-aligned box physics for gravity-driven props (crates).
 *
 * Everything in the game world is an axis-aligned box and gravity is always axis-aligned, so
 * bodies never rotate and a per-axis swept clamp is exact: a body can never tunnel through an
 * obstacle no matter how fast it is moving or how long the frame was.
 */

export type Vec3 = [number, number, number];

export interface Aabb {
  min: Vec3;
  max: Vec3;
}

export interface Body {
  center: Vec3;
  half: Vec3;
  velocity: Vec3;
}

export interface StepOptions {
  /** Per-axis speed cap, units/s. */
  maxSpeed?: number;
  /** Fraction of sideways speed lost per second while resting on a surface. */
  friction?: number;
}

export interface StepResult {
  /** Fastest speed at which the body struck something this step (0 if nothing was hit). */
  impactSpeed: number;
  /** True if the body is pressed against a surface in the direction of gravity. */
  grounded: boolean;
}

const OVERLAP_EPS = 1e-6;
const CONTACT_EPS = 1e-4;

export function bodyAabb(body: Body): Aabb {
  const { center: c, half: h } = body;
  return { min: [c[0] - h[0], c[1] - h[1], c[2] - h[2]], max: [c[0] + h[0], c[1] + h[1], c[2] + h[2]] };
}

/** True if the two boxes share volume (touching faces do not count). */
export function overlaps(a: Aabb, b: Aabb, eps = OVERLAP_EPS): boolean {
  for (let i = 0; i < 3; i++) {
    if (a.max[i] - eps <= b.min[i] || b.max[i] - eps <= a.min[i]) return false;
  }
  return true;
}

/**
 * Moves `box` by `delta`, one axis at a time, stopping flush against any obstacle in the way.
 * Returns how far it actually moved and which axes were blocked. `box` is not modified.
 */
export function sweep(box: Aabb, delta: Vec3, obstacles: Iterable<Aabb>): { moved: Vec3; hit: [boolean, boolean, boolean] } {
  const min: Vec3 = [...box.min];
  const max: Vec3 = [...box.max];
  const moved: Vec3 = [0, 0, 0];
  const hit: [boolean, boolean, boolean] = [false, false, false];
  const list = Array.isArray(obstacles) ? (obstacles as Aabb[]) : [...obstacles];

  for (let a = 0; a < 3; a++) {
    let d = delta[a];
    if (d === 0) continue;
    const b = (a + 1) % 3;
    const c = (a + 2) % 3;
    for (const o of list) {
      // Only obstacles whose cross-section overlaps ours can block movement along this axis.
      if (max[b] - OVERLAP_EPS <= o.min[b] || o.max[b] - OVERLAP_EPS <= min[b]) continue;
      if (max[c] - OVERLAP_EPS <= o.min[c] || o.max[c] - OVERLAP_EPS <= min[c]) continue;
      if (d > 0 && o.min[a] >= max[a] - CONTACT_EPS) {
        const room = Math.max(0, o.min[a] - max[a]);
        if (room < d) {
          d = room;
          hit[a] = true;
        }
      } else if (d < 0 && o.max[a] <= min[a] + CONTACT_EPS) {
        const room = Math.min(0, o.max[a] - min[a]);
        if (room > d) {
          d = room;
          hit[a] = true;
        }
      }
    }
    min[a] += d;
    max[a] += d;
    moved[a] = d;
  }
  return { moved, hit };
}

/** Advances a body by `dt` seconds under the given gravity acceleration. Mutates `body`. */
export function stepBody(
  body: Body,
  gravity: Vec3,
  dt: number,
  obstacles: Iterable<Aabb>,
  options: StepOptions = {},
): StepResult {
  const maxSpeed = options.maxSpeed ?? 40;
  const friction = options.friction ?? 8;
  const v = body.velocity;

  for (let i = 0; i < 3; i++) {
    v[i] = Math.max(-maxSpeed, Math.min(maxSpeed, v[i] + gravity[i] * dt));
  }

  const { moved, hit } = sweep(bodyAabb(body), [v[0] * dt, v[1] * dt, v[2] * dt], obstacles);

  let impactSpeed = 0;
  let grounded = false;
  for (let i = 0; i < 3; i++) {
    body.center[i] += moved[i];
    if (hit[i]) {
      impactSpeed = Math.max(impactSpeed, Math.abs(v[i]));
      if (gravity[i] !== 0 && Math.sign(gravity[i]) === Math.sign(v[i])) grounded = true;
      v[i] = 0;
    }
  }

  if (grounded) {
    const keep = Math.max(0, 1 - friction * dt);
    for (let i = 0; i < 3; i++) {
      if (gravity[i] === 0) v[i] *= keep;
    }
  }
  return { impactSpeed, grounded };
}
