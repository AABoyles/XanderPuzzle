// Crates, plates and doors under Babylon's NullEngine: the rules chambers rely on that boxPhysics alone cannot show
// (a crate lost through a hole, an inverted plate). Whole-chamber routes are in crateRoutes.test.ts.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { setupHeadless } from './helpers/headless.ts';
import type { Aabb } from '../src/physics/boxPhysics.ts';

setupHeadless();
const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
const { Scene } = await import('@babylonjs/core/scene');
const { Vector3 } = await import('@babylonjs/core/Maths/math.vector');
await import('../src/babylonSideEffects.ts');
const { Crate, CRATE_LOST_MARGIN, Door, LevelDynamics, PressurePlate } = await import('../src/level/Dynamics.ts');

const scene = new Scene(new NullEngine());
const V = (x: number, y: number, z: number) => new Vector3(x, y, z);
const DOWN = V(0, -22, 0);
const FAR = V(100, 100, 100); // the player, out of everything's way

/** A 10x10 floor slab with its top at y = 0, and a wall that sets the level's bounds up to y = 10. */
const room = (): Aabb[] => [
  { min: [-5, -1, -5], max: [5, 0, 5] },
  { min: [-6, -1, -5], max: [-5, 10, 5] },
];

function run(dyn: InstanceType<typeof LevelDynamics>, gravity: InstanceType<typeof Vector3>, seconds: number) {
  let lost = 0;
  for (let i = 0; i < seconds * 60; i++) if (dyn.update(1 / 60, gravity, FAR).crateLost) lost++;
  return lost;
}

test('a crate that falls out of the level is lost once, hidden, and stops pressing and blocking', () => {
  const dyn = new LevelDynamics(room());
  const crate = new Crate(scene, V(0, 0.75, 0), 1.5);
  dyn.crates.push(crate);
  const plate = new PressurePlate(scene, V(0, 0, 0), V(0, 1, 0), 2.5, true);
  dyn.plates.push(plate);
  try {
    assert.equal(run(dyn, DOWN, 1), 0);
    assert.ok(plate.pressed && !crate.lost);
    // Sideways gravity slides it off the open edge of the floor and away.
    assert.equal(run(dyn, V(22, 0, 0), 5), 1, 'crateLost fires exactly once');
    assert.ok(crate.lost);
    assert.ok(!crate.mesh.isEnabled() && !crate.mesh.checkCollisions);
    assert.ok(crate.body.center[0] - 5 > CRATE_LOST_MARGIN);
    assert.ok(!plate.pressed);
    const at = [...crate.body.center];
    run(dyn, DOWN, 1);
    assert.deepEqual(crate.body.center, at, 'a lost crate is no longer simulated');
  } finally {
    dyn.dispose();
  }
});

test('a crate resting inside the level is never lost', () => {
  const dyn = new LevelDynamics(room());
  const crate = new Crate(scene, V(0, 5, 0), 1.5);
  dyn.crates.push(crate);
  try {
    assert.equal(run(dyn, DOWN, 3), 0);
    assert.ok(Math.abs(crate.body.center[1] - 0.75) < 1e-3);
  } finally {
    dyn.dispose();
  }
});

test('an inverted plate is satisfied while clear, and a door needs every plate satisfied', () => {
  const dyn = new LevelDynamics(room());
  const crate = new Crate(scene, V(2, 0.75, 0), 1.5);
  dyn.crates.push(crate);
  const normal = new PressurePlate(scene, V(2, 0, 0), V(0, 1, 0), 2, true);
  const inverted = new PressurePlate(scene, V(-2, 0, 0), V(0, 1, 0), 2, true, true);
  dyn.plates.push(normal, inverted);
  const door = new Door(scene, V(-1, 0, 4), V(1, 3, 5), [normal, inverted]);
  dyn.doors.push(door);
  try {
    run(dyn, DOWN, 1);
    assert.ok(normal.satisfied && inverted.satisfied && !inverted.pressed);
    assert.ok(door.isOpen, 'one plate pressed, the inverted one clear');
    // Slide the crate west onto the inverted plate (the wall at x = -5 stops it at -4.25, inside the trigger).
    crate.body.center[0] = -2;
    run(dyn, DOWN, 1);
    assert.ok(inverted.pressed && !inverted.satisfied && !normal.satisfied);
    assert.ok(!door.isOpen);
  } finally {
    dyn.dispose();
  }
});
