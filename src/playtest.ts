/**
 * The playtest log: what happened in each chamber visit, recorded only under `?playtest`. The log stays in this
 * browser (`shiftbound.playtest`) until the player saves it from the pause menu as a JSON file. Nothing is sent
 * anywhere. Free of Babylon (and of `localStorage` itself) so Node can test it directly.
 */

export const PLAYTEST_KEY = 'shiftbound.playtest';
export const PLAYTEST_VERSION = 1;

export interface ChamberVisit {
  /** Chamber id from `CHAMBERS`. */
  id: string;
  /** ISO time the visit began. */
  startedAt: string;
  /** Simulated seconds spent in the chamber, across restarts. */
  seconds: number;
  /** Gravity shifts, all attempts. */
  shifts: number;
  /** Restarts by the player (R or the pause menu). */
  restarts: number;
  /** Falls out of the cube, each of which restarted the chamber. */
  falls: number;
  undos: number;
  /** Times the no-trim notice fired. */
  stuckNotices: number;
  /** Highest hint tier shown; 0 if none. */
  hintTier: number;
  cleared: boolean;
  /** The winning attempt's time (the latest win, if the chamber was won again in the same visit). */
  clearSeconds?: number;
  /** The winning attempt's shift count. */
  clearShifts?: number;
}

export interface PlaytestLog {
  version: 1;
  startedAt: string;
  /** The last input device the tester used when the log began. */
  device: string;
  /** The skin the log began in. */
  skin: string;
  visits: ChamberVisit[];
}

/** A minimal slice of `localStorage`, for the storage helpers. */
interface PlaytestStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const isCount = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 0;
const isSeconds = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0;

/** Turns one parsed visit into a valid one, or null if it is not one. */
function parseVisit(raw: unknown): ChamberVisit | null {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== 'string' || typeof r.startedAt !== 'string') return null;
  if (!isSeconds(r.seconds) || !isCount(r.shifts) || !isCount(r.restarts) || !isCount(r.falls)) return null;
  if (!isCount(r.undos) || !isCount(r.stuckNotices) || !isCount(r.hintTier) || typeof r.cleared !== 'boolean') {
    return null;
  }
  const visit: ChamberVisit = {
    id: r.id,
    startedAt: r.startedAt,
    seconds: r.seconds,
    shifts: r.shifts,
    restarts: r.restarts,
    falls: r.falls,
    undos: r.undos,
    stuckNotices: r.stuckNotices,
    hintTier: r.hintTier,
    cleared: r.cleared,
  };
  if (isSeconds(r.clearSeconds)) visit.clearSeconds = r.clearSeconds;
  if (isCount(r.clearShifts)) visit.clearShifts = r.clearShifts;
  return visit;
}

/**
 * Turns anything (parsed JSON, garbage, null) into a valid log, or null if it is not one at all. A wrong version or
 * missing start time makes the whole log invalid; a malformed visit is dropped and the rest are kept.
 */
export function parsePlaytestLog(raw: unknown): PlaytestLog | null {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  if (r.version !== PLAYTEST_VERSION || typeof r.startedAt !== 'string') return null;
  if (!Array.isArray(r.visits)) return null;
  const visits: ChamberVisit[] = [];
  for (const v of r.visits) {
    const visit = parseVisit(v);
    if (visit) visits.push(visit);
  }
  return {
    version: PLAYTEST_VERSION,
    startedAt: r.startedAt,
    device: typeof r.device === 'string' ? r.device : 'unknown',
    skin: typeof r.skin === 'string' ? r.skin : 'unknown',
    visits,
  };
}

/** `m:ss`, the time shown in the summary. */
export function formatClock(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

/** The file name a saved log downloads as, from local time: `shiftbound-playtest-20261111-1430.json`. */
export function playtestFileName(now: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  const date = `${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}`;
  return `shiftbound-playtest-${date}-${p(now.getHours())}${p(now.getMinutes())}.json`;
}

/**
 * Records chamber visits. `enter` starts a visit unless the current one is already for that chamber, so a restart
 * continues it; the caller persists the log (see `toJSON`) at its own event sites.
 */
export class PlaytestRecorder {
  private readonly now: () => string;
  private log: PlaytestLog;
  private current: ChamberVisit | undefined;

  constructor(now: () => string) {
    this.now = now;
    this.log = { version: PLAYTEST_VERSION, startedAt: now(), device: 'unknown', skin: 'unknown', visits: [] };
  }

  /**
   * Starts a fresh log for this session, or continues `stored` (a log saved earlier in this browser) so a reload
   * keeps its visits.
   */
  public begin(device: string, skin: string, stored?: PlaytestLog): void {
    if (stored) {
      this.adopt(stored);
      return;
    }
    this.log = { version: PLAYTEST_VERSION, startedAt: this.now(), device, skin, visits: [] };
    this.current = undefined;
  }

  /** Continues the visits of `stored`: the last one stays current, so re-entering its chamber continues it. */
  public adopt(stored: PlaytestLog): void {
    this.log = { ...stored, visits: stored.visits.map((v) => ({ ...v })) };
    this.current = this.log.visits[this.log.visits.length - 1];
  }

  /** Empties the log, as the pause menu's clear does. Call `enter` again to track the chamber being played. */
  public reset(): void {
    this.log = { ...this.log, startedAt: this.now(), visits: [] };
    this.current = undefined;
  }

  /** The chamber the player is now in. A new visit unless the current one is already for `id`. */
  public enter(id: string): void {
    if (this.current?.id === id) return;
    this.current = {
      id,
      startedAt: this.now(),
      seconds: 0,
      shifts: 0,
      restarts: 0,
      falls: 0,
      undos: 0,
      stuckNotices: 0,
      hintTier: 0,
      cleared: false,
    };
    this.log.visits.push(this.current);
  }

  /** Adds `dt` simulated seconds to the current visit. */
  public tick(dt: number): void {
    if (this.current && Number.isFinite(dt) && dt > 0) this.current.seconds += dt;
  }

  public shift(): void {
    if (this.current) this.current.shifts++;
  }

  public restart(): void {
    if (this.current) this.current.restarts++;
  }

  public fall(): void {
    if (this.current) this.current.falls++;
  }

  public undo(): void {
    if (this.current) this.current.undos++;
  }

  public stuck(): void {
    if (this.current) this.current.stuckNotices++;
  }

  /** Records a hint tier shown; the visit keeps the highest. */
  public hint(tier: number): void {
    if (this.current && isCount(tier)) this.current.hintTier = Math.max(this.current.hintTier, tier);
  }

  /** The chamber is won: the latest win's time and shifts are kept on the visit. */
  public clear(seconds: number, shifts: number): void {
    if (!this.current) return;
    this.current.cleared = true;
    if (isSeconds(seconds)) this.current.clearSeconds = seconds;
    if (isCount(shifts)) this.current.clearShifts = shifts;
  }

  /** A copy of the log, ready to store or to pretty-print as the saved file. */
  public toJSON(): PlaytestLog {
    return { ...this.log, visits: this.log.visits.map((v) => ({ ...v })) };
  }

  /** A plain-text table of the visits, for pasting into notes. */
  public summary(): string {
    const rows = this.log.visits.map((v) => [
      v.id,
      formatClock(v.seconds),
      String(v.shifts),
      String(v.restarts),
      String(v.falls),
      String(v.undos),
      v.cleared ? 'yes' : 'no',
    ]);
    if (rows.length === 0) return 'No chamber visits recorded.';
    const head = ['chamber', 'time', 'shifts', 'restarts', 'falls', 'undos', 'cleared'];
    const widths = head.map((h, i) => Math.max(h.length, ...rows.map((r) => r[i].length)));
    const line = (cells: string[]) => cells.map((c, i) => c.padEnd(widths[i])).join('  ').trimEnd();
    return [line(head), ...rows.map(line)].join('\n');
  }
}

/** Reads the stored log; no storage (Node), missing or corrupt data all give null. */
export function loadPlaytest(): PlaytestLog | null {
  try {
    const storage = (globalThis as { localStorage?: PlaytestStorage }).localStorage;
    const text = storage?.getItem(PLAYTEST_KEY);
    return text ? parsePlaytestLog(JSON.parse(text)) : null;
  } catch {
    return null;
  }
}

/** Stores the log; returns false (without throwing) if storage is unavailable or full. */
export function savePlaytest(log: PlaytestLog): boolean {
  try {
    const storage = (globalThis as { localStorage?: PlaytestStorage }).localStorage;
    if (!storage) return false;
    storage.setItem(PLAYTEST_KEY, JSON.stringify(log));
    return true;
  } catch {
    return false;
  }
}
