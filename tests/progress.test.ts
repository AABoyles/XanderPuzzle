import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatBest, furthestCleared, isUnlocked, recordCleared, type NumberStore } from '../src/progress.ts';

/** A Map-backed NumberStore, standing in for the `localStorage` wrapper in main.ts. */
const memory = (entries: Record<string, number> = {}) => {
  const map = new Map<string, number>(Object.entries(entries));
  const store: NumberStore = {
    get: (key) => map.get(key),
    set: (key, value) => void map.set(key, value),
  };
  return { store, map };
};

test('furthestCleared: empty store means nothing cleared', () => {
  assert.equal(furthestCleared(memory().store, 10), -1);
});

test('furthestCleared: reads the cleared key', () => {
  assert.equal(furthestCleared(memory({ cleared: 4 }).store, 10), 4);
});

test('furthestCleared: infers progress from best.<i> keys', () => {
  assert.equal(furthestCleared(memory({ 'best.2': 10 }).store, 10), 2);
});

test('furthestCleared: ignores best.<i> keys at or past the total, and NaN or negative times', () => {
  const { store } = memory({ 'best.12': 9, 'best.10': 9, 'best.5': Number.NaN, 'best.7': -1, 'best.3': 20 });
  assert.equal(furthestCleared(store, 10), 3);
  assert.equal(furthestCleared(memory({ 'best.10': 9, 'best.4': -0.5 }).store, 10), -1);
});

test('furthestCleared: infers progress from level (level 3 means chambers 0-2 are done)', () => {
  assert.equal(furthestCleared(memory({ level: 3 }).store, 10), 2);
});

test('furthestCleared: level 0 means nothing is done', () => {
  assert.equal(furthestCleared(memory({ level: 0 }).store, 10), -1);
});

test('furthestCleared: takes the max across cleared, best times and level', () => {
  assert.equal(furthestCleared(memory({ cleared: 1, 'best.4': 3, level: 3 }).store, 10), 4);
  assert.equal(furthestCleared(memory({ cleared: 6, 'best.4': 3, level: 3 }).store, 10), 6);
  assert.equal(furthestCleared(memory({ cleared: 1, 'best.2': 3, level: 6 }).store, 10), 5);
});

test('furthestCleared: clamps to total - 1 when cleared is too big', () => {
  assert.equal(furthestCleared(memory({ cleared: 99 }).store, 5), 4);
  assert.equal(furthestCleared(memory({ level: 50 }).store, 5), 4);
});

test('isUnlocked: chambers up to furthest + 1 are playable, later ones are locked', () => {
  assert.equal(isUnlocked(0, 2), true);
  assert.equal(isUnlocked(2, 2), true);
  assert.equal(isUnlocked(3, 2), true);
  assert.equal(isUnlocked(4, 2), false);
  assert.equal(isUnlocked(0, -1), true);
  assert.equal(isUnlocked(1, -1), false);
});

test('isUnlocked: unlockAll unlocks everything', () => {
  assert.equal(isUnlocked(0, -1, true), true);
  assert.equal(isUnlocked(9, -1, true), true);
});

test('recordCleared: sets cleared when progress moves forward', () => {
  const { store, map } = memory({ cleared: 5 });
  recordCleared(store, 7, 10);
  assert.equal(map.get('cleared'), 7);

  const fresh = memory();
  recordCleared(fresh.store, 0, 10);
  assert.equal(fresh.map.get('cleared'), 0);
});

test('recordCleared: replaying an earlier chamber does not lower cleared', () => {
  const { store, map } = memory({ cleared: 5 });
  recordCleared(store, 2, 10);
  assert.equal(map.get('cleared'), 5);
  recordCleared(store, 5, 10);
  assert.equal(map.get('cleared'), 5);
});

test('formatBest: formats seconds to one decimal place', () => {
  assert.equal(formatBest(12.345), '12.3s');
});

test('formatBest: missing or invalid times read as not completed', () => {
  assert.equal(formatBest(undefined), 'not completed');
  assert.equal(formatBest(Number.NaN), 'not completed');
});
