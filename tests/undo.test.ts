import assert from 'node:assert/strict';
import { test } from 'node:test';
import { UNDO_LIMIT, UndoStack } from '../src/game/undo.ts';

test('UndoStack pops the newest entry first and is empty after that', () => {
  const s = new UndoStack<number>();
  assert.equal(s.size, 0);
  assert.equal(s.pop(), undefined);
  s.push(1);
  s.push(2);
  assert.equal(s.size, 2);
  assert.equal(s.pop(), 2);
  assert.equal(s.pop(), 1);
  assert.equal(s.pop(), undefined);
  assert.equal(s.size, 0);
});

test('UndoStack drops the oldest entries past its limit', () => {
  const s = new UndoStack<number>();
  for (let i = 0; i < UNDO_LIMIT + 5; i++) s.push(i);
  assert.equal(s.size, UNDO_LIMIT);
  assert.equal(s.pop(), UNDO_LIMIT + 4);
  let last = 0;
  while (s.size) last = s.pop() as number;
  assert.equal(last, 5, 'entries 0 to 4 were dropped');
});

test('UndoStack clear empties it', () => {
  const s = new UndoStack<string>();
  s.push('a');
  s.push('b');
  s.clear();
  assert.equal(s.size, 0);
  assert.equal(s.pop(), undefined);
});
