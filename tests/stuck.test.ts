import assert from 'node:assert/strict';
import { test } from 'node:test';
import { leversExhausted, reachableAxes, type LeverMoves } from '../src/game/stuck.ts';
import type { GravityAxis } from '../src/gravity/axes.ts';

/** Like GravitySwitch.targetFor: a fixed lever sets its target from any axis a quarter turn away. */
const fixed = (target: GravityAxis, spent = false): LeverMoves => ({
  targetFor: (current) => (spent ? null : current[1] !== target[1] ? target : null),
});
const spent: LeverMoves = { targetFor: () => null };
const cycle = (axes: GravityAxis[]): LeverMoves => ({ targetFor: () => null, cycle: axes });

test('the exit is reachable through a fixed lever', () => {
  // From -Y, a lever to -X; from -X, a lever to +Y.
  const levers = [fixed('-X'), fixed('+Y')];
  assert.equal(leversExhausted('-Y', '+Y', levers), false);
  assert.deepEqual([...reachableAxes('-Y', levers)].sort(), ['+Y', '-X', '-Y']);
});

test('a fixed lever is not usable from the axis it sets, or from its opposite', () => {
  const levers = [fixed('+Y')];
  // From +Y the lever does nothing. From -Y, +Y is the opposite axis: on the same Y line, so not a quarter turn away.
  assert.deepEqual([...reachableAxes('+Y', levers)], ['+Y']);
  assert.equal(leversExhausted('+Y', '-X', levers), true);
  assert.equal(leversExhausted('-Y', '+Y', levers), true);
  assert.equal(leversExhausted('-X', '+Y', levers), false);
});

test('the exit is unreachable once every lever is spent', () => {
  const levers = [fixed('-X', true), spent];
  assert.equal(leversExhausted('-Y', '-X', levers), true);
  assert.equal(leversExhausted('-Y', '-Y', levers), false, 'standing on the exit axis is never stuck');
});

test('a spent lever leaves the rest of the reachable set alone', () => {
  // -Y -> -X (spent lever stays put), then a live lever from -X to +Z.
  const levers = [spent, fixed('+Z')];
  assert.equal(leversExhausted('-X', '+Z', levers), false);
  assert.equal(leversExhausted('-Y', '+X', levers), true);
});

test('a cycle lever makes every axis of its cycle reachable, from any start', () => {
  const levers = [cycle(['+X', '+Z', '-X', '-Z'])];
  assert.equal(leversExhausted('-Y', '-Z', levers), false);
  assert.equal(leversExhausted('+Y', '+X', levers), false);
  assert.equal(leversExhausted('+Y', '-Y', levers), true, '-Y is not in the cycle');
});

test('no levers at all: only the start axis is reachable', () => {
  assert.equal(leversExhausted('+Z', '+Z', []), false);
  assert.equal(leversExhausted('+Z', '-Z', []), true);
});
