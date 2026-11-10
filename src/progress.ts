/**
 * Chamber progress: which chambers are cleared, best times and the resume point. Saved as one versioned JSON
 * document under `shiftbound.progress`, keyed by stable chamber id rather than position. Free of Babylon (and of
 * `localStorage` itself) so Node can test it directly.
 */

export const PROGRESS_KEY = 'shiftbound.progress';
export const PROGRESS_VERSION = 2;
/** Keys written by the original index-keyed format (all under the `shiftbound.` prefix). */
const LEGACY_PREFIX = 'shiftbound.';
const LEGACY_KEYS = ['level', 'cleared'];

export interface Progress {
  version: number;
  /** Ids of completed chambers. */
  cleared: string[];
  /** Best time in seconds per chamber id. */
  best: Record<string, number>;
  /** The chamber to resume at, if any. */
  resume?: string;
}

/** A minimal slice of `localStorage`, so tests can fake it. */
export interface ProgressStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const emptyProgress = (): Progress => ({ version: PROGRESS_VERSION, cleared: [], best: {} });

function isTime(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0;
}

/** Turns anything (parsed JSON, garbage, null) into valid progress, dropping bad fields. Unknown ids are kept. */
export function parseProgress(raw: unknown): Progress {
  const out = emptyProgress();
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return out;
  const r = raw as Record<string, unknown>;
  if (Array.isArray(r.cleared)) {
    for (const id of r.cleared) if (typeof id === 'string' && !out.cleared.includes(id)) out.cleared.push(id);
  }
  if (typeof r.best === 'object' && r.best !== null && !Array.isArray(r.best)) {
    for (const [id, t] of Object.entries(r.best)) if (isTime(t)) out.best[id] = t;
  }
  if (typeof r.resume === 'string') out.resume = r.resume;
  return out;
}

function readLegacyNumber(storage: ProgressStorage, key: string): number | undefined {
  const raw = storage.getItem(LEGACY_PREFIX + key);
  if (raw === null || raw.trim() === '') return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Converts the old index-keyed saves (`level`, `cleared`, `best.<i>`) using `ids` as the chamber order they were
 * written against. The old inference rules apply once here: a `best.<i>` time means chamber i was completed, and
 * resuming at chamber `level` means every chamber before it was.
 */
export function migrateLegacy(storage: ProgressStorage, ids: readonly string[]): Progress {
  const out = emptyProgress();
  const cleared = new Set<number>();
  const cl = readLegacyNumber(storage, 'cleared');
  if (cl !== undefined) for (let i = 0; i <= Math.min(Math.floor(cl), ids.length - 1); i++) cleared.add(i);
  const level = readLegacyNumber(storage, 'level');
  if (level !== undefined) {
    const l = Math.floor(level);
    for (let i = 0; i < Math.min(l, ids.length); i++) cleared.add(i);
    if (l >= 0 && l < ids.length) out.resume = ids[l];
  }
  ids.forEach((id, i) => {
    const t = readLegacyNumber(storage, `best.${i}`);
    if (t !== undefined && isTime(t)) {
      out.best[id] = t;
      cleared.add(i);
    }
  });
  out.cleared = ids.filter((_, i) => cleared.has(i));
  return out;
}

function removeLegacy(storage: ProgressStorage, total: number): void {
  for (const key of LEGACY_KEYS) storage.removeItem(LEGACY_PREFIX + key);
  // Old saves can't hold more `best.<i>` keys than there were chambers; sweep generously.
  for (let i = 0; i < Math.max(total, 64); i++) storage.removeItem(`${LEGACY_PREFIX}best.${i}`);
}

/**
 * Reads progress. If no versioned document exists, migrates any old index-keyed keys once (writing the new
 * document and removing the old keys), so later loads never re-read them. Unavailable storage, missing or corrupt
 * data all give empty progress.
 */
export function loadProgress(storage: ProgressStorage | null | undefined, ids: readonly string[]): Progress {
  if (!storage) return emptyProgress();
  try {
    const text = storage.getItem(PROGRESS_KEY);
    if (text) {
      try {
        return parseProgress(JSON.parse(text));
      } catch {
        return emptyProgress();
      }
    }
    const migrated = migrateLegacy(storage, ids);
    if (migrated.cleared.length || migrated.resume !== undefined || Object.keys(migrated.best).length) {
      if (saveProgress(storage, migrated)) removeLegacy(storage, ids.length);
    }
    return migrated;
  } catch {
    return emptyProgress();
  }
}

/** Writes progress; returns false (without throwing) if storage is unavailable or full. */
export function saveProgress(storage: ProgressStorage | null | undefined, progress: Progress): boolean {
  try {
    if (!storage) return false;
    storage.setItem(PROGRESS_KEY, JSON.stringify({ ...progress, version: PROGRESS_VERSION }));
    return true;
  } catch {
    return false;
  }
}

/** Erases all saved progress and best times (and any old-format keys); returns the empty progress. */
export function resetProgress(storage: ProgressStorage | null | undefined): Progress {
  try {
    if (storage) {
      storage.removeItem(PROGRESS_KEY);
      removeLegacy(storage, 0);
      for (const key of LEGACY_KEYS) storage.removeItem(LEGACY_PREFIX + key);
    }
  } catch {
    /* storage is optional */
  }
  return emptyProgress();
}

/** Where the player resumes: the saved chamber's current index, or 0 if unset or no longer present. */
export function resumeIndex(progress: Progress, ids: readonly string[]): number {
  const i = progress.resume === undefined ? -1 : ids.indexOf(progress.resume);
  return i < 0 ? 0 : i;
}

export function setResume(progress: Progress, id: string): void {
  progress.resume = id;
}

/** The highest chamber index (in the current order) that has been completed, or -1 for none. */
export function furthestCleared(progress: Progress, ids: readonly string[]): number {
  let furthest = -1;
  ids.forEach((id, i) => {
    if (progress.cleared.includes(id) || isTime(progress.best[id])) furthest = i;
  });
  return furthest;
}

/** Chambers up to the furthest completed, plus the next one, are playable. */
export function isUnlocked(index: number, furthest: number, unlockAll = false): boolean {
  return unlockAll || index <= furthest + 1;
}

/** Records a completed run: marks the chamber cleared and keeps the better time. Returns whether it is a new best. */
export function recordWin(progress: Progress, id: string, seconds: number): boolean {
  if (!progress.cleared.includes(id)) progress.cleared.push(id);
  const best = progress.best[id];
  const isBest = !isTime(best) || seconds < best;
  if (isBest && isTime(seconds)) progress.best[id] = seconds;
  return isBest;
}

/** A best time as shown in the chamber list. */
export function formatBest(seconds: number | undefined): string {
  return isTime(seconds) ? `${seconds.toFixed(1)}s` : 'not completed';
}
