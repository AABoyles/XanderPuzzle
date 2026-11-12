import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  PLAYTEST_KEY,
  PlaytestRecorder,
  formatClock,
  loadPlaytest,
  parsePlaytestLog,
  playtestFileName,
  savePlaytest,
  type PlaytestLog,
} from '../src/playtest.ts';

/** A clock that hands out successive ISO times, so visit start times are predictable. */
const clock = () => {
  let n = 0;
  return () => new Date(Date.UTC(2026, 10, 11, 12, 0, n++)).toISOString();
};

/** Installs a Map-backed `localStorage` on globalThis for the duration of `fn`. */
const withStorage = (fn: (map: Map<string, string>) => void) => {
  const map = new Map<string, string>();
  const g = globalThis as { localStorage?: unknown };
  const before = g.localStorage;
  g.localStorage = {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
  };
  try {
    fn(map);
  } finally {
    if (before === undefined) delete g.localStorage;
    else g.localStorage = before;
  }
};

test('a restart continues the same visit', () => {
  const r = new PlaytestRecorder(clock());
  r.begin('keyboard', 'station');
  r.enter('vault');
  r.tick(10);
  r.shift();
  r.restart();
  r.enter('vault');
  r.tick(5);
  r.shift();
  const log = r.toJSON();
  assert.equal(log.visits.length, 1);
  assert.equal(log.visits[0].seconds, 15);
  assert.equal(log.visits[0].shifts, 2);
  assert.equal(log.visits[0].restarts, 1);
});

test('entering another chamber starts a new visit, and re-entering an earlier one later starts another', () => {
  const r = new PlaytestRecorder(clock());
  r.begin('keyboard', 'station');
  r.enter('vault');
  r.tick(3);
  r.enter('shaft');
  r.tick(4);
  r.enter('vault');
  r.tick(1);
  const visits = r.toJSON().visits;
  assert.deepEqual(
    visits.map((v) => [v.id, v.seconds]),
    [
      ['vault', 3],
      ['shaft', 4],
      ['vault', 1],
    ],
  );
  assert.ok(visits[0].startedAt < visits[1].startedAt && visits[1].startedAt < visits[2].startedAt);
});

test('counters count only in the current visit', () => {
  const r = new PlaytestRecorder(clock());
  r.begin('gamepad', 'axis');
  r.shift(); // before any visit: ignored
  r.enter('vault');
  r.shift();
  r.shift();
  r.fall();
  r.undo();
  r.undo();
  r.stuck();
  r.restart();
  const v = r.toJSON().visits[0];
  assert.equal(v.shifts, 2);
  assert.equal(v.falls, 1);
  assert.equal(v.undos, 2);
  assert.equal(v.stuckNotices, 1);
  assert.equal(v.restarts, 1);
  assert.equal(v.cleared, false);
  assert.equal(v.hintTier, 0);
});

test('hint keeps the highest tier shown', () => {
  const r = new PlaytestRecorder(clock());
  r.begin('keyboard', 'station');
  r.enter('vault');
  r.hint(2);
  r.hint(1);
  assert.equal(r.toJSON().visits[0].hintTier, 2);
  r.hint(3);
  assert.equal(r.toJSON().visits[0].hintTier, 3);
});

test('clear records the winning attempt and marks the visit cleared', () => {
  const r = new PlaytestRecorder(clock());
  r.begin('keyboard', 'station');
  r.enter('vault');
  r.tick(20);
  r.clear(12.5, 4);
  const v = r.toJSON().visits[0];
  assert.equal(v.cleared, true);
  assert.equal(v.clearSeconds, 12.5);
  assert.equal(v.clearShifts, 4);
  assert.equal(v.seconds, 20);
});

test('clear without a visit does nothing', () => {
  const r = new PlaytestRecorder(clock());
  r.begin('keyboard', 'station');
  r.clear(1, 1);
  assert.deepEqual(r.toJSON().visits, []);
});

test('tick ignores negative and non-finite steps', () => {
  const r = new PlaytestRecorder(clock());
  r.enter('vault');
  r.tick(-1);
  r.tick(Number.NaN);
  r.tick(2);
  assert.equal(r.toJSON().visits[0].seconds, 2);
});

test('toJSON returns a copy that later events do not change', () => {
  const r = new PlaytestRecorder(clock());
  r.enter('vault');
  const snap = r.toJSON();
  r.shift();
  assert.equal(snap.visits[0].shifts, 0);
});

test('begin records the device and skin; reset empties the visits', () => {
  const r = new PlaytestRecorder(clock());
  r.begin('touch', 'neon');
  r.enter('vault');
  r.reset();
  const log = r.toJSON();
  assert.equal(log.device, 'touch');
  assert.equal(log.skin, 'neon');
  assert.deepEqual(log.visits, []);
});

test('adopt continues a stored log: its last visit stays current', () => {
  const first = new PlaytestRecorder(clock());
  first.begin('keyboard', 'station');
  first.enter('vault');
  first.tick(7);
  const stored = first.toJSON();

  const second = new PlaytestRecorder(clock());
  second.begin('touch', 'axis', stored);
  second.enter('vault'); // a reload in the same chamber
  second.tick(3);
  const log = second.toJSON();
  assert.equal(log.device, 'keyboard');
  assert.equal(log.visits.length, 1);
  assert.equal(log.visits[0].seconds, 10);
});

test('summary: a table of visits with m:ss times and yes/no clears', () => {
  const r = new PlaytestRecorder(clock());
  assert.equal(r.summary(), 'No chamber visits recorded.');
  r.begin('keyboard', 'station');
  r.enter('vault');
  r.tick(75.9);
  r.shift();
  r.clear(75.9, 1);
  r.enter('shaft');
  r.tick(5);
  r.restart();
  r.fall();
  const lines = r.summary().split('\n');
  assert.equal(lines.length, 3);
  assert.equal(lines[0], 'chamber  time  shifts  restarts  falls  undos  cleared');
  assert.equal(lines[1], 'vault    1:15  1       0         0      0      yes');
  assert.equal(lines[2], 'shaft    0:05  0       1         1      0      no');
});

test('formatClock: m:ss, flooring fractions and clamping negatives', () => {
  assert.equal(formatClock(0), '0:00');
  assert.equal(formatClock(9.99), '0:09');
  assert.equal(formatClock(61), '1:01');
  assert.equal(formatClock(600), '10:00');
  assert.equal(formatClock(-3), '0:00');
});

test('playtestFileName: the saved file name carries the local date and time', () => {
  const d = new Date(2026, 10, 11, 9, 5);
  assert.equal(playtestFileName(d), 'shiftbound-playtest-20261111-0905.json');
});

test('parsePlaytestLog: garbage gives null', () => {
  for (const raw of [null, undefined, 42, 'x', [], {}, { version: 2, startedAt: 'x', visits: [] }]) {
    assert.equal(parsePlaytestLog(raw), null);
  }
  assert.equal(parsePlaytestLog({ version: 1, startedAt: 'x', visits: 'nope' }), null);
});

test('parsePlaytestLog: drops malformed visits and keeps the valid ones', () => {
  const good = {
    id: 'vault',
    startedAt: 't',
    seconds: 4,
    shifts: 1,
    restarts: 0,
    falls: 0,
    undos: 0,
    stuckNotices: 0,
    hintTier: 0,
    cleared: false,
  };
  const log = parsePlaytestLog({
    version: 1,
    startedAt: 't',
    visits: [good, { ...good, id: 'bad', shifts: -1 }, { ...good, id: 'bad2', cleared: 'yes' }, 'junk'],
  });
  assert.ok(log);
  assert.deepEqual(
    log.visits.map((v) => v.id),
    ['vault'],
  );
  assert.equal(log.device, 'unknown');
  assert.equal(log.skin, 'unknown');
});

test('parsePlaytestLog round-trips a recorded log through JSON', () => {
  const r = new PlaytestRecorder(clock());
  r.begin('gamepad', 'monolith');
  r.enter('vault');
  r.tick(12.25);
  r.shift();
  r.undo();
  r.hint(1);
  r.clear(12.25, 1);
  r.enter('shaft');
  r.stuck();
  const log = r.toJSON();
  const parsed = parsePlaytestLog(JSON.parse(JSON.stringify(log)));
  assert.deepEqual(parsed, log);
  assert.equal(parsed?.visits[0].clearSeconds, 12.25);
  assert.equal(parsed?.visits[0].clearShifts, 1);
  assert.equal(parsed?.visits[1].clearSeconds, undefined);
});

test('savePlaytest and loadPlaytest store the log under shiftbound.playtest', () => {
  const r = new PlaytestRecorder(clock());
  r.begin('keyboard', 'station');
  r.enter('vault');
  const log: PlaytestLog = r.toJSON();
  withStorage((map) => {
    assert.equal(savePlaytest(log), true);
    assert.ok(map.has(PLAYTEST_KEY));
    assert.deepEqual(loadPlaytest(), log);
  });
});

test('storage: corrupt data loads as null, and no storage is harmless', () => {
  withStorage((map) => {
    map.set(PLAYTEST_KEY, '{not json');
    assert.equal(loadPlaytest(), null);
  });
  // Node has no localStorage: loading gives nothing and saving reports failure without throwing.
  assert.equal(loadPlaytest(), null);
  const r = new PlaytestRecorder(clock());
  r.begin('keyboard', 'station');
  assert.equal(savePlaytest(r.toJSON()), false);
});
