/** Half the player's width: the attendant is a ball of radius 0.5. */
const PLAYER_HALF = 0.5;

/** How long the attendant must stand on the reclaimer's plate before it takes them, in seconds. */
export const RECLAIM_HOLD = 0.4;

/**
 * Whether a player at `position` is touching the reclaimer plate's `trigger` box. Touching counts under any gravity:
 * the test is the player's box against the trigger, with no notion of down. Babylon-free.
 */
export function touchesPlate(
  position: { x: number; y: number; z: number },
  trigger: { min: readonly number[]; max: readonly number[] },
): boolean {
  const p = [position.x, position.y, position.z];
  return p.every((v, i) => v + PLAYER_HALF > trigger.min[i] && v - PLAYER_HALF < trigger.max[i]);
}
