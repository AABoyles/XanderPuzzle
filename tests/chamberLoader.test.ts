import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ChamberLoader } from '../src/level/chambers/ChamberLoader.ts';
import { CHAMBERS } from '../src/level/chambers/catalog.ts';

/** A stand-in factory: the loader only passes factories along, so any function will do. */
const factory = (tag: string) => (() => tag) as never;

function source(tag: string, calls: { n: number }) {
  return {
    load: async () => {
      calls.n++;
      return { default: factory(tag) };
    },
  };
}

test('get returns nothing until the chamber has been loaded, then its factory', async () => {
  const calls = { n: 0 };
  const loader = new ChamberLoader([source('a', calls)]);
  assert.equal(loader.count, 1);
  assert.equal(loader.get(0), undefined);
  assert.equal(calls.n, 0, 'get must not start a load');
  const built = await loader.load(0);
  assert.equal(loader.get(0), built);
  assert.equal((built as unknown as () => string)(), 'a');
});

test('a chamber is fetched once, however often it is asked for', async () => {
  const calls = { n: 0 };
  const loader = new ChamberLoader([source('a', calls)]);
  const [x, y] = await Promise.all([loader.load(0), loader.load(0)]);
  assert.equal(x, y);
  await loader.load(0);
  assert.equal(calls.n, 1);
});

test('a failed fetch is not remembered: the next load tries again', async () => {
  let attempts = 0;
  const loader = new ChamberLoader([
    {
      load: async () => {
        if (++attempts === 1) throw new Error('offline');
        return { default: factory('a') };
      },
    },
  ]);
  await assert.rejects(loader.load(0), /offline/);
  assert.equal(loader.get(0), undefined);
  await loader.load(0);
  assert.notEqual(loader.get(0), undefined);
  assert.equal(attempts, 2);
});

test('an index outside the list is rejected by load and ignored by preload', async () => {
  const loader = new ChamberLoader([source('a', { n: 0 })]);
  await assert.rejects(loader.load(3), RangeError);
  loader.preload(-1);
  loader.preload(3);
});

test('preload fetches in the background and swallows a failure', async () => {
  const calls = { n: 0 };
  const loader = new ChamberLoader([
    source('a', calls),
    { load: () => Promise.reject(new Error('offline')) },
  ]);
  loader.preload(0);
  loader.preload(1);
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.notEqual(loader.get(0), undefined);
  assert.equal(loader.get(1), undefined);
});

test('the catalog can be read without loading any chamber: ids are unique and every entry can load', () => {
  assert.equal(new Set(CHAMBERS.map((c) => c.id)).size, CHAMBERS.length);
  for (const c of CHAMBERS) assert.equal(typeof c.load, 'function', c.id);
});
