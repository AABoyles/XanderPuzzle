import type { Engine } from '@babylonjs/core/Engines/engine';
import type { GlowLayer } from '@babylonjs/core/Layers/glowLayer';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { Scene } from '@babylonjs/core/scene';
import type { AudioEngine } from '../audio/AudioEngine';
import type { FallTracker } from '../environment/fall';
import type { SpaceBackdrop } from '../environment/SpaceBackdrop';
import type { ChamberSnapshot, SnapshotTargets } from '../game/chamberSnapshot';
import type { GameState } from '../game/GameState';
import type { UndoStack } from '../game/undo';
import type { GravityAxis, GravitySystem } from '../gravity/GravitySystem';
import { shiftTone } from '../gravity/shiftSound';
import type { HintLadder } from '../hints';
import type { GamepadInput } from '../input/GamepadInput';
import type { InputManager } from '../input/InputManager';
import type { KeyboardMouseInput } from '../input/KeyboardMouseInput';
import type { TouchInput } from '../input/TouchInput';
import type { BuiltLevel } from '../level/Builder';
import type { ChamberLoader } from '../level/chambers';
import { CHAMBERS } from '../level/chambers/catalog';
import type { CratePreview } from '../level/CratePreview';
import type { PlayerController } from '../player/PlayerController';
import { savePlaytest } from '../playtest';
import type { PlaytestRecorder } from '../playtest';
import { saveProgress } from '../progress';
import type { Progress, ProgressStorage } from '../progress';
import { canFullscreen, isIOS, isStandalone } from '../pwa/fullscreen';
import type { Settings, SettingsStorage } from '../settings';
import type { SkinRuntime } from '../skins/Skin';
import type { TitleView } from '../title/TitleView';
import type { HUD } from '../ui/HUD';
import type { PauseMenu } from '../ui/PauseMenu';
import type { ChamberSelect } from './ChamberSelect';
import { sandbox, storageAvailable, unlockAll } from './flags';
import type { Sky } from './Sky';

/**
 * The running game: every long-lived object and every piece of state that more than one module needs. It is built
 * once by `createApp` (bootstrap.ts) and handed to the functions in this folder, which is how they share it without
 * module-level variables.
 *
 * Rules that keep it from turning into a dumping ground:
 * - Only put a field here if two or more modules read or write it. State one module owns belongs in that module, or in
 *   a class of its own held here (`sky`, `hints`, `cratePreview`, `chamberSelect`, `undoStack`).
 * - No game-flow flags. Flow lives in `game` (`GameState`); modules send it events and react in its `onChange`.
 * - The first block is created once and never replaced. Only the fields in the later blocks are reassigned, and each
 *   says who does it.
 */
export interface App {
  // --- Created once ----------------------------------------------------------------------------------
  readonly canvas: HTMLCanvasElement;
  readonly engine: Engine;
  readonly scene: Scene;
  readonly glow: GlowLayer;
  readonly gravity: GravitySystem;
  /** The chambers' code, fetched as each is needed (`?sandbox` or a shared chamber link makes it a list of one: the test room, or the shared chamber). */
  readonly chambers: ChamberLoader;
  readonly keyboardMouse: KeyboardMouseInput;
  readonly touch: TouchInput;
  readonly gamepad: GamepadInput;
  readonly input: InputManager;
  readonly player: PlayerController;
  readonly hud: HUD;
  readonly pauseMenu: PauseMenu;
  readonly sound: AudioEngine;
  /** All game flow (title, play, pause, chamber select, falling, win); see its transition table. */
  readonly game: GameState;
  /** Open space: shown after a fall out of the chamber, through a window, and behind the title. */
  readonly backdrop: SpaceBackdrop;
  readonly fall: FallTracker;
  readonly titleView: TitleView;
  /** The camera in use and the space outside the chamber, once a frame. */
  readonly sky: Sky;
  /** This chamber visit's place on the hint ladder, which says more the longer a player is stuck. */
  readonly hints: HintLadder;
  /** The chambers to step back through, newest last. Cleared whenever a chamber starts. */
  readonly undoStack: UndoStack<ChamberSnapshot>;
  /** Shows where crates would rest if the lever in reach were thrown now. */
  readonly cratePreview: CratePreview;
  readonly chamberSelect: ChamberSelect;
  /** `?playtest` records each chamber visit for the designer. Kept in this browser; not in the sandbox. */
  readonly playtest: PlaytestRecorder | undefined;

  // --- The chamber and the skin: replaced by `startLevel` and `setSkin` (chamberFlow.ts) ----------------
  /** The chamber now built. Every start and every skin change builds a new one, so never hold on to it. */
  level: BuiltLevel;
  levelIndex: number;
  skin: SkinRuntime;
  /** An index into `SKIN_IDS`. */
  skinIndex: number;
  /** Whether `skin` was built with the colour-blind palette: `applySettings` rebuilds it when the setting differs. */
  skinColorAssist: boolean;

  // --- Saved state: replaced from the pause menu (bootstrap.ts) -----------------------------------------
  settings: Settings;
  /** Keyed by chamber id. Erasing saved progress replaces the object. */
  progress: Progress;

  // --- This attempt at the chamber: reset by `startLevel`, advanced by `stepChamber` -------------------
  /** Simulated seconds in this chamber: the clamped `dt` summed, so a hitch or hidden tab can't change a best time. */
  levelTime: number;
  shifts: number;
  /** Seconds the player has stood on the reclaimer's plate; it takes them after `RECLAIM_HOLD`. */
  reclaimHold: number;
  /** Whether the no-trim notice is showing: set by `checkTrim`. */
  outOfTrim: boolean;
  /**
   * How many times in a row the current chamber has been started again (restart, play again, the same chamber picked):
   * 0 for the first start of a chamber. Only `startLevel` changes it. Repeats get a quicker print-in.
   */
  repeatStarts: number;

  // --- This session ----------------------------------------------------------------------------------
  /** Simulated seconds since the page loaded, across chambers: what the smoke tests wait on (see `__debug.simTime`). */
  simClock: number;
  /** Attendants lost to the void this session (NARRATIVE.md). Never saved. */
  recoveries: number;
  /** The win screen's text, set just before the `win` event so entering `won` can show it. */
  winMessage: { title: string; body: string };
  /** When the pause menu last opened (`performance.now()`), to ignore the Esc that opened it. */
  pauseOpenedAt: number;
  /** Set while a gamepad press drives the menu, so Resume doesn't ask for pointer lock. */
  gamepadActing: boolean;
  /** A "new version installed" callback from the service worker, applied only between chambers or from the menu. */
  applyUpdate: (() => void) | undefined;
}

/** The chamber ids in play order: progress is keyed by them. */
export const CHAMBER_IDS = CHAMBERS.map((c) => c.id);
/** `?unlockall` is a playtest flag and never writes progress; nor does the sandbox. */
export const progressWritable = !sandbox && !unlockAll;
/** Lights appear on the planet from the first chamber of Act III (NARRATIVE.md). */
export const LIGHTS_FROM = CHAMBERS.findIndex((c) => c.id === 'turnstile');

export const progressStorage = (): ProgressStorage | null => (storageAvailable ? localStorage : null);
export const settingsStorage = (): SettingsStorage | null => {
  try {
    return localStorage;
  } catch {
    return null;
  }
};

export function persistProgress(app: App): void {
  if (progressWritable) saveProgress(progressStorage(), app.progress);
}

export function persistPlaytest(app: App): void {
  if (app.playtest) savePlaytest(app.playtest.toJSON());
}

const motionQuery = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;
/** The OS preference. */
export const systemReducedMotion = (): boolean => motionQuery?.matches ?? false;
/** Runs `listener` whenever the OS preference changes. */
export function onSystemMotionChange(listener: () => void): void {
  motionQuery?.addEventListener?.('change', listener);
}
/** Reduced motion applies if either the setting or the OS asks for it. */
export const reducedMotionActive = (app: App): boolean => app.settings.reducedMotion || systemReducedMotion();

export const fullscreenMode = (): 'toggle' | 'hint' | 'none' =>
  canFullscreen() ? 'toggle' : isIOS() && !isStandalone() ? 'hint' : 'none';

/** The facility's serial for chamber `index`; the sandbox has none. */
export const cubeOf = (index: number): string | undefined => (sandbox ? undefined : CHAMBERS[index]?.cube);
export const finishedAll = (app: App): boolean => app.levelIndex >= app.chambers.count - 1;
/** The chamber after this one; after the last, the first again. */
export const nextIndex = (app: App): number => (finishedAll(app) ? 0 : app.levelIndex + 1);
/** Whether the player is still where they were printed. */
export const atPrintBed = (app: App): boolean =>
  Vector3.DistanceSquared(app.player.position, app.level.spawnPosition) < 1;
/** What a snapshot is taken from and put back into: `level` is read each time, since every start rebuilds it. */
export const snapshotTargets = (app: App): SnapshotTargets => ({
  player: app.player,
  gravity: app.gravity,
  level: app.level,
});

/** A short synthesized tone, for the interface's own small sounds; the recorded ones are `sound.play`. */
export function beep(
  app: App,
  from: number,
  to: number,
  duration: number,
  type: OscillatorType = 'sine',
  volume = 0.12,
): void {
  app.sound.beep(from, to, duration, type, volume);
}

export function shiftSound(app: App, axis: GravityAxis): void {
  const t = shiftTone(axis);
  beep(app, t.from, t.to, t.duration, t.type, 0.05);
  // The cube turns: its hull takes the strain.
  app.sound.play('creak');
}
