import assert from 'node:assert/strict';
import { test } from 'node:test';
import { emptyFrame, mergeFrames, stickVector } from '../src/input/InputSource.ts';

test('mergeFrames of nothing is an empty frame', () => {
  assert.deepEqual(mergeFrames([]), emptyFrame());
});

test('mergeFrames sums look and ORs buttons', () => {
  const a = { ...emptyFrame(), lookX: 0.1, lookY: -0.2, jump: true };
  const b = { ...emptyFrame(), lookX: 0.3, lookY: 0.1, sprint: true, interact: true };
  const m = mergeFrames([a, b]);
  assert.ok(Math.abs(m.lookX - 0.4) < 1e-9);
  assert.ok(Math.abs(m.lookY + 0.1) < 1e-9);
  assert.ok(m.jump && m.sprint && m.interact);
});

test('mergeFrames clamps combined movement to unit length', () => {
  const m = mergeFrames([{ ...emptyFrame(), moveZ: 1 }, { ...emptyFrame(), moveX: 1 }]);
  assert.ok(Math.abs(Math.hypot(m.moveX, m.moveZ) - 1) < 1e-9);
  const small = mergeFrames([{ ...emptyFrame(), moveX: 0.3 }, { ...emptyFrame(), moveZ: 0.2 }]);
  assert.equal(small.moveX, 0.3);
  assert.equal(small.moveZ, 0.2);
});

test('stickVector applies a radial deadzone', () => {
  assert.deepEqual(stickVector(3, 3, 60, 0.2), { x: 0, y: 0 });
  assert.deepEqual(stickVector(0, 0, 60, 0.2), { x: 0, y: 0 });
});

test('stickVector points the right way with y up-positive', () => {
  const up = stickVector(0, -60, 60, 0.1);
  assert.ok(Math.abs(up.x) < 1e-9 && Math.abs(up.y - 1) < 1e-9);
  const right = stickVector(60, 0, 60, 0.1);
  assert.ok(Math.abs(right.x - 1) < 1e-9 && Math.abs(right.y) < 1e-9);
  assert.ok(stickVector(0, 40, 60, 0.1).y < 0);
});

test('stickVector clamps to unit length and rescales past the deadzone', () => {
  const far = stickVector(300, 400, 60, 0.2);
  assert.ok(Math.abs(Math.hypot(far.x, far.y) - 1) < 1e-9);
  // Halfway between the deadzone edge (0.2) and full (1.0) is 0.6 of the radius.
  const mid = stickVector(36, 0, 60, 0.2);
  assert.ok(Math.abs(mid.x - 0.5) < 1e-9);
});
