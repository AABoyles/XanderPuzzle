import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MAX_SIM_DELTA } from '../src/time.ts';
import {
  AXES,
  areAdjacent,
  GravitySequencer,
  opposite,
  rotateClockwise,
  type GravityAxis,
} from '../src/gravity/axes.ts';

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

test('GravitySequencer advances at most one axis per call and keeps its period under capped deltas', () => {
  const seq = new GravitySequencer(['+Y', '+X', '-Y', '-X'], 4);
  seq.start('+Y');
  // Even an enormous delta moves only one step.
  assert.equal(seq.update(100), '+X');
  assert.ok(seq.remaining > 0 && seq.remaining <= 4);
  seq.start('+Y');
  let changes = 0;
  const frames = Math.round(20 * 4 * 3); // three periods at the capped 1/20 s step
  for (let i = 0; i < frames; i++) if (seq.update(MAX_SIM_DELTA)) changes++;
  assert.ok(changes === 2 || changes === 3, `got ${changes}`);
});

test('GravitySequencer restore brings back its clock, its place in the cycle and whether it runs', () => {
  const seq = new GravitySequencer(['+Y', '+X', '-Y', '-X'], 4);
  seq.start('+Y');
  seq.update(1);
  const saved = seq.snapshot();
  const next = seq.next;
  // Run on past two more changes, then stop it.
  seq.update(10);
  seq.update(10);
  seq.stop();
  seq.restore(saved);
  assert.equal(seq.active, true);
  assert.equal(seq.remaining, saved.remaining);
  assert.equal(seq.next, next);
  // Restoring an idle sequencer leaves it idle.
  seq.stop();
  seq.restore({ active: false, remaining: 0, index: 0 });
  assert.equal(seq.active, false);
  assert.equal(seq.update(100), null);
});
