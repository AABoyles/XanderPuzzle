// Babylon-free: whether the levers can still get the player to the exit's gravity. Tested by Node.
import type { GravityAxis } from '../gravity/axes';

/** What the check needs to know about a lever: where it would take gravity from a given axis (null: nowhere). */
export interface LeverMoves {
  targetFor(current: GravityAxis): GravityAxis | null;
  /** A sequence lever's whole cycle. */
  cycle?: GravityAxis[];
}

/**
 * Every gravity axis the levers can still reach from `start` (including `start`).
 *
 * This is a lever-only check. It treats an unspent one-shot lever as usable from any reachable axis, so it can only err
 * towards "not stuck". It does not know where the player can walk, nor whether crates can still reach their plates.
 */
export function reachableAxes(start: GravityAxis, levers: LeverMoves[]): Set<GravityAxis> {
  const reachable = new Set<GravityAxis>([start]);
  for (let grew = true; grew;) {
    grew = false;
    for (const lever of levers) {
      const targets = lever.cycle ?? [...reachable].map((a) => lever.targetFor(a));
      for (const t of targets) {
        if (t && !reachable.has(t)) {
          reachable.add(t);
          grew = true;
        }
      }
    }
  }
  return reachable;
}

/** True when `exit` can no longer be reached from `current` with the levers as they are now (see `reachableAxes`). */
export function leversExhausted(current: GravityAxis, exit: GravityAxis, levers: LeverMoves[]): boolean {
  return !reachableAxes(current, levers).has(exit);
}
