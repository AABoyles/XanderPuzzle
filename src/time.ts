/**
 * Frame timing. Babylon-free so Node can test it.
 */

/**
 * The longest simulated step, in seconds. Matches the player's own 1/20 s clamp, so after a hitch (or a hidden tab)
 * every system advances by the same bounded amount instead of each handling the gap differently.
 */
export const MAX_SIM_DELTA = 1 / 20;

/** Turns a raw frame time in seconds into a finite step in `[0, max]`; NaN, infinite and negative input give 0. */
export function simDelta(rawSeconds: number, max: number = MAX_SIM_DELTA): number {
  if (!Number.isFinite(rawSeconds) || rawSeconds <= 0) return 0;
  return Math.min(rawSeconds, max);
}
