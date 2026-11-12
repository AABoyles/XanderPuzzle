import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PRINT_IN, PRINT_IN_QUICK, PRINT_IN_REDUCED, printInDuration } from '../src/ui/printTiming.ts';

test('printInDuration gives the full wipe for a first start', () => {
  assert.equal(printInDuration(false, 0), PRINT_IN);
});
test('printInDuration gives the reduced-motion wipe for a first start under reduced motion', () => {
  assert.equal(printInDuration(true, 0), PRINT_IN_REDUCED);
});
test('printInDuration gives the quick wipe on a repeat start', () => {
  assert.equal(printInDuration(false, 1), PRINT_IN_QUICK);
  assert.equal(printInDuration(false, 5), PRINT_IN_QUICK);
});
test('printInDuration gives the quick wipe over the reduced one on a repeat start', () => {
  assert.equal(printInDuration(true, 1), PRINT_IN_QUICK);
  assert.ok(PRINT_IN_QUICK < PRINT_IN_REDUCED);
});
