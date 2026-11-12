import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GamepadInput, LOOK_SPEED } from '../src/input/GamepadInput.ts';
import type { PadLike } from '../src/input/GamepadInput.ts';
import { InputManager } from '../src/input/InputManager.ts';
import {
  emptyFrame,
  frameHasInput,
  lookStick,
  mergeFrames,
  radialDeadzone,
  stickVector,
} from '../src/input/InputSource.ts';
import type { InputDevice, InputFrame, InputSource } from '../src/input/InputSource.ts';

test('mergeFrames of nothing is an empty frame', () => {
  assert.deepEqual(mergeFrames([]), emptyFrame());
});

test('mergeFrames sums look and ORs buttons', () => {
  const a = { ...emptyFrame(), lookX: 0.1, lookY: -0.2, jump: true };
  const b = { ...emptyFrame(), lookX: 0.3, lookY: 0.1, sprint: true, interact: true };
  const m = mergeFrames([a, b]);
  assert.ok(Math.abs(m.lookX - 0.4) < 1e-9);
  assert.ok(Math.abs(m.lookY + 0.1) < 1e-9);
  assert.ok(m.jump && m.sprint && m.interact);
});

test('mergeFrames clamps combined movement to unit length', () => {
  const m = mergeFrames([
    { ...emptyFrame(), moveZ: 1 },
    { ...emptyFrame(), moveX: 1 },
  ]);
  assert.ok(Math.abs(Math.hypot(m.moveX, m.moveZ) - 1) < 1e-9);
  const small = mergeFrames([
    { ...emptyFrame(), moveX: 0.3 },
    { ...emptyFrame(), moveZ: 0.2 },
  ]);
  assert.equal(small.moveX, 0.3);
  assert.equal(small.moveZ, 0.2);
});

test('stickVector applies a radial deadzone', () => {
  assert.deepEqual(stickVector(3, 3, 60, 0.2), { x: 0, y: 0 });
  assert.deepEqual(stickVector(0, 0, 60, 0.2), { x: 0, y: 0 });
});

test('stickVector points the right way with y up-positive', () => {
  const up = stickVector(0, -60, 60, 0.1);
  assert.ok(Math.abs(up.x) < 1e-9 && Math.abs(up.y - 1) < 1e-9);
  const right = stickVector(60, 0, 60, 0.1);
  assert.ok(Math.abs(right.x - 1) < 1e-9 && Math.abs(right.y) < 1e-9);
  assert.ok(stickVector(0, 40, 60, 0.1).y < 0);
});

test('stickVector clamps to unit length and rescales past the deadzone', () => {
  const far = stickVector(300, 400, 60, 0.2);
  assert.ok(Math.abs(Math.hypot(far.x, far.y) - 1) < 1e-9);
  // Halfway between the deadzone edge (0.2) and full (1.0) is 0.6 of the radius.
  const mid = stickVector(36, 0, 60, 0.2);
  assert.ok(Math.abs(mid.x - 0.5) < 1e-9);
});

test('mergeFrames ORs restart, undo and pause', () => {
  const m = mergeFrames([
    { ...emptyFrame(), restart: true },
    { ...emptyFrame(), pause: true },
  ]);
  assert.ok(m.restart && m.pause && !m.undo);
  assert.ok(mergeFrames([emptyFrame(), { ...emptyFrame(), undo: true }]).undo);
});

test('radialDeadzone zeroes small input and rescales the rest', () => {
  assert.deepEqual(radialDeadzone(0.1, 0.1, 0.15), { x: 0, y: 0 });
  const full = radialDeadzone(1, 1, 0.15);
  assert.ok(Math.abs(Math.hypot(full.x, full.y) - 1) < 1e-9);
  const mid = radialDeadzone(0.575, 0, 0.15);
  assert.ok(Math.abs(mid.x - 0.5) < 1e-9 && mid.y === 0);
});

test('lookStick curves the response and keeps direction', () => {
  const v = lookStick(0.575, 0, 0.15);
  assert.ok(Math.abs(v.x - 0.25) < 1e-9);
  const d = lookStick(-0.5, 0.5, 0.15);
  assert.ok(d.x < 0 && d.y > 0 && Math.abs(d.x + d.y) < 1e-9);
  assert.deepEqual(lookStick(0.05, 0, 0.15), { x: 0, y: 0 });
});

/** A source that returns scripted frames, one per read; empty once the script runs out. */
function fake(device: InputDevice, ...script: Array<Partial<InputFrame>>): InputSource {
  const queue = [...script];
  return { device, read: () => ({ ...emptyFrame(), ...queue.shift() }), dispose() {} };
}

test('InputManager merges sources and clamps movement', () => {
  const m = new InputManager([fake('keyboard', { moveZ: 1 }), fake('gamepad', { moveX: 1 })]);
  const f = m.read(0.016);
  assert.ok(Math.abs(Math.hypot(f.moveX, f.moveZ) - 1) < 1e-9);
});

test('InputManager edge buttons fire once per press across reads', () => {
  // Edge semantics live in the sources; the manager must not repeat or latch them.
  const m = new InputManager([fake('keyboard', { jump: true })]);
  assert.equal(m.read(0.016).jump, true);
  assert.equal(m.read(0.016).jump, false);
});

test('InputManager tracks the last-used device', () => {
  const seen: InputDevice[] = [];
  const m = new InputManager([
    fake('keyboard', {}, {}, { moveX: 1 }, { moveX: 1 }),
    fake('gamepad', {}, { jump: true }, { jump: true }, {}),
  ]);
  m.onDeviceChange = (d) => seen.push(d);
  m.read(0); // nothing
  assert.equal(m.lastDevice, 'keyboard');
  m.read(0); // gamepad used
  assert.equal(m.lastDevice, 'gamepad');
  m.read(0); // both active: current device stays
  assert.equal(m.lastDevice, 'gamepad');
  m.read(0); // keyboard only
  assert.equal(m.lastDevice, 'keyboard');
  assert.deepEqual(seen, ['gamepad', 'keyboard']);
});

test('sprint alone does not count as device use', () => {
  assert.equal(frameHasInput({ ...emptyFrame(), sprint: true }), false);
  assert.equal(frameHasInput({ ...emptyFrame(), lookX: 0.01 }), true);
  assert.equal(frameHasInput({ ...emptyFrame(), undo: true }), true);
  const m = new InputManager([fake('touch', { sprint: true })]);
  m.read(0);
  assert.equal(m.lastDevice, 'keyboard');
});

test('InputManager.drain consumes without changing the device', () => {
  const m = new InputManager([fake('gamepad', { jump: true }, {})]);
  m.drain();
  assert.equal(m.lastDevice, 'keyboard');
  assert.equal(m.read(0).jump, false);
});

function pad(axes: number[], pressed: number[] = [], triggers: Record<number, number> = {}): PadLike {
  const buttons = Array.from({ length: 17 }, (_, i) => ({ pressed: pressed.includes(i), value: triggers[i] ?? 0 }));
  return { index: 0, axes, buttons };
}

test('GamepadInput maps sticks with deadzone, y flipped for forward', () => {
  let p = pad([0.1, -0.1, 0.1, 0.1]);
  const g = new GamepadInput(() => [p]);
  assert.deepEqual([g.read(0.1).moveX, g.read(0.1).moveZ], [0, 0]);
  p = pad([0, -1, 1, 0]);
  const f = g.read(0.1);
  assert.ok(Math.abs(f.moveZ - 1) < 1e-9);
  assert.ok(Math.abs(f.lookX - LOOK_SPEED * 0.1) < 1e-9);
  p = pad([0, 0, 0, 1]);
  assert.ok(g.read(0.1).lookY > 0);
  g.invertY = true;
  assert.ok(g.read(0.1).lookY < 0);
});

test('GamepadInput buttons are edge-triggered, sprint is held', () => {
  let p = pad([0, 0, 0, 0]);
  const g = new GamepadInput(() => [p]);
  g.read(0.016);
  p = pad([0, 0, 0, 0], [0, 2, 3, 9, 10]);
  const f = g.read(0.016);
  assert.ok(f.jump && f.interact && f.restart && f.pause && f.sprint);
  assert.ok(g.menu.confirm);
  const again = g.read(0.016);
  assert.ok(!again.jump && !again.interact && !again.restart && !again.pause && again.sprint);
  p = pad([0, 0, 0, 0], [], { 6: 0.8 });
  assert.ok(g.read(0.016).sprint);
});

test('GamepadInput reads B as undo, edge-triggered, and still reports it as back in menus', () => {
  let p = pad([0, 0, 0, 0]);
  const g = new GamepadInput(() => [p]);
  g.read(0.016);
  p = pad([0, 0, 0, 0], [1]);
  const f = g.read(0.016);
  assert.ok(f.undo);
  assert.ok(g.menu.back);
  assert.ok(!g.read(0.016).undo, 'held B is not a second press');
});

test('GamepadInput ignores buttons already held when a pad appears, and survives pads vanishing', () => {
  let pads: Array<PadLike | null> = [];
  const g = new GamepadInput(() => pads);
  assert.equal(g.read(0.016).jump, false);
  pads = [pad([0, 0, 0, 0], [0])];
  assert.equal(g.read(0.016).jump, false);
  pads = [null];
  g.read(0.016);
  pads = [pad([0, 0, 0, 0], [0])];
  assert.equal(g.read(0.016).jump, false);
  assert.equal(new GamepadInput(() => []).read(0.016).jump, false);
});

test('GamepadInput menu edges: D-pad, stick and back/select', () => {
  let p = pad([0, 0, 0, 0]);
  const g = new GamepadInput(() => [p]);
  g.read(0.016);
  p = pad([0, 0.9, 0, 0], [12, 1, 8]);
  const f = g.read(0.016);
  assert.ok(g.menu.up && g.menu.down && g.menu.back && g.menu.select);
  assert.ok(f.activity);
  g.read(0.016);
  assert.ok(!g.menu.up && !g.menu.down && !g.menu.back && !g.menu.select);
});

test('InputManager invertY flips look once for every device', () => {
  const m = new InputManager([
    fake('keyboard', { lookY: 0.2 }, { lookY: 0.2 }),
    fake('gamepad', { lookY: 0.1 }, { lookY: 0.1 }),
  ]);
  assert.ok(Math.abs(m.read(0.016).lookY - 0.3) < 1e-9);
  m.invertY = true;
  assert.ok(Math.abs(m.read(0.016).lookY + 0.3) < 1e-9);
});

test('GamepadInput lookScale multiplies look speed and menu reports left/right', () => {
  let p = pad([0, 0, 1, 0]);
  const g = new GamepadInput(() => [p]);
  g.read(0.1);
  g.lookScale = 2;
  assert.ok(Math.abs(g.read(0.1).lookX - LOOK_SPEED * 0.2) < 1e-9);
  p = pad([0, 0, 0, 0], [14]);
  g.read(0.016);
  assert.ok(g.menu.left && !g.menu.right);
  p = pad([0.9, 0, 0, 0]);
  g.read(0.016);
  assert.ok(g.menu.right);
});
