import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  decodeSpec,
  encodeSpec,
  LIMITS,
  MAX_ENCODED_LENGTH,
  packSpec,
  specFromHash,
  SpecCodecError,
  unpackSpec,
} from '../src/level/specCodec.ts';
import type { ChamberSpec } from '../src/level/spec.ts';
import { VAULT } from '../src/level/specs/vault.ts';
import { STAIRCASE } from '../src/level/specs/staircase.ts';
import { DESCENT } from '../src/level/specs/descent.ts';
import { DIVIDE } from '../src/level/specs/divide.ts';
import { CHIMNEY } from '../src/level/specs/chimney.ts';
import { SHAFT } from '../src/level/specs/shaft.ts';
import { SPIRAL } from '../src/level/specs/spiral.ts';

const ALL = { VAULT, STAIRCASE, DESCENT, DIVIDE, CHIMNEY, SHAFT, SPIRAL };
const rejects = (p: Promise<unknown>) => assert.rejects(p, SpecCodecError);

describe('spec codec', () => {
  for (const [name, spec] of Object.entries(ALL)) {
    test(`${name} survives a round trip`, async () => {
      assert.deepEqual(await decodeSpec(await encodeSpec(spec)), spec);
    });
  }

  test('links are URL-safe and much shorter than the plain JSON', async () => {
    for (const spec of Object.values(ALL)) {
      const link = await encodeSpec(spec);
      assert.match(link, /^v1\.[A-Za-z0-9_-]+$/);
      assert.ok(link.length < MAX_ENCODED_LENGTH);
      assert.ok(link.length < JSON.stringify(spec).length / 2, `${spec.name}: ${link.length} chars`);
    }
  });

  test('packing alone drops the field names', () => {
    assert.ok(JSON.stringify(packSpec(STAIRCASE)).length < JSON.stringify(STAIRCASE).length * 0.7);
  });

  test('a large chamber still fits in a link', async () => {
    const parts = Array.from({ length: 600 }, (_, i) => ({
      kind: 'box' as const,
      min: [i % 20, 0, Math.floor(i / 20)] as [number, number, number],
      max: [(i % 20) + 0.5, 1, Math.floor(i / 20) + 0.5] as [number, number, number],
    }));
    const big: ChamberSpec = { ...DIVIDE, parts: [...DIVIDE.parts, ...parts] };
    const link = await encodeSpec(big);
    assert.ok(link.length < 8000, `${link.length} chars`);
    assert.deepEqual(await decodeSpec(link), big);
  });

  test('specFromHash reads only a #c= fragment', () => {
    assert.equal(specFromHash('#c=v1.abc'), 'v1.abc');
    assert.equal(specFromHash(''), undefined);
    assert.equal(specFromHash('#other=1'), undefined);
  });

  describe('rejects hostile or broken links', () => {
    test('garbage, wrong version, wrong alphabet', async () => {
      await rejects(decodeSpec(''));
      await rejects(decodeSpec('v1.'));
      await rejects(decodeSpec('v2.abc'));
      await rejects(decodeSpec('v1.not base64!'));
      await rejects(decodeSpec('v1.AAAA'));
    });

    test('a link that is too long', async () => {
      await rejects(decodeSpec('v1.' + 'A'.repeat(MAX_ENCODED_LENGTH)));
    });

    test('a small link that inflates past the cap', async () => {
      const bomb = new Uint8Array(1 << 20).fill(32);
      const out = new Blob([bomb]).stream().pipeThrough(new CompressionStream('deflate-raw'));
      const bytes = new Uint8Array(await new Response(out).arrayBuffer());
      assert.ok(bytes.length < 5000);
      await rejects(decodeSpec('v1.' + Buffer.from(bytes).toString('base64url')));
    });

    test('bad fields', () => {
      const good = () => JSON.parse(JSON.stringify(packSpec(DIVIDE))) as any[];
      const bad = (edit: (p: any[]) => void) => {
        const p = good();
        edit(p);
        assert.throws(() => unpackSpec(p), SpecCodecError);
      };
      assert.doesNotThrow(() => unpackSpec(good()));
      bad((p) => (p[1][0][2] = 'x')); // slab bound is not a number
      bad((p) => (p[1][0][2] = 1e9)); // out of range
      bad((p) => (p[1][0][6] = 9)); // unknown role
      bad((p) => (p[1][0][0] = 'q')); // unknown part
      bad((p) => (p[2][0][2] = '+Q')); // unknown axis
      bad((p) => (p[3][0][3] = 'x'.repeat(LIMITS.text + 1))); // text too long
      bad((p) => (p[3][0][3] = 7)); // text is not text
      bad((p) => (p[2] = [])); // exit unreachable
      bad((p) => (p[0] = [2, 0, 0])); // accent out of range
      bad((p) => (p[1] = new Array(LIMITS.parts + 1).fill(p[1][0]))); // too many parts
      bad((p) => p.pop()); // wrong shape
    });
  });
});
