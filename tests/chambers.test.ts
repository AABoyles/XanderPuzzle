// Builds every chamber headlessly (Babylon NullEngine, no browser) and checks structural invariants: valid axes,
// spawn and exit placement, a lever route from entrance to exit, crates, plates and doors, and that dispose() cleans up.
// It does NOT prove a chamber can be completed (reach, jumps, timing); that is the Playwright smoke test or a playtest.
import assert from 'node:assert/strict';
import { before, describe, test } from 'node:test';
import { setupHeadless } from './helpers/headless.ts';
import { bodyAabb, overlaps, sweep } from '../src/physics/boxPhysics.ts';
import type { Aabb } from '../src/physics/boxPhysics.ts';
import { AXES, axisVec } from '../src/gravity/axes.ts';
import { placardCorners } from '../src/level/placardText.ts';
import { darkFraction } from '../src/narrative.ts';
import { MORE_HINTS } from '../src/hints.ts';
import type { GravityAxis } from '../src/gravity/axes.ts';
import { leversExhausted, reachableAxes } from '../src/game/stuck.ts';
import type { LeverMoves } from '../src/game/stuck.ts';
import type { GravitySwitch } from '../src/level/GravitySwitch.ts';

setupHeadless();
// Dynamic imports: they must run after the hooks are registered.
const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
const { Scene } = await import('@babylonjs/core/scene');
const { GlowLayer } = await import('@babylonjs/core/Layers/glowLayer');
await import('../src/babylonSideEffects.ts');
const { createSkin } = await import('../src/skins/Skin.ts');
const { CHAMBERS: CATALOG } = await import('../src/level/chambers/index.ts');
// Chambers load lazily in the game; the tests fetch every module up front and build from them directly.
const CHAMBERS = await Promise.all(CATALOG.map(async (c) => ({ ...c, build: (await c.load()).default })));
const { buildLockout } = await import('../src/level/chambers/lockout.ts');

/** Matches PlayerController's collider radius. */
const PLAYER_RADIUS = 0.5;
const playerBox = (c: readonly number[]): Aabb => ({
  min: [c[0] - PLAYER_RADIUS, c[1] - PLAYER_RADIUS, c[2] - PLAYER_RADIUS],
  max: [c[0] + PLAYER_RADIUS, c[1] + PLAYER_RADIUS, c[2] + PLAYER_RADIUS],
});
const inside = (b: Aabb, p: readonly number[]) => [0, 1, 2].every((i) => p[i] >= b.min[i] && p[i] <= b.max[i]);

/** A built lever as the stuck check sees it. */
const leverMoves = (sw: GravitySwitch): LeverMoves => ({
  targetFor: (a) => sw.targetFor(a),
  cycle: sw.spec.kind === 'sequence' ? sw.spec.sequencer.axes : undefined,
});

const engine = new NullEngine();
const scene = new Scene(engine);
const skin = createSkin('axis', scene, new GlowLayer('glow', scene));

const counts = () => ({
  meshes: scene.meshes.length,
  materials: scene.materials.length,
  multiMaterials: scene.multiMaterials.length,
  textures: scene.textures.length,
  transformNodes: scene.transformNodes.length,
  lights: scene.lights.length,
  beforeRender: scene.onBeforeRenderObservable.observers.length,
  afterRender: scene.onAfterRenderObservable.observers.length,
});

// Skins create their materials lazily and keep them for the life of the skin, so build and dispose every chamber once
// to populate that cache. The leak checks below then compare against a baseline that includes it.
before(() => {
  for (const c of CHAMBERS) c.build(scene, skin).dispose();
});

test('chamber ids and names are unique', () => {
  assert.equal(new Set(CHAMBERS.map((c) => c.id)).size, CHAMBERS.length);
  assert.equal(new Set(CHAMBERS.map((c) => c.name)).size, CHAMBERS.length);
});

test('every chamber has its two extra hints in MORE_HINTS, and there are no others', () => {
  assert.deepEqual(Object.keys(MORE_HINTS).sort(), CHAMBERS.map((c) => c.id).sort());
});

test('par: every non-timed chamber has an integer par of at least 1, and timed chambers have none', () => {
  for (const chamber of CHAMBERS) {
    const level = chamber.build(scene, skin);
    try {
      const timed = level.switches.some((sw) => sw.spec.kind === 'sequence');
      if (timed) assert.equal(chamber.par, undefined, `${chamber.name} is timed, so it has no par`);
      else {
        assert.ok(Number.isInteger(chamber.par) && (chamber.par ?? 0) >= 1, `${chamber.name} has par ${chamber.par}`);
      }
    } finally {
      level.dispose();
    }
  }
});

for (const [index, chamber] of CHAMBERS.entries()) {
  describe(`${chamber.name}`, () => {
    test('structure', () => {
      const level = chamber.build(scene, skin);
      try {
        const { bounds, solids, dynamics } = level;
        // CHAMBERS[i].name must match the name passed to finish() (main.ts used to warn about this in dev only).
        assert.equal(level.name, chamber.name, `CHAMBERS[${index}].name does not match the chamber's own name`);
        assert.ok(level.hint.length > 0, 'hint is empty');
        assert.ok(solids.length > 0, 'no solid geometry');

        // Axes.
        assert.ok(AXES.includes(level.entranceAxis), `bad entranceAxis ${level.entranceAxis}`);
        assert.ok(AXES.includes(level.exitAxis), `bad exitAxis ${level.exitAxis}`);
        for (const sw of level.switches) {
          if (sw.spec.kind === 'fixed') assert.ok(AXES.includes(sw.spec.target), `bad lever target ${sw.spec.target}`);
          if (sw.spec.kind === 'sequence') sw.spec.sequencer.axes.forEach((a) => assert.ok(AXES.includes(a)));
        }

        // Spawn: inside the level, not in a wall, with floor under the entrance axis.
        const spawn = level.spawnPosition.asArray();
        assert.ok(inside(bounds, spawn), `spawn ${spawn} is outside bounds`);
        const spawnBox = playerBox(spawn);
        const hit = solids.find((s) => overlaps(spawnBox, s));
        assert.equal(hit, undefined, `spawn ${spawn} is inside solid ${JSON.stringify(hit)}`);
        const down = axisVec(level.entranceAxis);
        const drop = sweep(spawnBox, [down[0] * 1, down[1] * 1, down[2] * 1], solids);
        assert.ok(drop.hit.some(Boolean), `nothing within 1 unit below spawn under gravity ${level.entranceAxis}`);

        // Exit.
        const exit = level.exitCenter.asArray();
        assert.ok(inside(bounds, exit), `exitCenter ${exit} is outside bounds`);
        assert.ok(level.exitRadius > 0);
        if (level.ending) {
          // An ending chamber's exit is a hole on its boundary, open to space along the exit gravity.
          const g = axisVec(level.exitAxis);
          const k = g.findIndex((c) => c !== 0);
          const edge = g[k] > 0 ? bounds.max[k] : bounds.min[k];
          assert.ok(Math.abs(exit[k] - edge) < 1e-6, `ending exit ${exit} is not on the ${level.exitAxis} side`);
          for (let d = -3; d <= 20; d += 0.5) {
            const p = exit.map((v, i) => v + g[i] * d);
            assert.ok(!solids.some((s) => inside(s, p)), `ending exit is blocked at ${p}`);
          }
        }

        // The reclaimer: every chamber but an ending one is won on its plate, so there must be one, inside the level,
        // on a floor under the exit gravity, with room for the player to stand on it.
        if (level.ending) assert.equal(level.reclaimer, undefined, 'an ending chamber has no reclaimer');
        else {
          const rec = level.reclaimer;
          assert.ok(rec, 'no reclaimer: nothing within reach under exitCenter along exitAxis');
          assert.ok(inside(bounds, rec.bed), `reclaimer bed ${rec.bed} is outside bounds`);
          const standBox = playerBox(rec.stand);
          const blocked = solids.find((s) => overlaps(standBox, s));
          assert.equal(blocked, undefined, `the reclaimer's plate at ${rec.bed} has no room to stand on it`);
          assert.ok(overlaps(standBox, rec.trigger), 'standing on the plate does not press it');
          const g = axisVec(level.exitAxis);
          const rest = sweep(standBox, [g[0], g[1], g[2]], solids);
          assert.ok(rest.hit.some(Boolean), 'the reclaimer bed is not a floor under exitAxis');
        }

        // Levers: every one must be usable from some axis the player can reach, and the exit axis must be reachable.
        const reachable = reachableAxes(level.entranceAxis, level.switches.map(leverMoves));
        assert.ok(reachable.has(level.exitAxis), `exitAxis ${level.exitAxis} is unreachable from ${level.entranceAxis}`);
        level.switches.forEach((sw, i) => {
          const usable = sw.spec.kind === 'sequence' || [...reachable].some((a) => sw.canUse(a));
          assert.ok(usable, `lever ${i} (${JSON.stringify(sw.spec.kind)}) can never change gravity from a reachable axis`);
          const t = sw.targetAxis;
          if (t) assert.ok([...reachable].some((a) => a[1] !== t[1]), `lever ${i} targets ${t}, which is never different`);
        });

        // Crates, plates, doors.
        dynamics.crates.forEach((c, i) => {
          const box = bodyAabb(c.body);
          assert.equal(solids.find((s) => overlaps(box, s)), undefined, `crate ${i} starts inside a solid`);
          dynamics.crates.forEach((o, j) => {
            if (j > i) assert.ok(!overlaps(box, bodyAabb(o.body)), `crates ${i} and ${j} overlap`);
          });
        });
        dynamics.doors.forEach((d, i) => {
          assert.ok(d.plates.length > 0, `door ${i} has no plates`);
          d.plates.forEach((p) => assert.ok(dynamics.plates.includes(p), `door ${i} refers to a plate not in the level`));
        });
        if (dynamics.doors.length) assert.ok(dynamics.plates.length > 0, 'doors but no plates');

        // The cube serial stencilled in the chamber matches CHAMBERS (NARRATIVE.md: one at every entrance).
        assert.ok(
          level.placards.some((pl) => pl.voice === 'stencil' && pl.text === `CUBE ${chamber.cube}`),
          `no CUBE ${chamber.cube} placard`,
        );

        // A placard quoting the field's state agrees with what the fall from this chamber shows.
        for (const pl of level.placards) {
          const m = /(\d+)% OF CUBES RESPONDING/.exec(pl.text);
          if (m) assert.equal(Number(m[1]), Math.round(100 * (1 - darkFraction(index, CHAMBERS.length))), pl.text);
        }

        // Placards: every corner lies on a real face pointing the placard's way, with open space in front of it.
        for (const pl of level.placards) {
          const k = pl.normal.findIndex((c) => c !== 0);
          const sign = pl.normal[k];
          const label = `placard "${pl.text.split('\n')[0]}"`;
          // Corners pulled in a hair, so a placard that exactly meets a face's edge still counts as on it.
          const corners = placardCorners(pl.at, pl.frame, pl.width - 1e-3, pl.height - 1e-3);
          for (const c of [pl.at, ...corners]) {
            const onFace = solids.some(
              (s) =>
                Math.abs((sign > 0 ? s.max[k] : s.min[k]) - c[k]) < 1e-6 &&
                [0, 1, 2].every((i) => i === k || (c[i] >= s.min[i] - 1e-6 && c[i] <= s.max[i] + 1e-6)),
            );
            assert.ok(onFace, `${label}: ${c} is not on a face with normal ${pl.normal}`);
            const front = c.map((v, i) => v + pl.normal[i] * 0.05);
            assert.ok(!solids.some((s) => inside(s, front)), `${label}: ${c} is covered by a solid`);
          }
        }
      } finally {
        level.dispose();
      }
    });

    test('par is no smaller than the shortest lever route from entrance to exit', () => {
      const par = chamber.par;
      if (par === undefined) return;
      const level = chamber.build(scene, skin);
      try {
        // Breadth-first over gravity axes, using every lever wherever it would change gravity. One-shot levers and the
        // need to walk between levers are ignored, which only makes the route shorter: a lower bound on any real route.
        const dist = new Map<GravityAxis, number>([[level.entranceAxis, 0]]);
        const queue: GravityAxis[] = [level.entranceAxis];
        // The route must end with a shift onto the exit axis, even when that is the entrance axis (a round trip).
        let shortest = Infinity;
        for (let i = 0; i < queue.length; i++) {
          const from = queue[i];
          for (const sw of level.switches) {
            if (sw.spec.kind === 'sequence') continue;
            const to = sw.targetFor(from);
            if (!to) continue;
            if (to === level.exitAxis) shortest = Math.min(shortest, dist.get(from)! + 1);
            if (!dist.has(to)) {
              dist.set(to, dist.get(from)! + 1);
              queue.push(to);
            }
          }
        }
        assert.ok(Number.isFinite(shortest), `exitAxis ${level.exitAxis} is unreachable through the levers`);
        assert.ok(par >= shortest, `par ${par} is less than the shortest lever route, ${shortest} shifts`);
      } finally {
        level.dispose();
      }
    });

    test('dispose() releases everything it created', () => {
      const before = counts();
      const level = chamber.build(scene, skin);
      assert.ok(scene.meshes.length > before.meshes, 'building created no meshes');
      level.dispose();
      assert.deepEqual(counts(), before);
    });
  });
}

test('a crate chamber with its crate preview shown disposes everything, the ghosts included', async () => {
  const { GravitySystem } = await import('../src/gravity/GravitySystem.ts');
  const crateChamber = CHAMBERS.find((c) => {
    const level = c.build(scene, skin);
    try {
      return level.dynamics.crates.length > 0;
    } finally {
      level.dispose();
    }
  });
  assert.ok(crateChamber, 'some chamber has crates');
  const before = counts();
  const level = crateChamber.build(scene, skin);
  // Ghosts are made lazily, so ask for one per crate, a little above where each crate rests, so each one shows.
  const shifted = level.dynamics.crates.map((c) => [c.body.center[0], c.body.center[1] + 1, c.body.center[2]] as const);
  const predicted = level.dynamics.predict(GravitySystem.axisVector('-Y').scale(22), level.spawnPosition);
  level.dynamics.showPreview(shifted.map((p) => [...p]));
  assert.ok(predicted.length === level.dynamics.crates.length);
  assert.ok(scene.meshes.some((m) => m.name === 'crateGhost'), 'a ghost was made');
  level.dispose();
  assert.deepEqual(counts(), before);
});

test('building and disposing every chamber in sequence leaves the scene clean', () => {
  const before = counts();
  for (const c of CHAMBERS) c.build(scene, skin).dispose();
  assert.deepEqual(counts(), before);
});

test('The Lockout is stuck once its one-shot lever is burnt out on the wrong axis, and not at the start', () => {
  const level = buildLockout(scene, skin);
  try {
    const relative = level.switches.find((sw) => sw.spec.kind === 'relative');
    assert.ok(relative, 'The Lockout has no relative lever');
    const levers = level.switches.map(leverMoves);
    assert.equal(level.entranceAxis, '-Y');
    assert.equal(level.exitAxis, '+Y');
    assert.equal(leversExhausted(level.entranceAxis, level.exitAxis, levers), false, 'stuck at the start');
    // The wrong first throw: from -Y the one-shot lever turns gravity to -X, and burns out.
    const wrong = relative.targetFor('-Y');
    assert.equal(wrong, '-X', 'the one-shot lever should turn -Y to -X');
    relative.burnOut();
    assert.equal(leversExhausted('-X', level.exitAxis, levers), true, 'burnt out on -X, the exit is still reachable');
  } finally {
    level.dispose();
  }
});
