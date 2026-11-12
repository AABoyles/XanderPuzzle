import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RECLAIM_HOLD, touchesPlate } from '../src/game/reclaim.ts';

const trigger = { min: [-1, 0, -1], max: [1, 0.2, 1] };

test('standing on the plate touches it', () => {
  assert.equal(touchesPlate({ x: 0, y: 0.5, z: 0 }, trigger), true);
});

test('the player is half a unit wide: brushing the edge counts, a clear gap does not', () => {
  assert.equal(touchesPlate({ x: 1.4, y: 0.5, z: 0 }, trigger), true);
  assert.equal(touchesPlate({ x: 1.6, y: 0.5, z: 0 }, trigger), false);
  assert.equal(touchesPlate({ x: 0, y: 0.8, z: 0 }, trigger), false);
});

test('touching counts from any side: there is no notion of down', () => {
  assert.equal(touchesPlate({ x: 0, y: -0.4, z: 0 }, trigger), true);
  assert.equal(touchesPlate({ x: 0, y: 0.1, z: -1.4 }, trigger), true);
});

test('the hold is short: a press, not a wait', () => {
  assert.ok(RECLAIM_HOLD > 0 && RECLAIM_HOLD <= 0.5);
});
