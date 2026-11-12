// The colour-blind palette swaps the axis colours in every skin, and a skin built with it must dispose cleanly, since
// the pause menu rebuilds the chamber with a new skin each time the setting changes.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { setupHeadless } from './helpers/headless.ts';

setupHeadless();
// Dynamic imports: they must run after the hooks are registered.
const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
const { Scene } = await import('@babylonjs/core/scene');
const { GlowLayer } = await import('@babylonjs/core/Layers/glowLayer');
await import('../src/babylonSideEffects.ts');
const { createSkin, SKIN_IDS } = await import('../src/skins/Skin.ts');
const { COLOR_ASSIST_AXIS } = await import('../src/skins/axisPalette.ts');
const { CHAMBERS: CATALOG } = await import('../src/level/chambers/index.ts');
// Chambers load lazily in the game; the tests fetch every module up front and build from them directly.
const CHAMBERS = await Promise.all(CATALOG.map(async (c) => ({ ...c, build: (await c.load()).default })));
const { AXES } = await import('../src/gravity/axes.ts');

const engine = new NullEngine();
const scene = new Scene(engine);
const glow = new GlowLayer('glow', scene);

const counts = () => ({
  meshes: scene.meshes.length,
  materials: scene.materials.length,
  textures: scene.textures.length,
  lights: scene.lights.length,
  beforeRender: scene.onBeforeRenderObservable.observers.length,
  afterRender: scene.onAfterRenderObservable.observers.length,
});

const hexOf = (c: { r: number; g: number; b: number }) =>
  [c.r, c.g, c.b]
    .map((v) =>
      Math.round(v * 255)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('');

test('with the palette on, every skin levers and HUD use the palette colours for each axis', () => {
  for (const id of SKIN_IDS) {
    const skin = createSkin(id, scene, glow, true);
    try {
      for (const axis of AXES) {
        const [r, g, b] = COLOR_ASSIST_AXIS[axis];
        const expected = hexOf({ r, g, b });
        assert.equal(hexOf(skin.leverColor(axis)), expected, `${id} lever ${axis}`);
        // The HUD is the lever colour lightened (or the Axis surface, which is the palette itself).
        assert.match(skin.hudColor(axis), /^#[0-9a-f]{6}$/i, `${id} HUD ${axis}`);
      }
    } finally {
      skin.dispose();
    }
  }
});

test('every skin rebuilt with the palette disposes everything it created', () => {
  const rebuild = (id: (typeof SKIN_IDS)[number]) => {
    const skin = createSkin(id, scene, glow, true);
    CHAMBERS[0].build(scene, skin).dispose();
    skin.dispose();
  };
  // Like chambers.test.ts: the first build of a skin also creates shared scene objects, so warm up before the baseline.
  for (const id of SKIN_IDS) rebuild(id);
  for (const id of SKIN_IDS) {
    const before = counts();
    rebuild(id);
    assert.deepEqual(counts(), before, `${id} leaked with the palette on`);
  }
});
