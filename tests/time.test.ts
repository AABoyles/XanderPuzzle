import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MAX_SIM_DELTA, simDelta } from '../src/time.ts';

test('simDelta passes a normal frame through', () => {
  assert.equal(simDelta(1 / 60), 1 / 60);
});
test('simDelta caps long frames', () => {
  assert.equal(simDelta(2), MAX_SIM_DELTA);
  assert.equal(simDelta(0.5, 0.1), 0.1);
});
test('simDelta gives zero for zero, negative and non-finite input', () => {
  for (const v of [0, -1, NaN, Infinity, -Infinity]) assert.equal(simDelta(v), 0);
});
