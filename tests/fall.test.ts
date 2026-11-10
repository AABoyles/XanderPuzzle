import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  boundsOf,
  chaseDirection,
  distanceOutside,
  ESCAPE_MARGIN,
  FADE_TIME,
  FALL_DURATION,
  FallTracker,
  PLANET_FAR,
  PLANET_NEAR,
  planetDistance,
  type Vec3,
} from '../src/environment/fall.ts';

const box = { min: [-10, -5, 0] as Vec3, max: [10, 5, 60] as Vec3 };

test('boundsOf encloses every solid', () => {
  const b = boundsOf([
    { min: [-1, -1, -1], max: [1, 1, 1] },
    { min: [4, -6, 0], max: [9, 0, 2] },
  ]);
  assert.deepEqual(b, { min: [-1, -6, -1], max: [9, 1, 2] });
  assert.deepEqual(boundsOf([]), { min: [0, 0, 0], max: [0, 0, 0] });
});

test('distanceOutside is zero inside and the straight-line distance outside', () => {
  assert.equal(distanceOutside(box, [0, 0, 30]), 0);
  assert.equal(distanceOutside(box, [10, 5, 60]), 0);
  assert.equal(distanceOutside(box, [0, -8, 30]), 3);
  assert.equal(distanceOutside(box, [13, 9, 30]), 5);
});

test('FallTracker ignores the player until they are past the escape margin', () => {
  const f = new FallTracker();
  f.update(0.1, 0);
  f.update(0.1, ESCAPE_MARGIN);
  assert.equal(f.falling, false);
  assert.equal(f.visibility, 0);
  f.update(0.1, ESCAPE_MARGIN + 0.01);
  assert.equal(f.falling, true);
  assert.ok(f.visibility > 0);
});

test('FallTracker fades in, finishes after the fall duration, and resets', () => {
  const f = new FallTracker();
  const dt = 1 / 60;
  let t = 0;
  while (t < FADE_TIME + dt) {
    f.update(dt, 50);
    t += dt;
  }
  assert.equal(f.visibility, 1);
  assert.equal(f.finished, false);
  while (t < FALL_DURATION + dt) {
    f.update(dt, 50);
    t += dt;
  }
  assert.equal(f.finished, true);
  f.reset();
  assert.equal(f.falling, false);
  assert.equal(f.finished, false);
  assert.equal(f.visibility, 0);
});

test('FallTracker fades back out if the player gets back inside', () => {
  const f = new FallTracker();
  for (let i = 0; i < 60; i++) f.update(1 / 60, 10);
  assert.equal(f.visibility, 1);
  f.update(FADE_TIME / 2, 0);
  assert.equal(f.falling, false);
  assert.ok(f.visibility > 0 && f.visibility < 1);
  f.update(FADE_TIME, 0);
  assert.equal(f.visibility, 0);
});

test('the planet only ever gets closer during the fall', () => {
  assert.equal(planetDistance(0), PLANET_FAR);
  assert.equal(planetDistance(FALL_DURATION), PLANET_NEAR);
  assert.equal(planetDistance(FALL_DURATION * 2), PLANET_NEAR);
  let prev = planetDistance(0);
  for (let t = 0.25; t <= FALL_DURATION; t += 0.25) {
    const d = planetDistance(t);
    assert.ok(d < prev, `distance at ${t}s`);
    prev = d;
  }
});

test('chaseDirection stays unit length and converges on the target', () => {
  const targets: Vec3[] = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, -1],
  ];
  for (const target of targets) {
    let d: Vec3 = [0, -1, 0];
    for (let i = 0; i < 180; i++) {
      d = chaseDirection(d, target, 1 / 60, 4);
      assert.ok(Math.abs(Math.hypot(...d) - 1) < 1e-9);
    }
    const dot = d[0] * target[0] + d[1] * target[1] + d[2] * target[2];
    assert.ok(dot > 0.999, `converged on ${target}`);
  }
});

test('chaseDirection leaves a settled direction alone', () => {
  assert.deepEqual(chaseDirection([0, -1, 0], [0, -1, 0], 1 / 60, 4), [0, -1, 0]);
});
