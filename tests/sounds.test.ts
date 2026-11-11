import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import {
  AUDIO_FILES, IMPACT_FULL, IMPACT_QUIET, impactGain, MUSIC, pickVariant, SOUNDS, windCutoff, windGain, windLevel,
} from '../src/audio/sounds.ts';

test('every sound file the game asks for is in public/audio, with the credits', () => {
  assert.ok(AUDIO_FILES.includes(MUSIC.file));
  for (const file of AUDIO_FILES) assert.ok(existsSync(new URL(`../public/audio/${file}`, import.meta.url)), file);
  assert.ok(existsSync(new URL('../public/audio/CREDITS.md', import.meta.url)));
  assert.equal(new Set(AUDIO_FILES).size, AUDIO_FILES.length);
});

test('every effect has at least one file and a sane level', () => {
  for (const [name, spec] of Object.entries(SOUNDS)) {
    assert.ok(spec.files.length > 0, name);
    assert.ok(spec.gain > 0 && spec.gain <= 1, name);
    assert.ok(spec.vary >= 0 && spec.vary < 0.5, name);
  }
});

test('a slow crate is silent and a fast one is loud', () => {
  assert.equal(impactGain(0), 0);
  assert.equal(impactGain(IMPACT_QUIET), 0);
  assert.equal(impactGain(NaN), 0);
  assert.ok(impactGain(IMPACT_QUIET + 0.1) >= 0.25);
  assert.equal(impactGain(IMPACT_FULL), 1);
  assert.equal(impactGain(1000), 1);
  assert.ok(impactGain(20) > impactGain(10));
});

test('the wind starts from silence and only grows towards the planet', () => {
  assert.equal(windLevel(0), 0);
  assert.equal(windLevel(-1), 0);
  assert.equal(windLevel(1), 1);
  assert.equal(windLevel(2), 1);
  assert.ok(windLevel(0.1) < 0.02, 'near the cube it is all but silent');
  for (let t = 0.05; t <= 1; t += 0.05) assert.ok(windLevel(t) > windLevel(t - 0.05));
  assert.equal(windGain(0), 0);
  for (let l = 0.1; l <= 1; l += 0.1) {
    assert.ok(windGain(l) > windGain(l - 0.1));
    assert.ok(windCutoff(l) > windCutoff(l - 0.1));
  }
  assert.ok(windGain(1) <= 1);
});

test('variants are picked across the whole list and never out of it', () => {
  assert.equal(pickVariant(3, 0), 0);
  assert.equal(pickVariant(3, 0.5), 1);
  assert.equal(pickVariant(3, 0.999), 2);
  assert.equal(pickVariant(3, 1), 2);
  assert.equal(pickVariant(1, 0.7), 0);
});
