import assert from 'node:assert/strict';
import { test } from 'node:test';
import { AXES, areAdjacent, GravitySequencer, opposite, rotateClockwise, type GravityAxis } from '../src/gravity/axes.ts';

test('rotateClockwise leaves the axis of rotation alone', () => {
  for (const a of AXES) {
    assert.equal(rotateClockwise(a, a), a);
    assert.equal(rotateClockwise(opposite(a), a), opposite(a));
  }
});

test('rotateClockwise is a quarter turn: four steps come back, each step is adjacent', () => {
  for (const around of AXES) {
    for (const start of AXES.filter((a) => areAdjacent(a, around))) {
      let a: GravityAxis = start;
      for (let i = 0; i < 4; i++) {
        const next = rotateClockwise(a, around);
        assert.ok(areAdjacent(a, next), `${a} -> ${next} around ${around}`);
        assert.ok(areAdjacent(next, around));
        a = next;
      }
      assert.equal(a, start);
      assert.equal(rotateClockwise(rotateClockwise(start, around), around), opposite(start));
    }
  }
});

test('rotateClockwise turns clockwise as seen facing the wall', () => {
  // Facing a wall whose normal is -Z (looking along +Z): right is +X, up is +Y. Clockwise takes
  // down (-Y) to left (-X), then up, then right.
  assert.equal(rotateClockwise('-Y', '-Z'), '-X');
  assert.equal(rotateClockwise('-X', '-Z'), '+Y');
  assert.equal(rotateClockwise('+Y', '-Z'), '+X');
  assert.equal(rotateClockwise('+X', '-Z'), '-Y');
  // The opposite wall turns the other way in world terms.
  assert.equal(rotateClockwise('-Y', '+Z'), '+X');
});

test('GravitySequencer cycles on its period, continuing from the current axis', () => {
  const s = new GravitySequencer(['-Y', '+X', '+Z'], 2);
  assert.equal(s.update(5), null, 'idle until started');
  s.start('+X');
  assert.equal(s.next, '+Z');
  assert.equal(s.update(1.5), null);
  assert.equal(s.update(0.6), '+Z');
  assert.ok(Math.abs(s.remaining - 1.9) < 1e-9);
  assert.equal(s.update(1.9), '-Y');
  assert.equal(s.update(2), '+X');
  s.stop();
  assert.equal(s.update(10), null);
});

test('GravitySequencer rejects half turns', () => {
  assert.throws(() => new GravitySequencer(['-Y', '+Y'], 2));
  assert.throws(() => new GravitySequencer(['-Y', '+X', '+X'], 2));
});
