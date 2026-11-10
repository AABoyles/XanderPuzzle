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
import type { GravityAxis } from '../src/gravity/axes.ts';

setupHeadless();
// Dynamic imports: they must run after the hooks are registered.
const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
const { Scene } = await import('@babylonjs/core/scene');
const { GlowLayer } = await import('@babylonjs/core/Layers/glowLayer');
await import('../src/babylonSideEffects.ts');
const { createSkin } = await import('../src/skins/Skin.ts');
const { CHAMBERS } = await import('../src/level/chambers/index.ts');

/** Matches PlayerController's collider radius. */
const PLAYER_RADIUS = 0.5;
const playerBox = (c: readonly number[]): Aabb => ({
  min: [c[0] - PLAYER_RADIUS, c[1] - PLAYER_RADIUS, c[2] - PLAYER_RADIUS],
  max: [c[0] + PLAYER_RADIUS, c[1] + PLAYER_RADIUS, c[2] + PLAYER_RADIUS],
});
const inside = (b: Aabb, p: readonly number[]) => [0, 1, 2].every((i) => p[i] >= b.min[i] && p[i] <= b.max[i]);

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

        // Levers: every one must be usable from some axis the player can reach, and the exit axis must be reachable.
        const reachable = new Set<GravityAxis>([level.entranceAxis]);
        for (let grew = true; grew; ) {
          grew = false;
          for (const sw of level.switches) {
            const targets: (GravityAxis | null)[] =
              sw.spec.kind === 'sequence'
                ? sw.spec.sequencer.axes
                : [...reachable].map((a) => sw.targetFor(a));
            for (const t of targets) if (t && !reachable.has(t)) (reachable.add(t), (grew = true));
          }
        }
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

    test('dispose() releases everything it created', () => {
      const before = counts();
      const level = chamber.build(scene, skin);
      assert.ok(scene.meshes.length > before.meshes, 'building created no meshes');
      level.dispose();
      assert.deepEqual(counts(), before);
    });
  });
}

test('building and disposing every chamber in sequence leaves the scene clean', () => {
  const before = counts();
  for (const c of CHAMBERS) c.build(scene, skin).dispose();
  assert.deepEqual(counts(), before);
});
