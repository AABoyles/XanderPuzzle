import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HINT_AFTER, HintLadder, MORE_HINTS, hintFor, hintTier } from '../src/hints.ts';
import { CHAMBERS } from '../src/level/chambers/catalog.ts';

// The chamber ids in play order, from the catalog (Babylon-free, so Node reads it directly).
const IDS = CHAMBERS.map((c) => c.id);

test('the ladder: time alone, restarts alone, and neither', () => {
  assert.equal(hintTier(0, 0), 0);
  assert.equal(hintTier(149, 2), 0);
  assert.equal(hintTier(150, 0), 1);
  assert.equal(hintTier(0, 3), 1);
  assert.equal(hintTier(359, 6), 1);
  assert.equal(hintTier(360, 0), 2);
  assert.equal(hintTier(0, 7), 2);
});

test('the thresholds are the ones the ladder documents', () => {
  assert.deepEqual(HINT_AFTER, [
    { seconds: 150, restarts: 3 },
    { seconds: 360, restarts: 7 },
  ]);
});

test('hintFor: tier 0, an unknown id and an undefined id show the base hint', () => {
  assert.equal(hintFor('vault', 'Base.', 0), 'Base.');
  assert.equal(hintFor('no-such-chamber', 'Base.', 2), 'Base.');
  assert.equal(hintFor(undefined, 'Base.', 2), 'Base.');
});

test('hintFor: tiers 1 and 2 show the chamber\'s second and third lines', () => {
  assert.equal(hintFor('vault', 'Base.', 1), MORE_HINTS.vault[0]);
  assert.equal(hintFor('vault', 'Base.', 2), MORE_HINTS.vault[1]);
  assert.notEqual(MORE_HINTS.vault[0], MORE_HINTS.vault[1]);
});

test('MORE_HINTS covers every chamber id, with two lines each', () => {
  assert.deepEqual(Object.keys(MORE_HINTS).sort(), [...IDS].sort());
  for (const id of IDS) assert.equal(MORE_HINTS[id].length, 2, id);
});

test('every extra line is non-empty, at most 90 characters, one or two sentences, with no exclamation marks', () => {
  for (const id of IDS) {
    for (const line of MORE_HINTS[id]) {
      assert.ok(line.length > 0, `${id}: empty line`);
      assert.ok(line.length <= 90, `${id}: ${line.length} characters: ${line}`);
      assert.ok(!line.includes('!'), `${id}: exclamation mark: ${line}`);
      const sentences = line.split(/(?<=[.?])\s+/).filter((s) => s.length > 0);
      assert.ok(sentences.length <= 2, `${id}: more than two sentences: ${line}`);
    }
  }
});

test('no extra line names an axis (+X, -Y and so on): the player sees directions, not axes', () => {
  for (const id of IDS) {
    for (const line of MORE_HINTS[id]) assert.doesNotMatch(line, /[+-][XYZ]/, `${id}: ${line}`);
  }
});

test('no extra line uses a compass word or a room letter: the player has no compass and never sees those names', () => {
  for (const id of IDS) {
    for (const line of MORE_HINTS[id]) {
      assert.doesNotMatch(line, /\b(north|south|east|west)\b/i, `${id}: ${line}`);
      assert.doesNotMatch(line, /\broom [abcd]\b/i, `${id}: ${line}`);
    }
  }
});

test('a visit climbs the ladder once per tier, keeps its place across restarts, and starts over on reset', () => {
  const ladder = new HintLadder();
  assert.equal(ladder.rise(0), undefined);
  ladder.tick(HINT_AFTER[0].seconds);
  assert.equal(ladder.rise(0), 1);
  assert.equal(ladder.rise(0), undefined, 'the same tier is not announced twice');
  assert.equal(ladder.shown, 1);
  assert.equal(ladder.rise(HINT_AFTER[1].restarts), 2, 'restarts alone reach the next tier');
  ladder.reset();
  assert.equal(ladder.shown, 0);
  assert.equal(ladder.seconds, 0);
  assert.equal(ladder.rise(0), undefined);
});
