// Replays each crate chamber's gravity route headlessly (Babylon NullEngine, the real crate physics, no player
// movement) and checks where the crates end up: whether the doors are open, and optionally where each crate rests. `solved: false` rows pin down the wrong orders a chamber is
// built around: they must NOT open the doors. Like chambers.test.ts this does not prove the player can walk the route.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { setupHeadless } from './helpers/headless.ts';
import type { GravityAxis } from '../src/gravity/axes.ts';

setupHeadless();
const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
const { Scene } = await import('@babylonjs/core/scene');
const { GlowLayer } = await import('@babylonjs/core/Layers/glowLayer');
const { Vector3 } = await import('@babylonjs/core/Maths/math.vector');
await import('../src/babylonSideEffects.ts');
const { createSkin } = await import('../src/skins/Skin.ts');
const { GravitySystem } = await import('../src/gravity/GravitySystem.ts');
const { CHAMBERS: CATALOG } = await import('../src/level/chambers/index.ts');
// Chambers load lazily in the game; the tests fetch every module up front and build from them directly.
const CHAMBERS = await Promise.all(CATALOG.map(async (c) => ({ ...c, build: (await c.load()).default })));

type P = [number, number, number];
/** One gravity shift, and where the player stands while the crates settle (default: where they last stood). */
type Step = [axis: GravityAxis, player?: P];

interface Route {
  id: string;
  /** What this row shows, for the test name. */
  what: string;
  steps: Step[];
  /** Whether every door is open once the last step has settled. Leave out for a chamber with no doors. */
  solved?: boolean;
  /** Where each crate (in `addCrate` order) must rest at the end, within 0.1; 'lost' if it fell out; null for any. */
  crates?: (P | 'lost' | null)[];
  /** How many crates must have fallen out of the level by the end (default 0). */
  lost?: number;
}

// The player starts at the chamber's spawn, where they are out of every crate's way.
const ROUTES: Route[] = [
  { id: 'sieve', what: 'the route', steps: [['+X'], ['+Y'], ['+X'], ['-Y']], solved: true },
  { id: 'sieve', what: '+X then -Y: stopped at the field', steps: [['+X'], ['-Y']], solved: false, crates: [[-1, -5.25, 4]] },
  { id: 'sieve', what: '+X, +Y, -Y: back at the foot', steps: [['+X'], ['+Y'], ['-Y']], solved: false, crates: [[-1, -5.25, 4]] },
  {
    id: 'atrium',
    what: 'the five shifts, caged crate stays in its cage',
    steps: [['+X'], ['-Z'], ['-X'], ['+Z'], ['+Y']],
    crates: [[3.75, 6.25, 6.25]],
  },
  { id: 'ballast', what: 'the route', steps: [['+X'], ['-Y']], solved: true },
  { id: 'counterweight', what: 'the route', steps: [['-X'], ['-Y'], ['+X']], solved: true },
  { id: 'counterweight', what: '+X first', steps: [['+X']], solved: false },
  { id: 'deadman', what: '+X with nobody on the plate', steps: [['+X']], solved: false, crates: [[-0.75, -7.25, 4]] },
  { id: 'deadman', what: '+X then -Y with nobody on the plate', steps: [['+X'], ['-Y']], solved: false, crates: [[-0.75, -7.25, 4]] },
  { id: 'deadman', what: 'the route, holding the plate', steps: [['+X', [7.5, -3, -1]], ['-Y']], solved: true },
  { id: 'deadman', what: 'the route, stepping off at the end', steps: [['+X', [7.5, -3, -1]], ['-Y', [7.5, -7.5, -1]]], crates: [[7.25, -7.25, 4]] },
  // The crate rests 0.625 above the floor and 0.625 off the partition; under the window is x 0.
  { id: 'footing', what: 'the route leaves the crate under the window', steps: [['-X'], ['-Y'], ['+X'], ['-Y']], crates: [[0, 0.625, -0.625]] },
  { id: 'footing', what: '+X first leaves the crate at the east wall', steps: [['+X'], ['-Y']], crates: [[7.375, 1.325, -0.625]] },
  { id: 'footing', what: '-X alone leaves the crate at the west wall', steps: [['-X']], crates: [[-7.375, 1.325, -0.625]] },
  { id: 'grate', what: 'the route', steps: [['+X'], ['-Y']], solved: true },
  { id: 'orrery', what: 'the route', steps: [['+X'], ['+Z'], ['+Y'], ['-X'], ['-Z'], ['+Y']], solved: true },
  // The fork: -Z from the ceiling parks the crate in the pocket by the south wall; every shift the levers allow after it.
  { id: 'orrery', what: 'the -Z lever at the fork', steps: [['+X'], ['+Z'], ['+Y'], ['-Z']], solved: false, crates: [[11.25, 11.25, -11.25]] },
  { id: 'orrery', what: 'the fork, then +Y', steps: [['+X'], ['+Z'], ['+Y'], ['-Z'], ['+Y']], solved: false, crates: [[11.25, 11.25, -11.25]] },
  { id: 'orrery', what: 'the fork, then +Y, -X', steps: [['+X'], ['+Z'], ['+Y'], ['-Z'], ['+Y'], ['-X']], solved: false, crates: [[11.25, 11.25, -11.25]] },
  { id: 'orrery', what: 'the fork, then -X directly', steps: [['+X'], ['+Z'], ['+Y'], ['-Z'], ['-X']], solved: false, crates: [[11.25, 11.25, -11.25]] },
  { id: 'orrery', what: 'the fork, then +Y, -X, -Z', steps: [['+X'], ['+Z'], ['+Y'], ['-Z'], ['+Y'], ['-X'], ['-Z']], solved: false },
  { id: 'pendulum', what: '+X', steps: [['+X']], solved: true, crates: [[13.25, 0.75, 1]] },
  { id: 'pendulum', what: '+X, -Y', steps: [['+X'], ['-Y']], solved: true, crates: [[13.25, 0.75, 1]] },
  { id: 'pendulum', what: '+X, -Y, -X: shut, crate back west', steps: [['+X'], ['-Y'], ['-X']], solved: false, crates: [[-13.25, 0.75, 1]] },
  { id: 'surplus', what: 'the route', steps: [['-X', [-0.8, -7.5, 0]], ['-Y'], ['+X'], ['-Y']], solved: true, lost: 1, crates: ['lost', [7.25, -7.25, 3]] },
  { id: 'surplus', what: '+X first', steps: [['+X']], solved: false, lost: 0, crates: [[7.25, -7.25, -3], [7.25, -7.25, 3]] },
  { id: 'surplus', what: '-Z then -X', steps: [['-Z'], ['-Y'], ['-X']], solved: false, lost: 1, crates: [[-7.25, -7.25, -7.25], 'lost'] },
  { id: 'surplus', what: '-Z, -X and on', steps: [['-Z'], ['-Y'], ['-X'], ['-Y'], ['+X'], ['-Y']], solved: false, lost: 1 },
  {
    id: 'stopper', what: 'the route leaves the plug in the north-east corner',
    steps: [['-Z', [-2.8, -7.5, 6.5]], ['+X', [-2.8, -7.5, -7.5]], ['+Z', [7.5, -7.5, -6]]], crates: [[6.75, -1.25, 6.75]],
  },
  {
    id: 'stopper', what: '-Z then -Y then +Z puts the plug back in the mouth',
    steps: [['-Z', [-2.8, -7.5, 6.5]], ['-Y', [-2.8, -7.5, -7.5]], ['+Z', [-2.8, -7.5, -7.5]]], crates: [[0, -1.25, 8.75]],
  },
  {
    id: 'stopper', what: '+X then +Z (never -Z) leaves the plug on the shoulder',
    steps: [['+X', [-2.8, -7.5, -6]], ['+Z', [7.5, -7.5, -6]]], crates: [[0, -1.25, 8.75]],
  },
  {
    id: 'stopper', what: '-Z alone drops the plug on the south wall',
    steps: [['-Z', [-2.8, -7.5, 6.5]]], crates: [[0, -1.25, -6.75]],
  },
];

const engine = new NullEngine();
const scene = new Scene(engine);
const skin = createSkin('axis', scene, new GlowLayer('glow', scene));
const magnitude = new GravitySystem().magnitude;

for (const route of ROUTES) {
  const outcome = route.solved === undefined ? 'parks the crates' : route.solved ? 'opens the doors' : 'does not open the doors';
  test(`${route.id}: ${route.what} ${outcome}`, () => {
    const chamber = CHAMBERS.find((c) => c.id === route.id);
    assert.ok(chamber, `no chamber with id ${route.id}`);
    const level = chamber.build(scene, skin);
    try {
      let player = level.spawnPosition.clone();
      const settle = (axis: GravityAxis) => {
        const g = GravitySystem.axisVector(axis).scale(magnitude);
        // Up to 20 s; stop once every crate has been still for half a second.
        for (let i = 0, still = 0; i < 1200 && still < 30; i++) {
          const before = JSON.stringify(level.dynamics.crates.map((c) => c.body.center));
          level.update(1 / 60, g, player);
          still = before === JSON.stringify(level.dynamics.crates.map((c) => c.body.center)) ? still + 1 : 0;
        }
      };
      settle(level.entranceAxis);
      for (const [axis, at] of route.steps) {
        if (at) player = Vector3.FromArray(at);
        settle(axis);
      }
      const { doors, crates, plates } = level.dynamics;
      const state = JSON.stringify({
        crates: crates.map((c) => (c.lost ? 'lost' : c.body.center.map((v) => +v.toFixed(2)))),
        plates: plates.map((p) => p.satisfied),
      });
      assert.ok(route.solved !== undefined || route.crates, 'the row checks nothing');
      if (route.solved !== undefined) {
        assert.ok(doors.length > 0, 'the chamber has no doors');
        assert.equal(doors.every((d) => d.isOpen), route.solved, state);
      }
      route.crates?.forEach((want, i) => {
        const c = crates[i];
        if (want === 'lost') assert.ok(c.lost, `crate ${i} should be lost: ${state}`);
        else if (want) assert.ok(!c.lost && want.every((v, k) => Math.abs(v - c.body.center[k]) <= 0.1), `crate ${i}: ${state}`);
      });
      assert.equal(crates.filter((c) => c.lost).length, route.lost ?? 0, state);
    } finally {
      level.dispose();
    }
  });
}
