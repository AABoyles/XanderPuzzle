/**
 * Chamber progress: which chambers are unlocked and how best times read.
 * Free of Babylon (and of `localStorage` itself) so Node can test it directly.
 */

/** The numeric key/value store `main.ts` keeps in `localStorage` under `shiftbound.`. */
export interface NumberStore {
  get(key: string): number | undefined;
  set(key: string, value: number): void;
}

/**
 * The highest chamber index the player has completed, or -1 for none. Reads the `cleared` key, and also infers
 * progress saved before that key existed: any `best.<i>` time means chamber i was completed, and resuming at
 * chamber `level` means every chamber before it was.
 */
export function furthestCleared(store: NumberStore, total: number): number {
  let furthest = -1;
  const cleared = store.get('cleared');
  if (cleared !== undefined && Number.isFinite(cleared)) furthest = Math.floor(cleared);
  const level = store.get('level');
  if (level !== undefined && Number.isFinite(level)) furthest = Math.max(furthest, Math.floor(level) - 1);
  for (let i = 0; i < total; i++) {
    if (isTime(store.get(`best.${i}`))) furthest = Math.max(furthest, i);
  }
  return Math.min(Math.max(furthest, -1), total - 1);
}

/** Chambers up to the furthest completed, plus the next one, are playable. */
export function isUnlocked(index: number, furthest: number, unlockAll = false): boolean {
  return unlockAll || index <= furthest + 1;
}

/** Records that chamber `index` was completed, never moving progress backwards. */
export function recordCleared(store: NumberStore, index: number, total: number): void {
  if (index > furthestCleared(store, total)) store.set('cleared', index);
}

/** A best time as shown in the chamber list. */
export function formatBest(seconds: number | undefined): string {
  return isTime(seconds) ? `${seconds.toFixed(1)}s` : 'not completed';
}

function isTime(v: number | undefined): v is number {
  return v !== undefined && Number.isFinite(v) && v >= 0;
}
