/**
 * Babylon-free (and Web Audio-free) description of the game's recorded sounds and the maths that drives them, so
 * Node can test it. The files are in `public/audio/` (all CC0; sources and processing in `public/audio/CREDITS.md`),
 * and `AudioEngine.ts` plays them.
 */

/** One recorded effect: its files (a random one plays each time) and how loud it is at full strength. */
export interface SoundSpec {
  files: readonly string[];
  gain: number;
  /** Playback rate is varied by up to this fraction each time, so repeats do not sound stamped out. */
  vary: number;
}

export const SOUNDS = {
  /** The printer: a coil's spark building to one hard crack, as the attendant is made. */
  print: { files: ['print.mp3'], gain: 0.5, vary: 0.04 },
  /** The same recording backwards: the reclaimer taking the attendant apart. */
  reclaim: { files: ['reclaim.mp3'], gain: 0.5, vary: 0.04 },
  /** The cube's hull taking the strain as it turns to a new floor. */
  creak: { files: ['creak1.mp3', 'creak2.mp3', 'creak3.mp3'], gain: 0.55, vary: 0.1 },
  /** A ballast mass coming to rest against a wall. */
  impact: { files: ['impact1.mp3', 'impact2.mp3', 'impact3.mp3'], gain: 0.9, vary: 0.08 },
  /** The attendant's own landing. */
  land: { files: ['land.mp3'], gain: 0.45, vary: 0.08 },
} as const satisfies Record<string, SoundSpec>;

export type SoundName = keyof typeof SOUNDS;

/** The music: one long dark drone, looped. The loop points skip the MP3 encoder's padding at either end. */
export const MUSIC = { file: 'ambient.mp3', gain: 0.5, loopStart: 0.06, loopEndTrim: 0.06 } as const;

/** Every audio file the game loads, relative to `public/audio/`. */
export const AUDIO_FILES: readonly string[] = [
  MUSIC.file,
  ...Object.values(SOUNDS).flatMap((s) => s.files as readonly string[]),
];

/** Crates slower than this make no sound when they stop; `IMPACT_FULL` and faster is full volume. */
export const IMPACT_QUIET = 4;
export const IMPACT_FULL = 26;

/** How loud (0-1) a crate's impact is, from its speed when it hit. */
export function impactGain(speed: number): number {
  if (!(speed > IMPACT_QUIET)) return 0;
  const t = Math.min(1, (speed - IMPACT_QUIET) / (IMPACT_FULL - IMPACT_QUIET));
  return 0.25 + 0.75 * t;
}

/**
 * How strongly the air is rushing past (0-1) `progress` of the way through a fall (0 at the escape, 1 at its end):
 * silence in the vacuum by the cube, then air that thickens faster and faster on the way down.
 */
export function windLevel(progress: number): number {
  const t = Math.min(Math.max(progress, 0), 1);
  return t * t * (3 - 2 * t) * (0.25 + 0.75 * t);
}

/** The wind's low-pass cutoff in Hz at `level`: a low moan at first, opening into a roar. */
export function windCutoff(level: number): number {
  const t = Math.min(Math.max(level, 0), 1);
  return 180 * Math.pow(18, t);
}

/** The wind's gain at `level`. */
export function windGain(level: number): number {
  const t = Math.min(Math.max(level, 0), 1);
  return 0.55 * Math.pow(t, 1.4);
}

/** Picks one of `count` variants from a random number in [0, 1). */
export function pickVariant(count: number, rand: number): number {
  return Math.min(count - 1, Math.max(0, Math.floor(rand * count)));
}
