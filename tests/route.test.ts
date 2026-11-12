import assert from 'node:assert/strict';
import { test } from 'node:test';
import { hashForChamber, routeFromHash } from '../src/level/route.ts';
import { CHAMBERS } from '../src/level/chambers/catalog.ts';

test('a hash names a chamber, a shared chamber, or nothing', () => {
  assert.deepEqual(routeFromHash('#shaft'), { kind: 'chamber', id: 'shaft' });
  assert.deepEqual(routeFromHash('#/Shaft'), { kind: 'chamber', id: 'shaft' });
  assert.deepEqual(routeFromHash('#c=v1.abc'), { kind: 'shared', encoded: 'v1.abc' });
  for (const h of ['', '#', '#a b', '#shaft/extra', '#<script>', '#1abc']) assert.equal(routeFromHash(h), undefined, h);
});

test('every chamber id round-trips through its hash', () => {
  for (const c of CHAMBERS) assert.deepEqual(routeFromHash(hashForChamber(c.id)), { kind: 'chamber', id: c.id });
});
