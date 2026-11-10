import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CHAMBER_CLEARANCE, CHAMBER_DEPTH, chamberHull, CUBE_MAX, cubeAngle, FIELD_BOTTOM, FIELD_CLEARANCE, FIELD_COUNT, FIELD_RADIUS, FIELD_TOP, fieldBasis, layoutField,
  toWorld, TURN_TIME,
} from '../src/environment/ballastField.ts';
import type { Vec3 } from '../src/environment/fall.ts';

const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const near = (a: number, b: number, eps = 1e-9) => Math.abs(a - b) < eps;

test('a seed always lays out the same field', () => {
  assert.deepEqual(layoutField(7, 0.3), layoutField(7, 0.3));
  assert.notDeepEqual(layoutField(7, 0.3), layoutField(8, 0.3));
});

test('the field fills up, stays in its band and never reaches the fall line', () => {
  for (let seed = 1; seed <= 20; seed++) {
    const cubes = layoutField(seed, 0.4);
    assert.equal(cubes.length, FIELD_COUNT);
    for (const c of cubes) {
      const r = Math.hypot(c.position[0], c.position[2]);
      // Even tumbling, a cube reaches no further than half its diagonal from its centre.
      assert.ok(r - (c.size * Math.sqrt(3)) / 2 > 2, `cube at r=${r} reaches the player`);
      assert.ok(r >= FIELD_CLEARANCE - 1e-9 && r <= FIELD_RADIUS + 1e-9);
      assert.ok(c.position[1] >= FIELD_BOTTOM && c.position[1] <= FIELD_TOP);
      assert.ok(c.size <= CUBE_MAX);
      if (c.position[1] >= CHAMBER_DEPTH) assert.ok(r > CHAMBER_CLEARANCE, 'cube overlaps the chamber just left');
    }
  }
});

test('no two cubes overlap', () => {
  const cubes = layoutField(3, 0.5);
  for (let i = 0; i < cubes.length; i++) {
    for (let j = i + 1; j < cubes.length; j++) {
      const [a, b] = [cubes[i], cubes[j]];
      const d = Math.hypot(a.position[0] - b.position[0], a.position[1] - b.position[1], a.position[2] - b.position[2]);
      assert.ok(d > (a.size + b.size) * 0.9);
    }
  }
});

test('the dark fraction sets how many cubes have stopped', () => {
  assert.ok(layoutField(5, 0).every((c) => !c.dark));
  assert.ok(layoutField(5, 1).every((c) => c.dark));
  const dark = layoutField(5, 0.5).filter((c) => c.dark).length;
  assert.ok(dark > FIELD_COUNT * 0.3 && dark < FIELD_COUNT * 0.7, `${dark} dark`);
});

test('a lit cube turns about one frame axis and rests on whole quarter turns', () => {
  const cube = layoutField(11, 0).find((c) => c.axis.filter((v) => v === 1).length === 1);
  assert.ok(cube);
  const lit = { ...cube, phase: 0, rate: 5 };
  // At rest between turns, on a multiple of a quarter turn.
  for (const t of [0, 1, 3.5, 5.1, 8, 13]) {
    const quarters = cubeAngle(lit, t) / (Math.PI / 2);
    assert.ok(near(quarters, Math.round(quarters)), `t=${t}: ${quarters}`);
  }
  // Mid-turn, partway, and never going backwards.
  const mid = cubeAngle(lit, 5 - TURN_TIME / 2) / (Math.PI / 2);
  assert.ok(near(mid, 0.5));
  let last = -Infinity;
  for (let t = 0; t < 20; t += 0.05) {
    const a = cubeAngle(lit, t);
    assert.ok(a >= last - 1e-12);
    last = a;
  }
});

test('a dark cube tumbles steadily', () => {
  const cube = { ...layoutField(2, 1)[0], phase: 0, rate: 0.2 };
  assert.ok(near(cubeAngle(cube, 10), 2));
});

test('the field frame is orthonormal with y pointing away from the planet', () => {
  for (const down of [[0, -1, 0], [1, 0, 0], [0, 0, -1], [0.6, -0.8, 0]] as Vec3[]) {
    const { x, y, z } = fieldBasis(down);
    for (const v of [x, y, z]) assert.ok(near(dot(v, v), 1));
    assert.ok(near(dot(x, y), 0) && near(dot(y, z), 0) && near(dot(x, z), 0));
    assert.ok(near(dot(y, down), -1));
  }
  const p = toWorld([10, 0, 0], fieldBasis([0, -1, 0]), [0, 5, 0]);
  assert.deepEqual(p.map((v) => Math.round(v * 1e9) / 1e9), [10, 5, 0]);
});

test('the chamber hull is a cube that encloses the chamber with a margin', () => {
  const bounds = { min: [-6, -6, -1] as Vec3, max: [6, 6, 61] as Vec3 };
  const { center, size } = chamberHull(bounds, 1);
  assert.deepEqual(center, [0, 0, 30]);
  assert.equal(size, 64);
  for (let i = 0; i < 3; i++) {
    assert.ok(center[i] - size / 2 <= bounds.min[i] - 1 + 1e-9);
    assert.ok(center[i] + size / 2 >= bounds.max[i] + 1 - 1e-9);
  }
});
