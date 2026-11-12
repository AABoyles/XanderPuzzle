import { chamberHull, fieldBasis } from '../environment/ballastField.ts';
import type { Vec3 } from '../environment/fall';
import type { Aabb } from '../physics/boxPhysics';

/**
 * Babylon-free maths of the title's outside view (`TitleView`): where the camera stands round the chamber's cube, what
 * it looks at and where the star is drawn. Tested directly by Node.
 */

/** How far the camera stands off the chamber's hull centre. */
export const TITLE_STANDOFF = 200;
/** How far the planet sits from the camera. */
export const TITLE_PLANET = 225;
/** How far the Crown hangs above the chamber. */
export const TITLE_CROWN = 120;

export interface TitleShot {
  /** Camera world position. */
  position: Vec3;
  /** Camera up: the field's `y` axis, pointing away from the planet. */
  up: Vec3;
  /** The point the camera looks at: the anchor lifted above the cube. */
  target: Vec3;
  /** The chamber's hull centre: what the backdrop is anchored on. */
  anchor: Vec3;
  /** Unit direction from the camera to the star. */
  sun: Vec3;
}

/**
 * The title's shot for a chamber with `bounds`, with the planet in direction `planetDir` from the cube, at drift time
 * `time` (seconds, the camera slowly circles the cube as this grows).
 */
export function titleShotFrame(bounds: Aabb, planetDir: Readonly<Vec3>, time: number): TitleShot {
  // Stand off to one side of the cube, a little above its middle, and drift slowly around it.
  const hull = chamberHull(bounds);
  const anchor: Vec3 = [hull.center[0], hull.center[1], hull.center[2]];
  const axes = fieldBasis(planetDir);
  const a = 0.6 + 0.16 * Math.sin(time * 0.08);
  const position: Vec3 = [0, 0, 0];
  for (let k = 0; k < 3; k++) {
    position[k] =
      hull.center[k] + (axes.x[k] * Math.cos(a) + axes.z[k] * Math.sin(a)) * TITLE_STANDOFF + axes.y[k] * 12;
  }
  const up = axes.y;
  const target: Vec3 = [0, 0, 0];
  for (let k = 0; k < 3; k++) target[k] = anchor[k] + up[k] * 47;
  // From the side the star cannot be both straight above the Crown and in the picture, so here it is drawn where the
  // eye expects it: beyond the Crown, on the line up from the planet through the cube.
  const sun: Vec3 = [0, 0, 0];
  for (let k = 0; k < 3; k++) sun[k] = anchor[k] + up[k] * (TITLE_CROWN + 70) - position[k];
  const len = Math.sqrt(sun[0] * sun[0] + sun[1] * sun[1] + sun[2] * sun[2]);
  if (len !== 0 && len !== 1) {
    const s = 1 / len;
    for (let k = 0; k < 3; k++) sun[k] *= s;
  }
  return { position, up: [up[0], up[1], up[2]], target, anchor, sun };
}
