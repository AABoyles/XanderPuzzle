import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  handwriting, LINE_HEIGHT, MAX_TEXTURE, PADDING, placardCorners, placardFrame, placardSize, PX_PER_UNIT, texturePixels,
} from '../src/level/placardText.ts';
import type { Vec3 } from '../src/gravity/axes.ts';

const clean = (v: Vec3) => v.map((c) => c + 0) as Vec3; // turns -0 into 0 for deepEqual

test('a placard is as tall as its lines plus padding, whatever the font', () => {
  const s = placardSize('ONE\nTWO\nTHREE', 6, 'stencil');
  assert.deepEqual(s.lines, ['ONE', 'TWO', 'THREE']);
  assert.equal(s.width, 6);
  assert.ok(Math.abs(s.height - (3 * LINE_HEIGHT.stencil + 2 * PADDING)) < 1e-12);
  assert.equal(placardSize('x', 2, 'margin', 1).height, 1 + 2 * PADDING);
});

test('textures keep the resolution until they hit the cap', () => {
  assert.deepEqual(texturePixels(4, 1), { w: 4 * PX_PER_UNIT, h: PX_PER_UNIT, scale: PX_PER_UNIT });
  const big = texturePixels(40, 2);
  assert.equal(big.w, MAX_TEXTURE);
  assert.ok(big.h < MAX_TEXTURE && big.h >= 1);
});

test('wall text reads upright with its top against gravity', () => {
  // A wall facing -Z, read under ordinary gravity: up is +Y, and a viewer looking at it (along +Z) reads along +X.
  const f = placardFrame([0, 0, -1], '-Y');
  assert.deepEqual(clean(f.up), [0, 1, 0]);
  assert.deepEqual(clean(f.forward), [0, 0, 1]);
  assert.deepEqual(clean(f.right), [1, 0, 0]);
  // The same wall read under +X gravity: the top of the text points -X.
  assert.deepEqual(clean(placardFrame([0, 0, -1], '+X').up), [-1, 0, 0]);
});

test('floor and ceiling text needs a top direction along the face', () => {
  assert.throws(() => placardFrame([0, 1, 0], '-Y'), /needs a top/);
  assert.throws(() => placardFrame([0, 1, 0], '+Y'), /needs a top/);
  assert.throws(() => placardFrame([0, 1, 0], '-Y', [0, 1, 0]), /along the face/);
  const floor = placardFrame([0, 1, 0], '-Y', [0, 0, 1]);
  assert.deepEqual(clean(floor.up), [0, 0, 1]);
  assert.deepEqual(clean(floor.forward), [0, -1, 0]);
  assert.throws(() => placardFrame([0.6, 0.8, 0], '-Y'), /not a unit axis/);
});

test('the frame is right-handed in Babylon terms: right = up x forward', () => {
  for (const [n, g] of [[[1, 0, 0], '-Y'], [[0, -1, 0], '+X'], [[0, 0, 1], '+Y']] as const) {
    const { right, up, forward } = placardFrame(n as Vec3, g);
    const c = [up[1] * forward[2] - up[2] * forward[1], up[2] * forward[0] - up[0] * forward[2], up[0] * forward[1] - up[1] * forward[0]];
    assert.deepEqual(clean(right), clean(c as Vec3));
  }
});

test('corners span the placard around its centre', () => {
  const corners = placardCorners([0, 5, 12], placardFrame([0, 0, -1], '-Y'), 4, 2);
  assert.deepEqual(corners.map(clean), [[-2, 4, 12], [2, 4, 12], [2, 6, 12], [-2, 6, 12]]);
});

test('handwriting wobbles the same way for the same text, and only a little', () => {
  assert.deepEqual(handwriting(42, 10), handwriting(42, 10));
  assert.notDeepEqual(handwriting(42, 10), handwriting(43, 10));
  for (const g of handwriting(7, 200)) {
    assert.ok(Math.abs(g.angle) <= 0.07 && Math.abs(g.dx) <= 0.015 && Math.abs(g.dy) < 0.2);
    assert.ok(g.ink >= 0.7 && g.ink <= 1);
  }
});
