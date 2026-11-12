import assert from 'node:assert/strict';
import { test } from 'node:test';
import { COYOTE_TIME, JUMP_BUFFER, JumpAssist } from '../src/player/jumpAssist.ts';

const DT = 1 / 60;
const frames = (seconds: number) => Math.round(seconds / DT);

test('jumps when grounded and pressed', () => {
  const j = new JumpAssist();
  assert.equal(j.step(DT, true, true, false), true);
});

test('does not jump without a press', () => {
  const j = new JumpAssist();
  assert.equal(j.step(DT, true, false, false), false);
});

test('jumps within coyote time after walking off a ledge', () => {
  const j = new JumpAssist();
  j.step(DT, true, false, false); // last frame on the ground
  for (let i = 0; i < frames(COYOTE_TIME / 2); i++) j.step(DT, false, false, false);
  assert.equal(j.step(DT, false, true, false), true);
});

test('no jump after coyote time expires', () => {
  const j = new JumpAssist();
  j.step(DT, true, false, false);
  for (let i = 0; i < frames(COYOTE_TIME) + 2; i++) j.step(DT, false, false, false);
  assert.equal(j.step(DT, false, true, false), false);
});

test('a press made just before landing fires on landing', () => {
  const j = new JumpAssist();
  j.step(DT, false, true, false); // press while airborne
  for (let i = 0; i < frames(JUMP_BUFFER / 2); i++) j.step(DT, false, false, false);
  assert.equal(j.step(DT, true, false, false), true);
});

test('an expired buffered press does not fire on landing', () => {
  const j = new JumpAssist();
  j.step(DT, false, true, false);
  for (let i = 0; i < frames(JUMP_BUFFER) + 2; i++) j.step(DT, false, false, false);
  assert.equal(j.step(DT, true, false, false), false);
});

test('one press never yields two jumps', () => {
  const j = new JumpAssist();
  assert.equal(j.step(DT, true, true, false), true);
  // Still on the ground next frame with the press released; the caller has started the upward motion.
  assert.equal(j.step(DT, true, false, true), false);
  // Keep standing on the ground with no new press: nothing fires.
  for (let i = 0; i < frames(0.5); i++) assert.equal(j.step(DT, true, false, false), false);
});

test('a press held in the air does not jump (no double jump)', () => {
  const j = new JumpAssist();
  assert.equal(j.step(DT, true, true, false), true);
  for (let i = 0; i < frames(0.3); i++) assert.equal(j.step(DT, false, true, true), false);
});

test('no coyote refresh while rising', () => {
  const j = new JumpAssist();
  // Rising while still grounded (the first frames of a jump) must not refresh coyote time.
  for (let i = 0; i < 5; i++) j.step(DT, true, false, true);
  for (let i = 0; i < frames(COYOTE_TIME) + 2; i++) j.step(DT, false, false, false);
  assert.equal(j.step(DT, false, true, false), false);
});

test('reset clears a buffered press and coyote time', () => {
  const j = new JumpAssist();
  j.step(DT, true, false, false);
  j.step(DT, false, true, false);
  j.reset();
  assert.equal(j.step(DT, false, false, false), false);
});
