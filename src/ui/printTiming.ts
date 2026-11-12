/**
 * How long the print-in wipe lasts (see `HUD.printIn`). Babylon-free so Node can test it.
 */

/** The full wipe, in seconds. */
export const PRINT_IN = 0.85;
/** The wipe under reduced motion, in seconds (a plain fade). */
export const PRINT_IN_REDUCED = 0.45;
/** The wipe on a repeat start of the same chamber, in seconds: the attendant is printed again without the wait. */
export const PRINT_IN_QUICK = 0.3;

/**
 * The wipe's length. `repeats` counts the starts of the same chamber in a row before this one: 0 for a first start, so
 * a repeat (1 or more) is quick whatever the motion setting.
 */
export function printInDuration(reduced: boolean, repeats: number): number {
  if (repeats >= 1) return PRINT_IN_QUICK;
  return reduced ? PRINT_IN_REDUCED : PRINT_IN;
}
