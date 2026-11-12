import { axisVec } from '../gravity/axes.ts';
import type { GravityAxis, Vec3 } from '../gravity/axes.ts';
import { random } from '../random.ts';

/**
 * Babylon-free maths for text painted on a chamber face (see NARRATIVE.md): how big a placard is, how its texture is
 * sized, which way it faces and reads, and the wobble of handwritten notes. Tested directly by Node.
 */

/** The facility's stencilled placards, or the Margin's handwritten notes. */
export type Voice = 'stencil' | 'margin';

/** Default line height in world units. */
export const LINE_HEIGHT: Record<Voice, number> = { stencil: 0.55, margin: 0.5 };
/** Blank border around the text, in world units. */
export const PADDING = 0.2;
/** Texture resolution, and the cap on either side of the texture. */
export const PX_PER_UNIT = 96;
export const MAX_TEXTURE = 2048;
/** How far a placard sits off its face, so it never fights the wall for depth. */
export const SURFACE_OFFSET = 0.01;

export interface PlacardSize {
  lines: string[];
  width: number;
  height: number;
  lineHeight: number;
}

/**
 * A placard's size in world units. Lines break only where the text has a newline; a line too long for `width` is
 * squeezed to fit when drawn, so the size never depends on the font.
 */
export function placardSize(text: string, width: number, voice: Voice, lineHeight = LINE_HEIGHT[voice]): PlacardSize {
  const lines = text.split('\n');
  return { lines, width, height: lines.length * lineHeight + PADDING * 2, lineHeight };
}

/** Texture size in pixels for a placard of the given size, and the pixels per world unit actually used. */
export function texturePixels(width: number, height: number): { w: number; h: number; scale: number } {
  const scale = Math.min(PX_PER_UNIT, MAX_TEXTURE / Math.max(width, height));
  return { w: Math.max(1, Math.round(width * scale)), h: Math.max(1, Math.round(height * scale)), scale };
}

export interface PlacardFrame {
  /** Reading direction along a line of text. */
  right: Vec3;
  /** Towards the top of the text. */
  up: Vec3;
  /** Into the face (the placard's back), i.e. the opposite of the face's outward normal. */
  forward: Vec3;
}

/**
 * Orients text on the face with outward `normal` so it reads upright under gravity `readAs`. On a wall (gravity
 * along the face) the top of the text points against gravity. On a face that is the floor or the ceiling under
 * `readAs`, there is no "up", so `top` must say which way along the face the top of the text points.
 */
export function placardFrame(normal: Readonly<Vec3>, readAs: GravityAxis, top?: Readonly<Vec3>): PlacardFrame {
  if (!isAxis(normal)) throw new Error(`placard normal ${normal} is not a unit axis`);
  const g = axisVec(readAs);
  let up: Vec3;
  if (dot(g, normal) === 0) {
    up = [-g[0], -g[1], -g[2]];
  } else {
    if (!top) throw new Error(`a placard on the floor or ceiling under ${readAs} needs a top direction`);
    if (!isAxis(top) || dot(top, normal) !== 0)
      throw new Error(`placard top ${top} must be a unit axis along the face`);
    up = [top[0], top[1], top[2]];
  }
  const forward: Vec3 = [-normal[0], -normal[1], -normal[2]];
  return { right: cross(up, forward), up, forward };
}

/** The placard's corners in world space: centre `at`, size `width` x `height` in `frame`. */
export function placardCorners(at: Readonly<Vec3>, frame: PlacardFrame, width: number, height: number): Vec3[] {
  const out: Vec3[] = [];
  for (const [sx, sy] of [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ]) {
    const p: Vec3 = [0, 0, 0];
    for (let i = 0; i < 3; i++) p[i] = at[i] + (frame.right[i] * sx * width) / 2 + (frame.up[i] * sy * height) / 2;
    out.push(p);
  }
  return out;
}

export interface Glyph {
  /** Rotation in radians. */
  angle: number;
  /** Offsets as fractions of the line height. */
  dx: number;
  dy: number;
  /** Ink pressure, 0.7-1. */
  ink: number;
}

/** The hand-drawn wobble of each character of a note: the same text always wobbles the same way. */
export function handwriting(seed: number, count: number): Glyph[] {
  const rand = random(seed);
  const glyphs: Glyph[] = [];
  // A slow drift of the baseline across the line, plus a little per-letter jitter.
  let drift = (rand() - 0.5) * 0.06;
  for (let i = 0; i < count; i++) {
    drift = drift * 0.85 + (rand() - 0.5) * 0.03;
    glyphs.push({
      angle: (rand() - 0.5) * 0.14,
      dx: (rand() - 0.5) * 0.03,
      dy: drift + (rand() - 0.5) * 0.03,
      ink: 0.7 + rand() * 0.3,
    });
  }
  return glyphs;
}

function isAxis(v: Readonly<Vec3>): boolean {
  const nonZero = v.filter((c) => c !== 0);
  return nonZero.length === 1 && Math.abs(nonZero[0]) === 1;
}

function dot(a: Readonly<Vec3>, b: Readonly<Vec3>): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function cross(a: Readonly<Vec3>, b: Readonly<Vec3>): Vec3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]] as Vec3;
}
