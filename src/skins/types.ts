import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Material } from '@babylonjs/core/Materials/material';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { GravityAxis } from '../gravity/GravitySystem';

/**
 * A skin decides how level geometry, levers and the world around them look. Geometry is always
 * axis-aligned, so every face of every box is "the floor" under exactly one gravity axis: the
 * one pointing into it. Skins colour faces by that axis, which is what lets Axis match each
 * wall to the lever that makes it the floor.
 */

export type SkinId = 'neon' | 'axis' | 'monolith' | 'draft' | 'station';
/**
 * The order K cycles through. The chosen skin is stored as an index into this list, so only ever append: reordering
 * would change returning players' skins.
 */
export const SKIN_IDS: SkinId[] = ['axis', 'monolith', 'draft', 'neon', 'station'];
/** The skin a new player sees: the cubes as the metal machinery they are. */
export const DEFAULT_SKIN: SkinId = 'station';
export const SKIN_LABELS: Record<SkinId, string> = {
  station: 'STATION',
  neon: 'NEON',
  axis: 'AXIS',
  monolith: 'MONOLITH',
  draft: 'DRAFT',
};

/** What a surface is for. `shell` is the outer walls of rooms; `feature` is anything inside. */
export type SurfaceRole = 'shell' | 'feature' | 'alcove' | 'exit';

/** Order used for per-face sub-materials. */
export const AXIS_ORDER: GravityAxis[] = ['+X', '-X', '+Y', '-Y', '+Z', '-Z'];

/** How the facility's stencilled placards are painted in a skin (the Margin's notes look the same in every skin). */
export interface PlacardInk {
  /** CSS colour of the paint. */
  color: string;
  /** Lettering drawn as an outline instead of filled. */
  outline: boolean;
  /** Paint flaked off in places. */
  weathered: boolean;
  /** Self-lit, so it glows rather than taking the scene's light. */
  glow: boolean;
}

export interface SkinRuntime {
  readonly id: SkinId;
  /** How stencilled placards are painted. */
  readonly placardInk: PlacardInk;
  /** One material per gravity axis, in AXIS_ORDER. `accent` is the level's signature colour. */
  materials(role: SurfaceRole, accent: Color3): Material[];
  /** World units covered by one repeat of the surface texture. */
  readonly textureScale: number;
  leverColor(axis: GravityAxis): Color3;
  /** HUD text colour for the current gravity, as a CSS colour. */
  hudColor(axis: GravityAxis): string;
  /** Hook for each level mesh after it is built (shadows, outlines). */
  decorate(mesh: Mesh, role: SurfaceRole): void;
  /** Hook for lever and prop meshes. */
  decorateProp(mesh: Mesh): void;
  dispose(): void;
}
