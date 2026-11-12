// Chambers described as data (src/level/specs/) are checked here with no Babylon and no build.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { CHAMBERS } from '../src/level/chambers/catalog.ts';
import { checkSpec, WALL_T, type ChamberSpec } from '../src/level/spec.ts';
import { DIVIDE } from '../src/level/specs/divide.ts';
import { CHIMNEY } from '../src/level/specs/chimney.ts';
import { SHAFT } from '../src/level/specs/shaft.ts';
import { SPIRAL } from '../src/level/specs/spiral.ts';
import { VAULT } from '../src/level/specs/vault.ts';
import { DESCENT } from '../src/level/specs/descent.ts';
import { STAIRCASE } from '../src/level/specs/staircase.ts';

const SPECS: Record<string, ChamberSpec> = {
  vault: VAULT,
  shaft: SHAFT,
  divide: DIVIDE,
  spiral: SPIRAL,
  chimney: CHIMNEY,
  staircase: STAIRCASE,
  descent: DESCENT,
};

describe('chamber specs', () => {
  for (const [id, spec] of Object.entries(SPECS)) {
    test(`${id} is sound and matches its catalog entry`, () => {
      assert.deepEqual(checkSpec(spec), []);
      const entry = CHAMBERS.find((c) => c.id === id);
      assert.ok(entry, `${id} is in the catalog`);
      assert.equal(spec.name, entry.name);
    });
  }

  test('checkSpec finds problems without building', () => {
    const bad: ChamberSpec = {
      ...DIVIDE,
      exitAxis: '+Y',
      levers: [{ at: [0, 0, 0], normal: [1, 1, 0], target: '+X' }],
      parts: [{ kind: 'box', min: [1, 0, 0], max: [0, 1, 1] }],
    };
    const problems = checkSpec(bad).join('\n');
    assert.match(problems, /part 0 \(box\) is empty or inverted/);
    assert.match(problems, /lever 0 normal/);
    assert.match(problems, /cannot take gravity from -Y to \+Y/);
  });

  test("the spec wall thickness is the Builder's", async () => {
    const { setupHeadless } = await import('./helpers/headless.ts');
    setupHeadless();
    const { T } = await import('../src/level/Builder.ts');
    assert.equal(WALL_T, T);
  });
});
