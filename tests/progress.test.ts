import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  PROGRESS_KEY,
  emptyProgress,
  formatBest,
  formatShifts,
  furthestCleared,
  isUnlocked,
  loadProgress,
  migrateLegacy,
  parseProgress,
  recordWin,
  resetProgress,
  resumeIndex,
  saveProgress,
  setResume,
  type ProgressStorage,
} from '../src/progress.ts';

const IDS = ['a', 'b', 'c', 'd', 'e'];

/** A Map-backed ProgressStorage, standing in for `localStorage`. */
const memory = (entries: Record<string, string> = {}) => {
  const map = new Map<string, string>(Object.entries(entries));
  const storage: ProgressStorage = {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
  };
  return { storage, map };
};
const legacy = (o: Record<string, number | string>) =>
  memory(Object.fromEntries(Object.entries(o).map(([k, v]) => [`shiftbound.${k}`, String(v)])));
const stored = (map: Map<string, string>) => JSON.parse(map.get(PROGRESS_KEY)!);

test('empty store: nothing cleared, resume at 0, nothing written', () => {
  const { storage, map } = memory();
  const p = loadProgress(storage, IDS);
  assert.equal(furthestCleared(p, IDS), -1);
  assert.equal(resumeIndex(p, IDS), 0);
  assert.equal(map.size, 0);
});

test('recordWin: marks cleared, keeps the better time, reports new bests', () => {
  const p = emptyProgress();
  assert.equal(recordWin(p, 'b', 30), true);
  assert.equal(recordWin(p, 'b', 40), false);
  assert.equal(p.best.b, 30);
  assert.equal(recordWin(p, 'b', 20), true);
  assert.equal(p.best.b, 20);
  assert.deepEqual(p.cleared, ['b']);
});

test('furthestCleared: uses the current order and never moves backwards on replay', () => {
  const p = emptyProgress();
  recordWin(p, 'c', 5);
  assert.equal(furthestCleared(p, IDS), 2);
  recordWin(p, 'a', 5);
  assert.equal(furthestCleared(p, IDS), 2);
});

test('ids key progress: reordering or inserting chambers keeps times on the same chamber', () => {
  const p = emptyProgress();
  recordWin(p, 'c', 12.5);
  const reordered = ['c', 'a', 'x', 'b', 'd', 'e'];
  assert.equal(p.best.c, 12.5);
  assert.equal(furthestCleared(p, reordered), 0);
  assert.equal(formatBest(p.best[reordered[0]]), '12.5s');
  setResume(p, 'd');
  assert.equal(resumeIndex(p, reordered), 4);
});

test('resumeIndex: unknown or removed chamber falls back to 0', () => {
  const p = emptyProgress();
  setResume(p, 'gone');
  assert.equal(resumeIndex(p, IDS), 0);
});

test('save then load round-trips and writes a version', () => {
  const { storage, map } = memory();
  const p = emptyProgress();
  recordWin(p, 'b', 9.5);
  setResume(p, 'c');
  assert.equal(saveProgress(storage, p), true);
  assert.equal(stored(map).version, 2);
  assert.deepEqual(loadProgress(storage, IDS), p);
});

test('migration: legacy keys convert to ids, are removed, and run once', () => {
  const { storage, map } = legacy({ level: 3, cleared: 1, 'best.0': 11, 'best.2': 22.5 });
  const p = loadProgress(storage, IDS);
  assert.deepEqual(p.cleared, ['a', 'b', 'c']);
  assert.deepEqual(p.best, { a: 11, c: 22.5 });
  assert.equal(p.resume, 'd');
  assert.equal(furthestCleared(p, IDS), 2);
  assert.ok(![...map.keys()].some((k) => k.startsWith('shiftbound.best.') || k === 'shiftbound.level'));
  assert.ok(!map.has('shiftbound.cleared'));
  // A second load reads the versioned document; re-planted legacy keys are ignored.
  map.set('shiftbound.cleared', '4');
  assert.deepEqual(loadProgress(storage, IDS), p);
});

test('migration: cleared key and best times alone', () => {
  const p = migrateLegacy(legacy({ cleared: 2 }).storage, IDS);
  assert.deepEqual(p.cleared, ['a', 'b', 'c']);
  assert.equal(p.resume, undefined);
  const q = migrateLegacy(legacy({ 'best.4': 3, 'best.9': 3 }).storage, IDS);
  assert.deepEqual(q.cleared, ['e']);
  assert.deepEqual(q.best, { e: 3 });
});

test('migration: garbage and out-of-range legacy values fall back to defaults', () => {
  const { storage } = legacy({ level: 'abc', cleared: 'NaN', 'best.1': 'oops', 'best.2': -4, 'best.3': '' });
  const p = loadProgress(storage, IDS);
  assert.equal(furthestCleared(p, IDS), -1);
  assert.equal(resumeIndex(p, IDS), 0);
  const big = migrateLegacy(legacy({ level: 99, cleared: 99 }).storage, IDS);
  assert.equal(big.cleared.length, IDS.length);
  assert.equal(big.resume, undefined);
});

test('migration of nothing writes nothing', () => {
  const { storage, map } = legacy({ skin: 2 });
  loadProgress(storage, IDS);
  assert.equal(map.has(PROGRESS_KEY), false);
  assert.equal(map.get('shiftbound.skin'), '2');
});

test('corrupt or malformed saved document gives empty progress without throwing', () => {
  for (const text of ['{not json', '[]', 'null', '"x"', '42']) {
    const p = loadProgress(memory({ [PROGRESS_KEY]: text }).storage, IDS);
    assert.deepEqual(p, emptyProgress());
  }
});

test('parseProgress drops non-finite and negative times, bad ids and duplicates', () => {
  const p = parseProgress({
    cleared: ['a', 'a', 7, null, 'b'],
    best: { a: 5, b: 'x', c: -1, d: null, e: Infinity },
    resume: 12,
  });
  assert.deepEqual(p.cleared, ['a', 'b']);
  assert.deepEqual(p.best, { a: 5 });
  assert.equal(p.resume, undefined);
  assert.deepEqual(parseProgress({ cleared: 'a', best: [1] }), emptyProgress());
});

test('unavailable storage: null storage and throwing storage never crash', () => {
  assert.deepEqual(loadProgress(null, IDS), emptyProgress());
  assert.equal(saveProgress(null, emptyProgress()), false);
  const boom = () => {
    throw new Error('denied');
  };
  const bad: ProgressStorage = { getItem: boom, setItem: boom, removeItem: boom };
  assert.deepEqual(loadProgress(bad, IDS), emptyProgress());
  assert.equal(saveProgress(bad, emptyProgress()), false);
  assert.deepEqual(resetProgress(bad), emptyProgress());
});

test('resetProgress clears the document and legacy keys but not other data', () => {
  const { storage, map } = legacy({ level: 2, 'best.0': 4, skin: 1 });
  const p = loadProgress(storage, IDS);
  recordWin(p, 'a', 3);
  saveProgress(storage, p);
  map.set('shiftbound.settings', '{}');
  map.set('shiftbound.level', '3');
  assert.deepEqual(resetProgress(storage), emptyProgress());
  assert.deepEqual([...map.keys()].sort(), ['shiftbound.settings', 'shiftbound.skin']);
  assert.deepEqual(loadProgress(storage, IDS), emptyProgress());
});

test('unlockall reproduction: picking chamber 13 under ?unlockall grants nothing on a normal load', () => {
  // main.ts never calls setResume/recordWin/saveProgress when unlockAll is set, so storage stays untouched.
  const { storage, map } = memory();
  const ids = Array.from({ length: 14 }, (_, i) => `c${i}`);
  const unlocked = (i: number) => isUnlocked(i, furthestCleared(loadProgress(storage, ids), ids), true);
  assert.equal(unlocked(13), true);
  assert.equal(map.size, 0);
  const normal = loadProgress(storage, ids);
  assert.equal(furthestCleared(normal, ids), -1);
  assert.equal(isUnlocked(1, -1), false);
  assert.equal(resumeIndex(normal, ids), 0);
});

test('isUnlocked: chambers up to furthest + 1 are playable, unlockAll opens everything', () => {
  assert.equal(isUnlocked(3, 2), true);
  assert.equal(isUnlocked(4, 2), false);
  assert.equal(isUnlocked(0, -1), true);
  assert.equal(isUnlocked(9, -1, true), true);
});

test('formatBest: one decimal place; missing or invalid reads as not completed', () => {
  assert.equal(formatBest(12.345), '12.3s');
  assert.equal(formatBest(undefined), 'not completed');
  assert.equal(formatBest(Number.NaN), 'not completed');
});

test('recordWin keeps the fewest shifts, and a run without a count leaves them alone', () => {
  const p = emptyProgress();
  recordWin(p, 'b', 30, 4);
  assert.equal(p.shifts.b, 4);
  recordWin(p, 'b', 20, 6);
  assert.equal(p.shifts.b, 4);
  recordWin(p, 'b', 50, 3);
  assert.equal(p.shifts.b, 3);
  recordWin(p, 'b', 10);
  assert.equal(p.shifts.b, 3);
  assert.equal(p.best.b, 10);
});

test('shift counts round-trip through storage and reset with the rest of progress', () => {
  const { storage, map } = memory();
  const p = emptyProgress();
  recordWin(p, 'a', 12, 2);
  saveProgress(storage, p);
  assert.deepEqual(stored(map).shifts, { a: 2 });
  assert.deepEqual(loadProgress(storage, IDS), p);
  resetProgress(storage);
  assert.deepEqual(loadProgress(storage, IDS).shifts, {});
});

test('an old save without a shifts field still loads with its times intact', () => {
  const old = JSON.stringify({ version: 2, cleared: ['a', 'b'], best: { a: 11, b: 22.5 }, resume: 'c' });
  const p = loadProgress(memory({ [PROGRESS_KEY]: old }).storage, IDS);
  assert.deepEqual(p.best, { a: 11, b: 22.5 });
  assert.deepEqual(p.cleared, ['a', 'b']);
  assert.equal(p.resume, 'c');
  assert.deepEqual(p.shifts, {});
});

test('parseProgress keeps only whole, non-negative shift counts', () => {
  const p = parseProgress({ shifts: { a: 3, b: 2.5, c: -1, d: '4', e: null, f: 0 } });
  assert.deepEqual(p.shifts, { a: 3, f: 0 });
  assert.deepEqual(parseProgress({ shifts: [3] }).shifts, {});
  assert.deepEqual(parseProgress({ shifts: 'x' }).shifts, {});
});

test('formatShifts: shows the best against par, and nothing unless both are known', () => {
  assert.equal(formatShifts(3, 3), '3/3 shifts');
  assert.equal(formatShifts(5, 3), '5/3 shifts');
  assert.equal(formatShifts(undefined, 3), '');
  assert.equal(formatShifts(3, undefined), '');
  assert.equal(formatShifts(3, 0), '');
});

