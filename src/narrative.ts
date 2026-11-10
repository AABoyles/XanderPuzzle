/**
 * The facility's voice (the Stencil, see NARRATIVE.md): the serial numbers and log lines the HUD shows. Babylon-free so
 * Node can test it. The Stencil is deadpan and procedural, and it never acknowledges that anything is wrong.
 */

/** The player's serial number. Fixed: the reveal crate in NARRATIVE.md is stamped one below it. */
export const ATTENDANT = 'AT-0417';

/** A cube serial is four digits. They are display text, not save keys, so they can change freely. */
export const CUBE_SERIAL = /^\d{4}$/;

/** `CUBE 0112`. */
export const cubeLabel = (serial: string): string => `CUBE ${serial}`;

/** Logged when a chamber starts. */
export const dutyLine = (serial: string): string => `${cubeLabel(serial)} · ATTENDANT ${ATTENDANT} ON DUTY`;

/** Logged when an attendant who fell out of the cube is replaced at the entrance. `count` counts this session's. */
export const recoveryLine = (count: number): string =>
  `ATTENDANT RECOVERED. RECOVERIES THIS CYCLE: ${count}.`;

export interface WorkLog {
  /** Simulated seconds spent in the cube. */
  time: number;
  /** The previous best, if there is one. */
  best?: number;
  shifts: number;
  /** The next cube's serial, or undefined when this was the last cube. */
  next?: string;
}

/** The win screen's title: `CUBE 0112 SET`, or the end of the schedule. */
export const winTitle = (serial: string, last: boolean): string =>
  last ? 'SCHEDULE COMPLETE' : `${cubeLabel(serial)} SET`;

/** The win screen's stats and next instruction, without the input prompts. */
export function workLog({ time, best, shifts, next }: WorkLog): string {
  const record = best === undefined || time < best ? 'NEW RECORD' : `RECORD ${best.toFixed(1)}s`;
  const stats = `${shifts} SHIFT${shifts === 1 ? '' : 'S'} LOGGED · ${time.toFixed(1)}s (${record})`;
  const instruction = next === undefined ? 'THANK YOU FOR YOUR CONTINUED ALIGNMENT.' : `PROCEED TO ${cubeLabel(next)}.`;
  return `${stats}\n${instruction}`;
}

/** The share of the ballast field gone dark, seen when falling from chamber `index` of `count`: it grows each chamber. */
export const darkFraction = (index: number, count: number): number =>
  0.15 + 0.5 * Math.min(Math.max(index / Math.max(count - 1, 1), 0), 1);

/**
 * How lit the planet's night side is (0-1) when falling from chamber `index` of `count`: dark until chamber `from`
 * (the start of Act III), then a few lights more each chamber, fully lit at the last. Someone is down there.
 */
export function planetLights(index: number, from: number, count: number): number {
  if (from < 0 || index < from) return 0;
  return Math.min(1, (index - from + 1) / Math.max(count - from, 1));
}

/** The facility's alarm for the `n`th lever thrown (from 0) in the Descent, cube `serial`; later throws repeat the last. */
export function descentAlarm(n: number, serial: string): string {
  const alarms = [
    'ATTENDANT, THIS SHIFT IS NOT ON SCHEDULE.',
    `${cubeLabel(serial)} OUT OF TRIM. PLEASE RETURN TO YOUR STATION.`,
  ];
  return alarms[Math.min(Math.max(n, 0), alarms.length - 1)];
}

/** The end card's first line, logged as the final fall ends. */
export const NOT_RECOVERED = 'ATTENDANT NOT RECOVERED.';

/** The end card's body, under the game's name, before the input prompt. */
export const endCard = (recoveries: number): string => `RECOVERIES THIS CYCLE: ${recoveries}`;
