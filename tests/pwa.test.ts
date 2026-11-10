import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cacheName, hashString, staleCaches, strategyFor, CACHE_PREFIX } from '../src/pwa/cachePolicy.ts';

test('cacheName is stable, order independent and changes with the asset list', () => {
  const a = ['./', 'assets/a-1.js'];
  assert.equal(cacheName(a), cacheName([...a].reverse()));
  assert.notEqual(cacheName(a), cacheName(['./', 'assets/a-2.js']));
  assert.ok(cacheName(a).startsWith(CACHE_PREFIX));
  assert.equal(hashString('x'), hashString('x'));
});

test('strategyFor classifies shell vs hashed assets', () => {
  assert.equal(strategyFor('/game/', true), 'network-first');
  assert.equal(strategyFor('/game/', false), 'network-first');
  assert.equal(strategyFor('/game/index.html', false), 'network-first');
  assert.equal(strategyFor('/game/manifest.webmanifest', false), 'network-first');
  assert.equal(strategyFor('/game/assets/index-abc.js', false), 'cache-first');
  assert.equal(strategyFor('/game/icons/icon-192.png', false), 'cache-first');
});

test('staleCaches only returns old caches of this app', () => {
  assert.deepEqual(staleCaches(['shiftbound-1', 'shiftbound-2', 'other'], 'shiftbound-2'), ['shiftbound-1']);
});
