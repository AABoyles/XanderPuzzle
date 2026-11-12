import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Vec3 } from '../src/environment/fall.ts';
import { titleShotFrame, TITLE_STANDOFF } from '../src/title/titleShot.ts';

// A chamber-sized box, off-centre so the hull centre is not the origin.
const bounds = { min: [-10, -6, -20] as Vec3, max: [14, 10, 4] as Vec3 };

function near(actual: Readonly<Vec3>, expected: Readonly<Vec3>, message: string) {
  for (let k = 0; k < 3; k++) assert.ok(Math.abs(actual[k] - expected[k]) < 1e-9, `${message}[${k}]: ${actual[k]}`);
}

test('the title shot with the planet below the cube (gravity -Y, up +Y)', () => {
  const shot = titleShotFrame(bounds, [0, -1, 0], 0);
  near(shot.anchor, [2, 2, -8], 'anchor');
  near(shot.up, [0, 1, 0], 'up');
  near(shot.target, [2, 49, -8], 'target');
  near(shot.position, [167.06712298193565, 14, 104.92849467900707], 'position');
  near(shot.sun, [-0.6165232601667359, 0.66482736433038, -0.4217862554788855], 'sun');
});

test('the title shot with the planet beyond the cube (gravity +Z, up -Z)', () => {
  const shot = titleShotFrame(bounds, [0, 0, 1], 0);
  near(shot.anchor, [2, 2, -8], 'anchor');
  near(shot.up, [0, 0, -1], 'up');
  near(shot.target, [2, 2, -55], 'target');
  near(shot.position, [167.06712298193565, 114.92849467900707, -20], 'position');
  near(shot.sun, [-0.6165232601667359, -0.4217862554788855, -0.66482736433038], 'sun');
});

test('the camera stands off the hull at the standoff distance and the sun is a unit vector', () => {
  for (const down of [
    [0, -1, 0],
    [0, 0, 1],
  ] as Vec3[]) {
    const shot = titleShotFrame(bounds, down, 3.7);
    const dx = shot.position[0] - shot.anchor[0];
    const dy = shot.position[1] - shot.anchor[1];
    const dz = shot.position[2] - shot.anchor[2];
    // The camera circles at the standoff in the plane of x and z, 12 units above it along up.
    const sideways = Math.hypot(dx, dy, dz);
    assert.ok(sideways > TITLE_STANDOFF && sideways < TITLE_STANDOFF + 13, `standoff ${sideways}`);
    const len = Math.hypot(shot.sun[0], shot.sun[1], shot.sun[2]);
    assert.ok(Math.abs(len - 1) < 1e-12, `sun length ${len}`);
  }
});

test('the camera drifts round the cube as time passes', () => {
  const a = titleShotFrame(bounds, [0, -1, 0], 0).position;
  const b = titleShotFrame(bounds, [0, -1, 0], 10).position;
  assert.notDeepEqual(a, b);
  // The same time gives the same shot: nothing is kept between calls.
  near(titleShotFrame(bounds, [0, -1, 0], 10).position, b, 'repeat');
});
