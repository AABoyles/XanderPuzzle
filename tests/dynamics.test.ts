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

test('predict returns where a crate actually comes to rest, and does not move the real crates', () => {
  const dyn = new LevelDynamics(room());
  const crate = new Crate(scene, V(-2, 4, 1), 1.5);
  const other = new Crate(scene, V(1, 6, -1), 1.5);
  dyn.crates.push(crate, other);
  try {
    const before = JSON.stringify(dyn.snapshot());
    const predicted = dyn.predict(DOWN, FAR);
    assert.equal(JSON.stringify(dyn.snapshot()), before, 'predict moved the real crates');

    // Stepping the real crates for several seconds reaches the same resting places.
    run(dyn, DOWN, 6);
    assert.equal(predicted.length, 2);
    predicted.forEach((p, i) => {
      dyn.crates[i].body.center.forEach((c, a) => assert.ok(Math.abs(p[a] - c) < 1e-3, `crate ${i} axis ${a}`));
    });
  } finally {
    dyn.dispose();
  }
});

test('predict skips a lost crate and reports its current centre', () => {
  const dyn = new LevelDynamics(room());
  const lost = new Crate(scene, V(0, 0.75, 0), 1.5);
  const live = new Crate(scene, V(3, 5, 0), 1.5);
  dyn.crates.push(lost, live);
  try {
    lost.lost = true;
    const predicted = dyn.predict(V(22, 0, 0), FAR);
    assert.deepEqual(predicted[0], [0, 0.75, 0], 'a lost crate stays where it is');
    assert.ok(Math.abs(predicted[1][0] - 3) > 1, 'the live crate moves under sideways gravity');
  } finally {
    dyn.dispose();
  }
});

test('showPreview shows a ghost only where a crate would move, and dispose() releases the ghosts', () => {
  // Babylon makes its shared edge and default materials on first use. Warm them up so the baseline excludes them.
  const warm = new LevelDynamics(room());
  warm.crates.push(new Crate(scene, V(0, 5, 0), 1.5));
  warm.showPreview([[0, 0.75, 0]]);
  warm.dispose();
  const materials = scene.materials.length;
  const dyn = new LevelDynamics(room());
  const crate = new Crate(scene, V(0, 5, 0), 1.5);
  dyn.crates.push(crate);
  try {
    dyn.showPreview([[0, 0.75, 0]]);
    const ghost = scene.meshes.find((m) => m.name === 'crateGhost');
    if (!ghost) assert.fail('the preview makes a crate ghost');
    assert.ok(ghost.isEnabled(), 'a ghost shows where the crate will land');
    assert.ok(!ghost.isPickable && !ghost.checkCollisions);
    dyn.showPreview([[0, 5, 0]]);
    assert.ok(!ghost.isEnabled(), 'no ghost where the crate would not move');
    dyn.showPreview(null);
    assert.ok(!ghost.isEnabled());
  } finally {
    dyn.dispose();
  }
  assert.equal(scene.meshes.filter((m) => m.name === 'crateGhost').length, 0);
  assert.equal(scene.materials.length, materials, 'the ghost material and the crate material are both released');
});

test('restore puts a crate back where it was, and a crate lost since is shown and simulated again', () => {
  const dyn = new LevelDynamics(room());
  const crate = new Crate(scene, V(0, 0.75, 0), 1.5);
  dyn.crates.push(crate);
  const plate = new PressurePlate(scene, V(0, 0, 0), V(0, 1, 0), 2.5, true);
  dyn.plates.push(plate);
  try {
    run(dyn, DOWN, 1);
    const center = [...crate.body.center];
    const saved = dyn.snapshot();
    // Sideways gravity slides it out through the open edge: it is lost.
    assert.equal(run(dyn, V(22, 0, 0), 5), 1);
    assert.ok(crate.lost && !crate.mesh.isEnabled());
    dyn.restore(saved);
    assert.ok(!crate.lost, 'the crate is no longer lost');
    assert.ok(crate.mesh.isEnabled() && crate.mesh.checkCollisions);
    assert.deepEqual(crate.body.center, center);
    assert.deepEqual(crate.body.velocity, [0, 0, 0]);
    assert.equal(crate.mesh.position.x, center[0]);
    assert.ok(plate.pressed, 'the plate state comes back with the crate');

    // A crate that is moving when saved: its velocity comes back too.
    crate.body.velocity = [1, 2, 3];
    const moving = dyn.snapshot();
    crate.body.velocity = [0, 0, 0];
    dyn.restore(moving);
    assert.deepEqual(crate.body.velocity, [1, 2, 3]);
  } finally {
    dyn.dispose();
  }
});
