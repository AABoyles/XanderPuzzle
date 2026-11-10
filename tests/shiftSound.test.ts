import assert from 'node:assert/strict';
import { test } from 'node:test';
import { AXES } from '../src/gravity/axes.ts';
import { shiftTone } from '../src/gravity/shiftSound.ts';

test('every axis has a distinct shift sound', () => {
  const keys = new Set(AXES.map((a) => JSON.stringify(shiftTone(a))));
  assert.equal(keys.size, AXES.length);
});
test('positive axes sweep up and negative axes sweep down', () => {
  for (const a of AXES) {
    const t = shiftTone(a);
    assert.ok(a[0] === '+' ? t.to > t.from : t.to < t.from, a);
  }
});
