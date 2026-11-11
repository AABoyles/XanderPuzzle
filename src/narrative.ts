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

/** The earlier attendant who wrote the Margin's notes, and the serial on the reveal crate: one below the player's. */
export const PREDECESSOR = 'AT-0416';

/** How the Margin signs a note: the last three digits of its serial. */
export const MARGIN_SIGN = `\u2014 ${PREDECESSOR.slice(-3)}`;

/** Logged when a chamber starts: every attendant is printed at the cube's entrance. */
export const dutyLine = (serial: string): string =>
  `${cubeLabel(serial)} · ATTENDANT ${ATTENDANT} PRINTED · ON DUTY`;

/**
 * Logged when an attendant who fell out of the cube is replaced at the entrance. `count` counts this session's.
 * "Recovery" is the facility's word for printing a replacement, and this line is where it says so.
 */
export const recoveryLine = (count: number): string =>
  `ATTENDANT LOST. REPLACEMENT PRINTED. RECOVERIES THIS CYCLE: ${count}.`;

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

/** The win screen's report of what the exit does to the attendant. */
export const RECLAIMED = 'ATTENDANT RECLAIMED.';

/** The win screen's report of what setting a cube does. */
export const CROWN_BALANCED = 'CROWN LOAD BALANCED.';

/** The win screen's stats and next instruction, without the input prompts. */
export function workLog({ time, best, shifts, next }: WorkLog): string {
  const record = best === undefined || time < best ? 'NEW RECORD' : `RECORD ${best.toFixed(1)}s`;
  const stats = `${shifts} SHIFT${shifts === 1 ? '' : 'S'} LOGGED · ${time.toFixed(1)}s (${record})`;
  // The exit is a reclaimer: the attendant does not travel to the next cube, it is printed there.
  const instruction =
    next === undefined ? 'THANK YOU FOR YOUR CONTINUED ALIGNMENT.' : `${RECLAIMED} REPRINT AT ${cubeLabel(next)}.`;
  // What the work was for: every cube set is a counterweight back in place under the Crown.
  return `${stats}\n${CROWN_BALANCED}\n${instruction}`;
}

/**
 * Logged when a storm comes off the star while the Crown is in view: what the Crown is for, in the facility's words.
 * `responding` is the share of the field still keeping its schedule (0-1), which is all the shield has to stand on.
 */
export const stormLine = (responding: number): string =>
  `STELLAR STORM. CROWN SHIELD HOLDING AT ${Math.round(100 * responding)}%.`;

/** Logged when a crate falls out of the cube through a hole. Nothing replaces it. */
export const MASS_RELEASED = 'BALLAST MASS RELEASED. REPLACEMENT NOT SCHEDULED.';

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

/**
 * The facility's alarm for the `n`th lever thrown (from 0) in the Descent, cube `serial`; later throws repeat the last.
 * The last one says what the player has just done: a cube out of trim leaves the schedule, and its printer stops, so
 * the fall out of it is the first one nobody is printed back from.
 */
export function descentAlarm(n: number, serial: string): string {
  const alarms = [
    'ATTENDANT, THIS SHIFT IS NOT ON SCHEDULE. PLEASE RETURN TO YOUR STATION.',
    `${cubeLabel(serial)} OUT OF TRIM · REMOVED FROM SCHEDULE · PRINTER OFFLINE. RECOVERY SUSPENDED.`,
  ];
  return alarms[Math.min(Math.max(n, 0), alarms.length - 1)];
}

/** How many levers it takes to put the Descent's cube out of trim: from then on its printer is off. */
export const DESCENT_OUT_OF_TRIM = 2;

/** The end card's first line, logged as the final fall ends. */
export const NOT_RECOVERED = 'ATTENDANT NOT RECOVERED.';

/**
 * The end card's body, before the game's name and the input prompt: the cube the attendant left has gone dark like
 * the others, and there is one more light on the planet.
 */
export const endCard = (recoveries: number, serial?: string): string =>
  [
    ...(serial === undefined ? [] : [`${cubeLabel(serial)} DARK.`]),
    `RECOVERIES THIS CYCLE: ${recoveries}`,
    'LIGHTS ON THE SURFACE: ONE MORE.',
  ].join('\n');
