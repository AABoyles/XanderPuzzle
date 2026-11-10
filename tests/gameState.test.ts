import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  escapePauses,
  GameState,
  INITIAL_STATE,
  isFrozen,
  showsTouchControls,
  simulates,
  transition,
  viewOf,
} from '../src/game/GameState.ts';
import type { GameEvent, Kind, State } from '../src/game/GameState.ts';

/** Runs events from the title; every one must be accepted unless it is listed in `ignored`. */
function run(...events: GameEvent[]): State {
  let s = INITIAL_STATE;
  for (const e of events) {
    const n = transition(s, e);
    assert.ok(n, `${e.type} should apply in ${s.kind}`);
    s = n;
  }
  return s;
}

const playing = run({ type: 'begin' });
const falling = run({ type: 'begin' }, { type: 'fell' });
const paused = run({ type: 'begin' }, { type: 'pause' });
const won = run({ type: 'begin' }, { type: 'win' });
const select = run({ type: 'begin' }, { type: 'openChambers' });
const titleSelect = run({ type: 'openChambers' });

const kinds = (s: State | null) => s?.kind ?? null;

test('title: begin and pointer lock start play; most else is ignored', () => {
  assert.equal(INITIAL_STATE.kind, 'title');
  assert.equal(kinds(transition(INITIAL_STATE, { type: 'begin' })), 'playing');
  assert.equal(kinds(transition(INITIAL_STATE, { type: 'locked' })), 'playing');
  assert.equal(transition(INITIAL_STATE, { type: 'locked' })?.begun, true);
  assert.equal(kinds(transition(INITIAL_STATE, { type: 'openChambers' })), 'chamberSelect');
  for (const type of ['pause', 'resume', 'controlLost', 'fell', 'recovered', 'respawn', 'advance'] as const) {
    assert.equal(transition(INITIAL_STATE, { type }), null, type);
  }
  assert.equal(transition(INITIAL_STATE, { type: 'closeChambers', resume: false }), null);
  assert.equal(transition(INITIAL_STATE, { type: 'pick', immediate: true }), null);
});

test('playing: pause, fall, win, chambers, restart', () => {
  assert.equal(kinds(transition(playing, { type: 'pause' })), 'paused');
  assert.equal(kinds(transition(playing, { type: 'controlLost' })), 'paused');
  assert.equal(kinds(transition(playing, { type: 'fell' })), 'falling');
  assert.equal(kinds(transition(playing, { type: 'win' })), 'won');
  assert.equal(kinds(transition(playing, { type: 'openChambers' })), 'chamberSelect');
  assert.equal(kinds(transition(playing, { type: 'restart' })), 'playing');
  assert.equal(kinds(transition(playing, { type: 'locked' })), 'playing');
  for (const type of ['begin', 'resume', 'recovered', 'respawn', 'advance'] as const) {
    assert.equal(transition(playing, { type }), null, type);
  }
});

test('control lost before play has begun goes back to the title', () => {
  // Picked a chamber from the title with a mouse, then the lock was refused.
  const picked = run({ type: 'openChambers' }, { type: 'pick', immediate: false });
  assert.equal(picked.kind, 'playing');
  assert.equal(picked.begun, false);
  assert.equal(kinds(transition(picked, { type: 'controlLost' })), 'title');
  assert.equal(escapePauses(picked), false);
  assert.equal(transition(picked, { type: 'locked' })?.begun, true);
});

test('falling: recovered and respawn return to play; pause, restart, win keep working', () => {
  assert.equal(kinds(transition(falling, { type: 'recovered' })), 'playing');
  assert.equal(kinds(transition(falling, { type: 'respawn' })), 'playing');
  assert.equal(kinds(transition(falling, { type: 'restart' })), 'playing');
  assert.equal(kinds(transition(falling, { type: 'pause' })), 'paused');
  assert.equal(kinds(transition(falling, { type: 'openChambers' })), 'chamberSelect');
  assert.equal(transition(falling, { type: 'fell' }), null);
});

test('pause returns to what it interrupted, including a fall in progress', () => {
  assert.equal(kinds(transition(paused, { type: 'resume' })), 'playing');
  assert.equal(kinds(transition(paused, { type: 'locked' })), 'playing');
  const pausedFall = transition(falling, { type: 'pause' }) as State;
  assert.equal(kinds(transition(pausedFall, { type: 'resume' })), 'falling');
  // Restarting from the menu clears the fall.
  const restarted = transition(pausedFall, { type: 'restart' }) as State;
  assert.equal(restarted.kind, 'paused');
  assert.equal(kinds(transition(restarted, { type: 'resume' })), 'playing');
  assert.equal(kinds(transition(paused, { type: 'openChambers' })), 'chamberSelect');
  for (const type of ['pause', 'controlLost', 'begin', 'fell', 'win', 'advance'] as const) {
    assert.equal(transition(paused, { type }), null, type);
  }
});

test('chamber select returns to where it was opened', () => {
  // From the title: back to the title, or straight to play where there is no lock to wait for.
  assert.equal(kinds(transition(titleSelect, { type: 'closeChambers', resume: false })), 'title');
  assert.equal(kinds(transition(titleSelect, { type: 'closeChambers', resume: true })), 'playing');
  // From play: the pause menu, or back to play with touch/gamepad.
  assert.equal(kinds(transition(select, { type: 'closeChambers', resume: false })), 'paused');
  assert.equal(kinds(transition(select, { type: 'closeChambers', resume: true })), 'playing');
  const fallSelect = transition(falling, { type: 'openChambers' }) as State;
  assert.equal(kinds(transition(fallSelect, { type: 'closeChambers', resume: true })), 'falling');
  // From the pause menu: back to the pause menu, whatever the device.
  const pauseSelect = transition(paused, { type: 'openChambers' }) as State;
  assert.equal(kinds(transition(pauseSelect, { type: 'closeChambers', resume: false })), 'paused');
  assert.equal(kinds(transition(pauseSelect, { type: 'closeChambers', resume: true })), 'paused');
  // From the win screen: still won.
  const wonSelect = transition(won, { type: 'openChambers' }) as State;
  assert.equal(kinds(transition(wonSelect, { type: 'closeChambers', resume: true })), 'won');
  assert.equal(transition(select, { type: 'openChambers' }), null);
});

test('picking a chamber starts play from any way into the select', () => {
  for (const s of [select, titleSelect, transition(paused, { type: 'openChambers' }), transition(won, { type: 'openChambers' })]) {
    assert.equal(kinds(transition(s as State, { type: 'pick', immediate: true })), 'playing');
    assert.equal(transition(s as State, { type: 'pick', immediate: true })?.begun, true);
  }
  assert.equal(transition(titleSelect, { type: 'pick', immediate: false })?.begun, false);
  assert.equal(transition(select, { type: 'pick', immediate: false })?.begun, true);
});

test('won: only advance and chambers apply; advance returns to play', () => {
  assert.equal(kinds(transition(won, { type: 'advance' })), 'playing');
  assert.equal(kinds(transition(won, { type: 'openChambers' })), 'chamberSelect');
  for (const type of ['pause', 'controlLost', 'restart', 'win', 'fell', 'begin', 'resume'] as const) {
    assert.equal(transition(won, { type }), null, type);
  }
});

test('restart: allowed on the title and in play, not on the win screen or the select', () => {
  assert.equal(transition(INITIAL_STATE, { type: 'restart' }), INITIAL_STATE);
  assert.equal(transition(won, { type: 'restart' }), null);
  assert.equal(transition(select, { type: 'restart' }), null);
});

test('a keyboard player can win from the title (they can move there) and advance back to it', () => {
  const w = transition(INITIAL_STATE, { type: 'win' }) as State;
  assert.equal(w.kind, 'won');
  assert.equal(viewOf(w).title, true);
  assert.equal(kinds(transition(w, { type: 'advance' })), 'title');
  assert.equal(kinds(transition(w, { type: 'locked' })), 'won');
});

test('derived queries', () => {
  const all: [string, State][] = [
    ['title', INITIAL_STATE], ['playing', playing], ['falling', falling],
    ['paused', paused], ['chamberSelect', select], ['won', won],
  ];
  const sim = (d: string) => all.filter(([, s]) => simulates(s, d)).map(([n]) => n);
  assert.deepEqual(sim('keyboard'), ['title', 'playing', 'falling']);
  assert.deepEqual(sim('touch'), ['playing', 'falling']);
  assert.deepEqual(sim('gamepad'), ['playing', 'falling']);
  assert.equal(isFrozen(won, 'keyboard'), false); // the backdrop keeps moving behind the win screen
  assert.equal(isFrozen(paused, 'keyboard'), true);
  assert.deepEqual(all.filter(([, s]) => showsTouchControls(s)).map(([n]) => n), ['playing', 'falling']);
  assert.deepEqual(all.filter(([, s]) => escapePauses(s)).map(([n]) => n), ['playing', 'falling']);
});

test('views: which overlays are up', () => {
  const only = (s: State) => Object.entries(viewOf(s)).filter(([, v]) => v).map(([k]) => k);
  assert.deepEqual(only(INITIAL_STATE), ['title']);
  assert.deepEqual(only(playing), []);
  assert.deepEqual(only(falling), []);
  assert.deepEqual(only(paused), ['pause']);
  assert.deepEqual(only(titleSelect), ['select']);
  assert.deepEqual(only(won), ['win']);
  assert.deepEqual(only(transition(won, { type: 'openChambers' }) as State), ['select', 'win']);
});

test('GameState holds the state and reports accepted changes only', () => {
  const g = new GameState();
  const seen: [Kind, Kind, string][] = [];
  g.onChange = (prev, next, e) => seen.push([prev.kind, next.kind, e.type]);
  assert.equal(g.send({ type: 'pause' }), false);
  assert.equal(g.send({ type: 'begin' }), true);
  assert.equal(g.send({ type: 'pause' }), true);
  assert.equal(g.kind, 'paused');
  assert.deepEqual(seen, [['title', 'playing', 'begin'], ['playing', 'paused', 'pause']]);
});
