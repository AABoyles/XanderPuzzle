import { test } from 'node:test';
import assert from 'node:assert/strict';
import { COLOR_ASSIST_AXIS, relativeLuminance } from '../src/skins/axisPalette.ts';
import type { Rgb } from '../src/skins/axisPalette.ts';

const AXES = ['+X', '-X', '+Y', '-Y', '+Z', '-Z'] as const;
const distance = (a: Rgb, b: Rgb) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

test('the six colour-blind axis colours are pairwise at least 0.25 apart in RGB', () => {
  AXES.forEach((a, i) => {
    AXES.slice(i + 1).forEach((b) => {
      const d = distance(COLOR_ASSIST_AXIS[a], COLOR_ASSIST_AXIS[b]);
      assert.ok(d >= 0.25, `${a} and ${b} are too close: ${d.toFixed(3)}`);
    });
  });
});

test('the palette is in the 0-1 range', () => {
  for (const axis of AXES) {
    for (const c of COLOR_ASSIST_AXIS[axis]) assert.ok(c >= 0 && c <= 1, `${axis} channel ${c} out of range`);
  }
});

test('relative luminance runs from black to white', () => {
  assert.equal(relativeLuminance([0, 0, 0]), 0);
  assert.ok(Math.abs(relativeLuminance([1, 1, 1]) - 1) < 1e-9);
  assert.ok(relativeLuminance(COLOR_ASSIST_AXIS['+Y']) > relativeLuminance(COLOR_ASSIST_AXIS['-Y']));
});
