import assert from 'node:assert/strict';
import { test } from 'node:test';
import { bodyAabb, overlaps, stepBody, sweep, type Aabb, type Body, type Vec3 } from '../src/physics/boxPhysics.ts';

const box = (min: Vec3, max: Vec3): Aabb => ({ min, max });
/** A hollow 16-unit room: six 1-thick walls around [-8, 8]^3. */
const room: Aabb[] = [
  box([-8, -9, -8], [8, -8, 8]),
  box([-8, 8, -8], [8, 9, 8]),
  box([-9, -8, -8], [-8, 8, 8]),
  box([8, -8, -8], [9, 8, 8]),
  box([-8, -8, -9], [8, 8, -8]),
  box([-8, -8, 8], [8, 8, 9]),
];
const crate = (center: Vec3): Body => ({ center, half: [0.75, 0.75, 0.75], velocity: [0, 0, 0] });
const run = (b: Body, g: Vec3, seconds: number, obstacles: Aabb[], dt = 1 / 60) => {
  let impact = 0;
  let grounded = false;
  for (let t = 0; t < seconds; t += dt) {
    const r = stepBody(b, g, dt, obstacles);
    impact = Math.max(impact, r.impactSpeed);
    grounded = r.grounded;
  }
  return { impact, grounded };
};
const near = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-3, `${a} !~ ${b}`);

test('overlaps: touching faces do not count', () => {
  assert.equal(overlaps(box([0, 0, 0], [1, 1, 1]), box([1, 0, 0], [2, 1, 1])), false);
  assert.equal(overlaps(box([0, 0, 0], [1, 1, 1]), box([0.9, 0, 0], [2, 1, 1])), true);
});

test('sweep: clamps flush against an obstacle and reports the blocked axis', () => {
  const r = sweep(box([0, 0, 0], [1, 1, 1]), [5, 0, 0], [box([3, 0, 0], [4, 1, 1])]);
  near(r.moved[0], 2);
  assert.deepEqual(r.hit, [true, false, false]);
});

test('sweep: ignores obstacles that are not in the path', () => {
  const r = sweep(box([0, 0, 0], [1, 1, 1]), [5, 0, 0], [box([3, 2, 0], [4, 3, 1])]);
  near(r.moved[0], 5);
  assert.deepEqual(r.hit, [false, false, false]);
});

test('a crate falls and comes to rest on the floor', () => {
  const b = crate([0, 0, 0]);
  const r = run(b, [0, -22, 0], 3, room);
  near(b.center[1], -7.25);
  assert.equal(r.grounded, true);
  assert.ok(r.impact > 10);
  assert.deepEqual(b.velocity, [0, 0, 0]);
});

test('no tunnelling at terminal speed with long frames', () => {
  const b = crate([0, 7, 0]);
  b.velocity = [0, -40, 0];
  run(b, [0, -22, 0], 2, room, 0.25);
  near(b.center[1], -7.25);
});

test('rotating gravity sends a resting crate across the room to the new floor', () => {
  const b = crate([-3, 0, 4]);
  run(b, [0, -22, 0], 3, room);
  run(b, [22, 0, 0], 3, room);
  near(b.center[0], 7.25);
  near(b.center[1], -7.25);
  near(b.center[2], 4);
});

test('crates stack on each other', () => {
  const lower = crate([0, -7.25, 0]);
  const upper = crate([0.5, 0, 0]);
  run(upper, [0, -22, 0], 3, [...room, bodyAabb(lower)]);
  near(upper.center[1], -5.75);
});

test('a crate over a hole falls through; one beside it does not', () => {
  // Floor with a 4x4 hole in the middle, and a catch-floor far below.
  const floor: Aabb[] = [
    box([-8, -9, -8], [-2, -8, 8]),
    box([2, -9, -8], [8, -8, 8]),
    box([-2, -9, -8], [2, -8, -2]),
    box([-2, -9, 2], [2, -8, 8]),
    box([-8, -21, -8], [8, -20, 8]),
  ];
  const through = crate([0, 0, 0]);
  const beside = crate([5, 0, 0]);
  run(through, [0, -22, 0], 4, floor);
  run(beside, [0, -22, 0], 4, floor);
  near(through.center[1], -19.25);
  near(beside.center[1], -7.25);
});

test('sideways velocity bleeds off while grounded', () => {
  const b = crate([0, -7.25, 0]);
  b.velocity = [5, 0, 0];
  run(b, [0, -22, 0], 2, room);
  assert.ok(Math.abs(b.velocity[0]) < 1e-3);
  assert.ok(b.center[0] > 0 && b.center[0] < 7.25);
});
