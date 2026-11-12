import { specFromHash } from '../level/specCodec';

/**
 * What the page was opened with: the URL's flags, and whether this browser will store anything. Read once, when the
 * page loads; `main.ts` and the modules it wires up import them from here.
 */
export const params = new URLSearchParams(location.search);

/** A shared chamber's encoded spec, from a link ending `#c=...` (see `src/level/specCodec.ts`). Not yet decoded. */
export const sharedSpec = specFromHash(location.hash);

/**
 * `?sandbox` loads the physics test room instead of the chambers, and a shared chamber link loads that one chamber: both
 * are a single room outside the catalog, with no progress, hints, serials or chamber select.
 */
export const sandbox = params.has('sandbox') || sharedSpec !== undefined;

/** Whether `localStorage` works here (it can be blocked or full). */
export const storageAvailable = (() => {
  try {
    localStorage.setItem('shiftbound.probe', '1');
    localStorage.removeItem('shiftbound.probe');
    return true;
  } catch {
    return false;
  }
})();

/** Without storage there is no progress to gate on, so every chamber is open; `?unlockall` does the same for playtests. */
export const unlockAll = params.has('unlockall') || !storageAvailable;

/** `?playtest` records each chamber visit for the designer (src/playtest.ts). Not in the sandbox. */
export const playtesting = params.has('playtest') && !sandbox;

/** Small numbers kept under `shiftbound.<key>` (the skin choice). Storage is optional: a failure is silent. */
export const store = {
  get(key: string): number | undefined {
    try {
      const v = localStorage.getItem(`shiftbound.${key}`);
      const n = v === null || v.trim() === '' ? NaN : Number(v);
      return Number.isFinite(n) ? n : undefined;
    } catch {
      return undefined;
    }
  },
  set(key: string, value: number): void {
    try {
      localStorage.setItem(`shiftbound.${key}`, String(value));
    } catch {
      /* storage is optional */
    }
  },
};
