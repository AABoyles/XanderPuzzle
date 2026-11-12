/**
 * The colour-blind palette for the six gravity axes, from the Okabe-Ito set (designed to stay distinct under the common
 * forms of colour vision deficiency). Babylon-free so Node can test it directly.
 *
 * The two directions of one axis get clearly different hues (+X orange, -X sky blue), so a player can tell +X from -X.
 * Orange (+X) and vermillion (+Z) are both warm; they sit on different axes and differ in lightness.
 */
import type { GravityAxis } from '../gravity/GravitySystem';

export type Rgb = [number, number, number];

/** Okabe-Ito values as 0-255 integers, divided into the 0-1 range used everywhere else. */
const rgb = (r: number, g: number, b: number): Rgb => [r / 255, g / 255, b / 255];

export const COLOR_ASSIST_AXIS: Record<GravityAxis, Rgb> = {
  '+X': rgb(230, 159, 0), // orange
  '-X': rgb(86, 180, 233), // sky blue
  '+Y': rgb(240, 228, 66), // yellow
  '-Y': rgb(0, 114, 178), // blue
  '+Z': rgb(213, 94, 0), // vermillion
  '-Z': rgb(0, 158, 115), // bluish green
};

/** WCAG relative luminance of an sRGB colour with channels in 0-1 (0 for black, 1 for white). */
export function relativeLuminance([r, g, b]: Rgb): number {
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}
