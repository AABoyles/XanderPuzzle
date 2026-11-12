import './babylonSideEffects';
import { Color4 } from '@babylonjs/core/Maths/math.color';
import { Engine } from '@babylonjs/core/Engines/engine';
import { GlowLayer } from '@babylonjs/core/Layers/glowLayer';
import { Scene } from '@babylonjs/core/scene';
import { TargetCamera } from '@babylonjs/core/Cameras/targetCamera';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import {
  chaseDirection, DESCENT_DURATION, STORM_FIRST, distanceOutside, FALL_DURATION, FallTracker, PLANET_LAST, PLANET_NEAR,
  planetDistance, Vec3,
} from './environment/fall';
import { chamberHull, fieldBasis } from './environment/ballastField';
import { SpaceBackdrop } from './environment/SpaceBackdrop';
import { GameState, escapePauses, isFrozen, showsTouchControls, simulates, transition, viewOf } from './game/GameState';
import type { State } from './game/GameState';
import { AudioEngine } from './audio/AudioEngine';
import { impactGain } from './audio/sounds';
import { GravityAxis, GravitySystem } from './gravity/GravitySystem';
import { buildSandbox, CHAMBERS, LEVELS as CHAMBER_LEVELS } from './level/chambers';
import { GamepadInput } from './input/GamepadInput';
import { InputManager } from './input/InputManager';
import type { InputDevice } from './input/InputSource';
import { KeyboardMouseInput } from './input/KeyboardMouseInput';
import { TouchInput } from './input/TouchInput';
import { PlayerController } from './player/PlayerController';
import { canFullscreen, isFullscreen, isIOS, isStandalone, onFullscreenChange, toggleFullscreen } from './pwa/fullscreen';
import { loadFonts } from './level/fonts';
import {
  darkFraction, DESCENT_OUT_OF_TRIM, descentAlarm, dutyLine, endCard, MASS_RELEASED, NO_TRIM, NOT_RECOVERED,
  planetLights, recoveryLine, SHIFT_REVERTED, stormLine, winTitle, workLog,
} from './narrative';
import { registerServiceWorker } from './pwa/register';
import { shiftTone } from './gravity/shiftSound';
import { simDelta } from './time';
import { UndoStack } from './game/undo';
import { leversExhausted } from './game/stuck';
import type { DynamicsSnapshot } from './level/Dynamics';
import { fovToRadians, loadSettings, masterGain, musicGain, saveSettings } from './settings';
import type { Settings, SettingsStorage } from './settings';
import { createSkin, DEFAULT_SKIN, SKIN_IDS, SKIN_LABELS, SkinId } from './skins/Skin';
import {
  formatBest,
  formatShifts,
  furthestCleared,
  isUnlocked,
  loadProgress,
  recordWin,
  resetProgress,
  resumeIndex,
  saveProgress,
  setResume,
  type ProgressStorage,
} from './progress';
import { hintFor, hintTier } from './hints';
import { HUD } from './ui/HUD';
import { PauseMenu } from './ui/PauseMenu';
import { PlaytestRecorder, loadPlaytest, playtestFileName, savePlaytest } from './playtest';
import { downloadText } from './ui/download';

const canvas = document.getElementById('renderCanvas') as HTMLCanvasElement;
const engine = new Engine(canvas, true, { stencil: true, preserveDrawingBuffer: true }, true);

const scene = new Scene(engine);
scene.clearColor = new Color4(0.01, 0.012, 0.02, 1);
scene.collisionsEnabled = true;

const glow = new GlowLayer('glow', scene);
glow.intensity = 0.7;

const gravity = new GravitySystem('-Y', 22);
// `?sandbox` loads the physics test room instead of the chambers.
const params = new URLSearchParams(location.search);
const sandbox = params.has('sandbox');
const LEVELS = sandbox ? [buildSandbox] : CHAMBER_LEVELS;

const store = {
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
// Without storage there is no progress to gate on, so every chamber is open; `?unlockall` does the same for playtests.
const storageAvailable = (() => {
  try {
    localStorage.setItem('shiftbound.probe', '1');
    localStorage.removeItem('shiftbound.probe');
    return true;
  } catch {
    return false;
  }
})();
const unlockAll = params.has('unlockall') || !storageAvailable;
// `?playtest` records each chamber visit for the designer (src/playtest.ts). Kept in this browser; not in the sandbox.
const playtest = params.has('playtest') && !sandbox ? new PlaytestRecorder(() => new Date().toISOString()) : undefined;
const persistPlaytest = () => {
  if (playtest) savePlaytest(playtest.toJSON());
};
// Progress is keyed by chamber id. `?unlockall` is a playtest flag and never writes it (see `progressWritable`).
const CHAMBER_IDS = CHAMBERS.map((c) => c.id);
const progressStorage = (): ProgressStorage | null => (storageAvailable ? localStorage : null);
let progress = loadProgress(progressStorage(), CHAMBER_IDS);
const progressWritable = !sandbox && !unlockAll;
const persistProgress = () => {
  if (progressWritable) saveProgress(progressStorage(), progress);
};
// Resume at the last chamber reached.
let levelIndex = sandbox ? 0 : Math.min(resumeIndex(progress, CHAMBER_IDS), LEVELS.length - 1);
// Skin: `?skin=station|axis|monolith|draft|neon`, else the last one picked with K, else Station.
const skinParam = params.get('skin') as SkinId | null;
const storedSkin = Math.floor(store.get('skin') ?? SKIN_IDS.indexOf(DEFAULT_SKIN));
let skinIndex = skinParam && SKIN_IDS.includes(skinParam) ? SKIN_IDS.indexOf(skinParam) : ((storedSkin % SKIN_IDS.length) + SKIN_IDS.length) % SKIN_IDS.length;
// The colour-blind palette is read at start-up from the same saved settings `applySettings` uses.
let skinColorAssist = loadSettings(storageAvailable ? localStorage : null).colorAssist;
let skin = createSkin(SKIN_IDS[skinIndex], scene, glow, skinColorAssist);
// Placards draw at once in fallback fonts and redraw when the bundled ones arrive.
void loadFonts();
let level = LEVELS[levelIndex](scene, skin);
const keyboardMouse = new KeyboardMouseInput(canvas);
const touch = new TouchInput();
const gamepad = new GamepadInput();
const input = new InputManager([keyboardMouse, touch, gamepad], touch.active ? 'touch' : 'keyboard');
const player = new PlayerController(scene, gravity, level.spawnPosition, input);

const hud = new HUD();
hud.setDevice(input.lastDevice);
// The log continues a stored one, so a reload keeps its visits; the first chamber's visit starts at once.
playtest?.begin(input.lastDevice, SKIN_IDS[skinIndex], loadPlaytest() ?? undefined);
playtest?.enter(CHAMBERS[levelIndex].id);
persistPlaytest();

// Sound: music, recorded effects and the wind of a fall. Browsers only allow it after the player has acted, so the
// first click, key or tap unlocks it.
const sound = new AudioEngine();
for (const type of ['click', 'keydown', 'pointerup', 'touchend'] as const) {
  window.addEventListener(type, () => sound.unlock(), { capture: true, passive: true });
}

// --- Settings ------------------------------------------------------------------------------------
const settingsStorage = (): SettingsStorage | null => {
  try {
    return localStorage;
  } catch {
    return null;
  }
};
let settings: Settings = loadSettings(settingsStorage());
const motionQuery = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;
/** The OS preference. */
const systemReducedMotion = (): boolean => motionQuery?.matches ?? false;
/** Reduced motion applies if either the setting or the OS asks for it. */
const reducedMotionActive = (): boolean => settings.reducedMotion || systemReducedMotion();
motionQuery?.addEventListener?.('change', () => applySettings());
/** Pushes the current settings into the input sources and the camera. Volume and mute are read by `beep`. */
function applySettings(): void {
  keyboardMouse.lookScale = settings.mouseSensitivity;
  touch.lookScale = settings.touchSensitivity;
  gamepad.lookScale = settings.gamepadLookSpeed;
  input.invertY = settings.invertY; // for every device; GamepadInput.invertY stays off so it isn't applied twice
  player.camera.fov = fovToRadians(settings.fov);
  player.reducedMotion = reducedMotionActive();
  sound.setVolumes(masterGain(settings), musicGain(settings));
  // The palette is baked into the skin, so changing it rebuilds the chamber the way K does.
  if (settings.colorAssist !== skinColorAssist) setSkin(skinIndex);
}
applySettings();

/** All game flow (title, play, pause, chamber select, falling, win) lives in `GameState`; see its transition table. */
const game = new GameState();
let pauseOpenedAt = 0;
/** Set while a gamepad press drives the menu, so Resume doesn't ask for pointer lock. */
let gamepadActing = false;
/** A "new version installed" callback from the service worker, applied only between chambers or from the menu. */
let applyUpdate: (() => void) | undefined;
const fullscreenMode = (): 'toggle' | 'hint' | 'none' =>
  canFullscreen() ? 'toggle' : isIOS() && !isStandalone() ? 'hint' : 'none';
hud.configureFullscreen(fullscreenMode());
hud.setFullscreenState(isFullscreen());

const pauseMenu = new PauseMenu({
  texture: hud.texture,
  getSettings: () => settings,
  systemReducedMotion,
  onSettingsChange: (next, changed) => {
    settings = next;
    saveSettings(settingsStorage(), settings);
    applySettings();
    if (changed === 'volume' || changed === 'muted') beep(520, 520, 0.08, 'square', 0.06);
  },
  onResetProgress: () => {
    progress = resetProgress(progressStorage());
  },
  onSavePlaytest: playtest
    ? () => {
        const name = playtestFileName(new Date());
        downloadText(name, JSON.stringify(playtest.toJSON(), null, 2));
        pauseMenu.setHint(`Saved ${name}`);
      }
    : undefined,
  onClearPlaytest: playtest
    ? () => {
        playtest.reset();
        playtest.enter(CHAMBERS[levelIndex].id);
        persistPlaytest();
        pauseMenu.setHint('Playtest log cleared');
      }
    : undefined,
  fullscreen: () => ({ kind: fullscreenMode(), on: isFullscreen() }),
  hasChamberSelect: !sandbox,
});
pauseMenu.setDevice(input.lastDevice);
input.onDeviceChange = (device) => {
  hud.setDevice(device);
  pauseMenu.setDevice(device);
};
/** Touch detected: no pointer lock, and the player taps the start overlay to begin. */
const syncTouchMode = () => {
  keyboardMouse.pointerLockSuspended = true;
  input.setLastDevice('touch');
  hud.setDevice('touch');
  game.send({ type: 'controlLost' });
};
touch.onActivate = syncTouchMode;
touch.onChambers = () => openLevelSelect();
touch.onPause = () => game.send({ type: 'pause' });
/** Touch the screen again after using another device and the on-screen controls come back. */
window.addEventListener('pointerdown', (e) => {
  if (e.pointerType === 'touch' && touch.active) input.setLastDevice('touch');
}, true);
hud.setGravityAxis(gravity.axis, skin.hudColor(gravity.axis));
hud.setLevel(level.name, level.hint);
hud.setSkin(SKIN_LABELS[skin.id]);
gravity.onChangeObservable.add(({ axis }) => {
  hud.setGravityAxis(axis, skin.hudColor(axis));
  hud.flashGravityChange();
});

// Open space, shown only once the player has fallen out of the chamber.
const backdrop = new SpaceBackdrop(scene, glow);
backdrop.setChamber(level.bounds);
const fall = new FallTracker();

/**
 * The title's view: the cube from outside, hanging in the field with the Crown above it and the planet below (the one
 * place the whole machine is seen at once, before the attendant is printed inside it). It holds only while the title
 * is up and the player has not moved from the print bed.
 */
const titleCamera = new TargetCamera('titleCamera', Vector3.Zero(), scene);
titleCamera.fov = 1.45;
titleCamera.minZ = 1;
titleCamera.maxZ = 2000;
scene.activeCamera = player.camera;
const TITLE_STANDOFF = 200;
const TITLE_PLANET = 225;
const TITLE_CROWN = 120;
const titleSun = new Vector3();
const titleAnchor = new Vector3();
let titleTime = 0;
let titleShot = false;
let wasStorming = false;
/** Seconds the player has stood on the reclaimer's plate; it takes them after `RECLAIM_HOLD`. */
let reclaimHold = 0;
const RECLAIM_HOLD = 0.4;
/** 0-1: the new light on the planet, coming up once the last fall has ended. */
let arrival = 0;
const atPrintBed = () => Vector3.DistanceSquared(player.position, level.spawnPosition) < 1;
/** Where the planet is: it chases the gravity direction, so "down" always leads to it. */
let planetDir = gravity.direction.asArray() as Vec3;
const lastPosition = player.position.clone();

/** Simulated seconds in this chamber: accumulates the clamped `dt`, so a hitch or hidden tab can't change a best time. */
let levelTime = 0;
/** Simulated seconds since the page loaded, across chambers: what the smoke tests wait on (see `__debug.simTime`). */
let simClock = 0;
let shifts = 0;
/** Attendants lost to the void this session (NARRATIVE.md). Never saved. */
let recoveries = 0;
const finishedAll = () => levelIndex >= LEVELS.length - 1;
/** Lights appear on the planet from the first chamber of Act III (NARRATIVE.md). */
const LIGHTS_FROM = CHAMBERS.findIndex((c) => c.id === 'turnstile');
/** The facility's serial for chamber `index`; the sandbox has none. */
const cubeOf = (index: number): string | undefined => (sandbox ? undefined : CHAMBERS[index]?.cube);

/**
 * How many times in a row the current chamber has been started again (restart, play again, the same chamber picked):
 * 0 for the first start of a chamber. Only `startLevel` changes it. Repeats get a quicker print-in.
 */
let repeatStarts = 0;
/**
 * Simulated seconds in this chamber across its restarts (`repeatStarts`): reset only when the chamber changes. Feeds
 * the hint ladder (`src/hints.ts`), which asks for more help the longer a player is stuck.
 */
let chamberSeconds = 0;
/** The hint tier now on the HUD for this chamber (0 is the chamber's own hint). Reset when the chamber changes. */
let shownHintTier = 0;

/** The chamber just before a lever the player threw by hand, enough to put it back (see `undoLastShift`). */
interface ChamberSnapshot {
  position: Vector3;
  look: { yaw: number; pitch: number };
  gravity: GravityAxis;
  dynamics: DynamicsSnapshot;
  /** Whether each lever in `level.switches` was spent. */
  spent: boolean[];
  sequencer?: { active: boolean; remaining: number; index: number };
  shifts: number;
}

/** The chambers to step back through, newest last. Cleared whenever a chamber starts. */
const undoStack = new UndoStack<ChamberSnapshot>();

function takeSnapshot(): ChamberSnapshot {
  return {
    position: player.position.clone(),
    look: player.getLook(),
    gravity: gravity.axis,
    dynamics: level.dynamics.snapshot(),
    spent: level.switches.map((sw) => sw.spent),
    sequencer: level.sequencer?.snapshot(),
    shifts,
  };
}

function restoreSnapshot(s: ChamberSnapshot): void {
  // Gravity first: the player's orientation follows it when they are reset.
  gravity.setAxis(s.gravity);
  player.reset(s.position);
  player.setLook(s.look.yaw, s.look.pitch);
  level.dynamics.restore(s.dynamics);
  level.switches.forEach((sw, i) => {
    if (sw.spent && !s.spent[i]) sw.revive();
    else if (!sw.spent && s.spent[i]) sw.burnOut();
  });
  if (s.sequencer) level.sequencer?.restore(s.sequencer);
  shifts = s.shifts;
  lastPosition.copyFrom(player.position);
  // The fall, if there was one, is over: the player is back in the chamber.
  fall.reset();
}

/**
 * Steps back to the moment before the last hand-thrown lever. Refused in an ending chamber, whose levers are the story,
 * and when there is nothing to undo. Returns whether anything was undone.
 */
function undoLastShift(): boolean {
  if (level.ending) return false;
  const s = undoStack.pop();
  if (!s) return false;
  restoreSnapshot(s);
  hud.log(SHIFT_REVERTED);
  playtest?.undo();
  beep(300, 220, 0.12, 'triangle', 0.06);
  syncPrinter();
  checkTrim();
  return true;
}

/** Whether the no-trim notice is showing: set by `checkTrim`, reset whenever a chamber starts. */
let outOfTrim = false;

/**
 * Tells the player once when no lever left can turn gravity to the exit's (a lever-only check, see `leversExhausted`).
 * Not in the Descent, not while a sequence runs, and not in the sandbox. Called after every gravity change.
 */
function checkTrim(): void {
  const exhausted =
    !sandbox &&
    !level.ending &&
    !level.sequencer?.active &&
    leversExhausted(
      gravity.axis,
      level.exitAxis,
      level.switches.map((sw) => ({
        targetFor: (a: GravityAxis) => sw.targetFor(a),
        cycle: sw.spec.kind === 'sequence' ? sw.spec.sequencer.axes : undefined,
      })),
    );
  if (exhausted && !outOfTrim) {
    hud.log(`${NO_TRIM}\n${TEXT[input.lastDevice].stuck}`, 12);
    playtest?.stuck();
    beep(140, 90, 0.15, 'square', 0.08);
  }
  outOfTrim = exhausted;
}

/** Restarts the chamber; if the player was falling, the facility logs the lost attendant's replacement. */
function restartLevel(): void {
  const lost = fall.falling;
  lost ? playtest?.fall() : playtest?.restart();
  startLevel(levelIndex);
  persistPlaytest();
  if (lost) hud.log(recoveryLine(++recoveries));
}

/**
 * The view opens as the attendant is printed (see `HUD.printIn`), with the printer's hum. `repeats` is how many times in
 * a row the chamber has just been started (0 for the full-length print).
 */
function printIn(repeats = 0): void {
  hud.printIn(reducedMotionActive(), repeats);
  sound.play('print');
}

type Prompts = {
  void: string;
  cycle: string;
  next: string;
  again: string;
  select: string;
  title: string;
  stuck: string;
};
const TEXT: Record<InputDevice, Prompts> = {
  keyboard: {
    void: 'Outside the cube · press [R] to be reprinted',
    cycle: 'Press [E] to start the cycle',
    next: 'Click or press Enter for the next chamber',
    again: 'Click or press Enter to play again',
    select: '\nL for chamber select',
    title: 'Click or press Enter to return to the title',
    stuck: '[Z] takes back the last lever · [R] reprints you at the entrance',
  },
  touch: {
    void: 'Outside the cube · tap \u21BB to be reprinted',
    cycle: 'Tap [USE] to start the cycle',
    next: 'Tap for the next chamber',
    again: 'Tap to play again',
    select: '\nTap \u2630 for chamber select',
    title: 'Tap to return to the title',
    stuck: '↶ takes back the last lever · ↻ reprints you at the entrance',
  },
  gamepad: {
    void: 'Outside the cube · press [Y] to be reprinted',
    cycle: 'Press [X] to start the cycle',
    next: 'Press [A] for the next chamber',
    again: 'Press [A] to play again',
    select: '\nBack for chamber select',
    title: 'Press [A] to return to the title',
    stuck: 'Press [B] to take back the last lever · [Y] reprints you at the entrance',
  },
};

function startLevel(index: number): void {
  level.dispose();
  repeatStarts = index === levelIndex ? repeatStarts + 1 : 0;
  levelIndex = index;
  playtest?.enter(CHAMBERS[index].id);
  persistPlaytest();
  if (progressWritable) {
    setResume(progress, CHAMBERS[index].id);
    persistProgress();
  }
  level = LEVELS[levelIndex](scene, skin);
  if (import.meta.env.DEV && !sandbox && level.name !== CHAMBERS[index].name) {
    console.warn(`CHAMBERS[${index}].name is '${CHAMBERS[index].name}' but the chamber is named '${level.name}'`);
  }
  gravity.setAxis(level.entranceAxis);
  player.reset(level.spawnPosition);
  lastPosition.copyFrom(player.position);
  fall.reset();
  backdrop.setChamber(level.bounds);
  // Leaving an ending chamber is the final fall, and a long one.
  fall.duration = level.ending ? DESCENT_DURATION : FALL_DURATION;
  hud.setLevel(level.name, level.hint);
  if (repeatStarts === 0) {
    chamberSeconds = 0;
    shownHintTier = 0;
  }
  // A restart of the same chamber keeps the hint it had reached.
  if (shownHintTier > 0) hud.setHint(hintFor(sandbox ? undefined : CHAMBERS[index]?.id, level.hint, shownHintTier));
  const cube = cubeOf(index);
  if (cube !== undefined) hud.log(dutyLine(cube));
  levelTime = 0;
  shifts = 0;
  undoStack.clear();
  outOfTrim = false;
  arrival = 0;
  reclaimHold = 0;
  // Behind the title the view is outside the cube; the print-in plays when the title lifts.
  if (game.kind !== 'title') printIn(repeatStarts);
}

/** Swaps the skin in place: the chamber is rebuilt, but the player keeps their spot and gravity. */
function setSkin(index: number): void {
  level.dispose();
  skin.dispose();
  skinIndex = ((index % SKIN_IDS.length) + SKIN_IDS.length) % SKIN_IDS.length;
  store.set('skin', skinIndex);
  skinColorAssist = settings.colorAssist;
  skin = createSkin(SKIN_IDS[skinIndex], scene, glow, skinColorAssist);
  level = LEVELS[levelIndex](scene, skin);
  syncPrinter();
  hud.setSkin(SKIN_LABELS[skin.id]);
  hud.setGravityAxis(gravity.axis, skin.hudColor(gravity.axis));
}

/** In an ending chamber the printer goes offline once the cube is out of trim: nobody will be printed back here. */
function syncPrinter(): void {
  level.printer.setOnline(!(level.ending && shifts >= DESCENT_OUT_OF_TRIM));
}

/** The player has left an ending chamber: the clear is saved now, and the final fall begins. */
function beginDescent(): void {
  const chamberId = CHAMBERS[levelIndex]?.id;
  if (progressWritable && chamberId !== undefined) {
    recordWin(progress, chamberId, levelTime, shifts);
    persistProgress();
  }
  playtest?.clear(levelTime, shifts);
  persistPlaytest();
  hud.setSequence(null);
  game.send({ type: 'descend' });
}

function advance(): void {
  if (!game.send({ type: 'advance' })) return;
  startLevel(finishedAll() ? 0 : levelIndex + 1);
  // Between chambers is a safe moment to install a waiting update: the next chamber is already saved as the resume point.
  applyUpdate?.();
}

// --- Chamber select ------------------------------------------------------------------------------
let selectIndex = 0;
const chamberUnlocked = (index: number) => isUnlocked(index, furthestCleared(progress, CHAMBER_IDS), unlockAll);

function openLevelSelect(): void {
  if (sandbox) return;
  game.send({ type: 'openChambers' });
}

/** Fills and shows the chamber list; runs when the state machine enters `chamberSelect`. */
function showChamberSelect(): void {
  selectIndex = levelIndex;
  const furthest = furthestCleared(progress, CHAMBER_IDS);
  const entries = CHAMBERS.map((c, i) => {
    return {
      name: c.name,
      cube: c.cube,
      best: formatBest(progress.best[c.id]),
      shifts: formatShifts(progress.shifts[c.id], c.par),
      completed: i <= furthest,
      unlocked: isUnlocked(i, furthest, unlockAll),
    };
  });
  const devices = input.lastDevice === 'touch' ? 'Tap a chamber to play' : 'Arrows/D-pad choose · Enter/A play · Esc/B back';
  hud.showLevelSelect(entries, selectIndex, unlockAll && storageAvailable ? `${devices} · all unlocked` : devices);
}

function closeLevelSelect(): void {
  // Touch and gamepad have no pointer lock to wait for: closing the menu resumes play.
  const resume = touch.active || input.lastDevice === 'gamepad' || document.pointerLockElement === canvas;
  game.send({ type: 'closeChambers', resume });
}

// --- Pause menu ----------------------------------------------------------------------------------
function showPause(): void {
  hud.setPrompt(false);
  pauseOpenedAt = performance.now();
  pauseMenu.open(input.lastDevice);
}

/**
 * Closes the pause menu. With a mouse the menu stays open until the browser grants pointer lock (see the
 * `pointerlockchange` handler); a refusal, such as the cooldown after Esc, leaves it open to try again.
 */
function resumePlay(viaGamepad = false): void {
  if (game.kind !== 'paused') return;
  if (touch.active || viaGamepad) {
    game.send({ type: 'resume' });
    return;
  }
  const refused = () => pauseMenu.setHint('The browser would not capture the mouse yet. Try Resume again.');
  try {
    Promise.resolve(canvas.requestPointerLock()).catch(refused);
  } catch {
    refused();
  }
}

pauseMenu.onResume = () => resumePlay(gamepadActing);
pauseMenu.onRestart = () => {
  // Refused during the final fall, which is final.
  if (!transition(game.state, { type: 'restart' })) return;
  playtest?.restart();
  startLevel(levelIndex);
  persistPlaytest();
  game.send({ type: 'restart' });
  resumePlay(gamepadActing);
};
pauseMenu.onChambers = () => openLevelSelect();
pauseMenu.onToggleFullscreen = () => {
  void toggleFullscreen().then(() => pauseMenu.refresh());
};
pauseMenu.onUpdate = () => applyUpdate?.();

// --- State changes -------------------------------------------------------------------------------
/** The win screen's text, set just before the `win` event so entering `won` can show it. */
let winMessage = { title: '', body: '' };

/** Every overlay, pointer-lock and touch side effect of a flow change lives here. */
game.onChange = (prev: State, next: State) => {
  const was = viewOf(prev);
  const now = viewOf(next);
  const resumed = was.pause && !now.pause && !now.select && !now.title;
  if (was.pause && !now.pause) {
    pauseMenu.close();
    keyboardMouse.pointerLockSuspended = touch.active;
    if (resumed) input.drain(); // nothing pressed or moved while paused should fire now
  }
  if (was.select && !now.select) {
    hud.hideLevelSelect();
    keyboardMouse.pointerLockSuspended = touch.active;
  }
  if (was.win && !now.win) hud.hideWin();
  if (was.title && !now.title) {
    hud.hideStartOverlay();
    if (playtest && next.kind === 'playing') hud.log('PLAYTEST LOG ON · save it from the pause menu', 8);
    // Play begins: the attendant is printed, and the facility logs it.
    if (next.kind === 'playing' && atPrintBed()) {
      const cube = cubeOf(levelIndex);
      if (cube !== undefined) hud.log(dutyLine(cube));
      printIn();
    }
  }
  if (!was.title && now.title) hud.showStartOverlay();
  if (!was.select && now.select) {
    keyboardMouse.pointerLockSuspended = true;
    if (document.pointerLockElement) document.exitPointerLock();
    showChamberSelect();
  }
  if (!was.pause && now.pause) {
    keyboardMouse.pointerLockSuspended = true;
    if (document.pointerLockElement) document.exitPointerLock();
    showPause();
  }
  if (!was.win && now.win) hud.showWin(winMessage.title, winMessage.body);
  if (!was.ending && now.ending) {
    hud.setPrompt(false);
    const body = endCard(recoveries, cubeOf(levelIndex));
    hud.showEnding(NOT_RECOVERED, `${body}\n\nSHIFTBOUND\n\n${TEXT[input.lastDevice].title}`);
  }
  if (was.ending && !now.ending) hud.hideEnding();
};

function moveSelection(delta: number): void {
  selectIndex = Math.min(Math.max(selectIndex + delta, 0), CHAMBERS.length - 1);
  hud.highlightLevel(selectIndex);
}

/** Starts chamber `index` if it's unlocked. `grabPointer` is false where the browser won't allow it (gamepad). */
function pickLevel(index: number, grabPointer = true): void {
  if (!chamberUnlocked(index)) {
    beep(140, 90, 0.15, 'square', 0.08);
    return;
  }
  const immediate = touch.active || !grabPointer;
  game.send({ type: 'pick', immediate });
  startLevel(index);
  if (!immediate) {
    // Called from a click or key press, so the browser treats it as a user gesture. If it is refused, fall back
    // to a menu (the title before play has begun, the pause menu after) with a button to try again.
    const refused = () => game.send({ type: 'controlLost' });
    try {
      Promise.resolve(canvas.requestPointerLock()).catch(refused);
    } catch {
      refused();
    }
  }
}

if (touch.active) syncTouchMode(); // touch was detected at startup, before the callback existed
hud.onOpenLevelSelect = openLevelSelect;
hud.onCloseLevelSelect = closeLevelSelect;
hud.onToggleFullscreen = () => {
  swallowClick();
  void toggleFullscreen();
};
hud.onPickLevel = (i) => pickLevel(i);
hud.onHoverLevel = (i) => {
  selectIndex = i;
  hud.highlightLevel(i);
};

document.addEventListener('pointerlockchange', () => {
  if (touch.active) return;
  if (document.pointerLockElement === canvas) game.send({ type: 'locked' });
  else game.send({ type: 'controlLost' }); // Esc (which the browser handles itself) lands here: during play it means pause
});
document.addEventListener('pointerlockerror', () => {
  if (game.kind === 'paused') pauseMenu.setHint('The browser would not capture the mouse yet. Try Resume again.');
});

/** A GUI button press is followed by a canvas `click`; stop it from also starting play on the title overlay. */
let clickSwallowed = false;
function swallowClick(): void {
  clickSwallowed = true;
  setTimeout(() => (clickSwallowed = false), 100);
}
canvas.addEventListener('click', () => {
  if (clickSwallowed) {
    clickSwallowed = false;
    return;
  }
  if (game.kind === 'chamberSelect' || game.kind === 'paused') return;
  // A tap on the start overlay begins play without pointer lock.
  if (touch.active && game.kind === 'title') game.send({ type: 'begin' });
  else advance();
});
window.addEventListener('keydown', (e) => {
  if (game.kind === 'paused') {
    input.setLastDevice('keyboard');
    if (e.code === 'ArrowUp' || e.code === 'KeyW') pauseMenu.move(-1);
    else if (e.code === 'ArrowDown' || e.code === 'KeyS') pauseMenu.move(1);
    else if (e.code === 'ArrowLeft' || e.code === 'KeyA') pauseMenu.adjust(-1);
    else if (e.code === 'ArrowRight' || e.code === 'KeyD') pauseMenu.adjust(1);
    else if (e.code === 'Enter' || e.code === 'NumpadEnter' || e.code === 'Space') {
      if (!e.repeat) pauseMenu.activate();
    } else if (e.code === 'Escape' || e.code === 'Backspace') {
      // The Esc that released the pointer can also arrive here; don't let it close the menu it just opened.
      if (!e.repeat && performance.now() - pauseOpenedAt > 400) pauseMenu.back();
    }
    e.preventDefault();
    return;
  }
  if (game.kind === 'chamberSelect') {
    if (e.code === 'ArrowUp' || e.code === 'KeyW') moveSelection(-1);
    else if (e.code === 'ArrowDown' || e.code === 'KeyS') moveSelection(1);
    else if (e.code === 'Home') moveSelection(-CHAMBERS.length);
    else if (e.code === 'End') moveSelection(CHAMBERS.length);
    else if (e.code === 'Enter' || e.code === 'NumpadEnter') pickLevel(selectIndex);
    else if (e.code === 'Escape' || e.code === 'KeyL' || e.code === 'Backspace') closeLevelSelect();
    else if (e.code === 'KeyK') setSkin(skinIndex + (e.shiftKey ? -1 : 1));
    e.preventDefault();
    return;
  }
  // Esc with no pointer lock to release (e.g. play without a lock) opens the pause menu directly.
  if (e.code === 'Escape' && !e.repeat && escapePauses(game.state)) game.send({ type: 'pause' });
  if (e.code === 'KeyL') openLevelSelect();
  if (e.code === 'KeyK') setSkin(skinIndex + (e.shiftKey ? -1 : 1));
  if (e.code === 'Enter') advance();
});

// --- Sound ---------------------------------------------------------------------------------------
/** A short synthesized tone, for the interface's own small sounds; the recorded ones are `sound.play`. */
function beep(from: number, to: number, duration: number, type: OscillatorType = 'sine', volume = 0.12): void {
  sound.beep(from, to, duration, type, volume);
}

function shiftSound(axis: GravityAxis): void {
  const t = shiftTone(axis);
  beep(t.from, t.to, t.duration, t.type, 0.05);
  // The cube turns: its hull takes the strain.
  sound.play('creak');
}

engine.runRenderLoop(() => {
  // The one frame delta every system uses: clamped so a hitch or hidden tab advances them all by the same bounded step.
  const dt = simDelta(engine.getDeltaTime() / 1000);
  const frame = input.read(dt);
  const pad = gamepad.menu;
  // Actions below use up this frame's presses, so the player doesn't also act on them.
  let consumed = game.kind === 'chamberSelect';
  if (game.kind === 'chamberSelect') {
    if (pad.up) moveSelection(-1);
    if (pad.down) moveSelection(1);
    if (pad.confirm) pickLevel(selectIndex, false);
    else if (pad.back || pad.select) closeLevelSelect();
  } else if (game.kind === 'paused') {
    // Gamepad drives the menu; keyboard and pointer are handled by events.
    gamepadActing = true;
    if (pad.up) pauseMenu.move(-1);
    if (pad.down) pauseMenu.move(1);
    if (pad.left) pauseMenu.adjust(-1);
    if (pad.right) pauseMenu.adjust(1);
    if (frame.pause) resumePlay(true);
    else if (pad.confirm) pauseMenu.activate();
    else if (pad.back) pauseMenu.back();
    gamepadActing = false;
    consumed = true;
  } else if (pad.select) {
    openLevelSelect();
    consumed = true;
  } else if (frame.restart && game.kind !== 'won' && transition(game.state, { type: 'restart' })) {
    restartLevel();
    game.send({ type: 'restart' });
    consumed = true;
  } else if (frame.undo && (game.kind === 'playing' || game.kind === 'falling')) {
    if (undoLastShift()) consumed = true;
    else beep(140, 90, 0.15, 'square', 0.08);
  } else if (game.kind === 'won' || game.kind === 'ended') {
    if (pad.confirm) {
      advance();
      consumed = true;
    }
  } else if (game.kind === 'title') {
    // A or Start begins play (or resumes) where there is no pointer lock to wait for.
    if (pad.confirm || frame.pause) {
      game.send({ type: 'begin' });
      consumed = true;
    }
  } else if (frame.pause) {
    game.send({ type: 'pause' });
    consumed = true;
  }
  touch.setVisible(touch.active && input.lastDevice === 'touch' && showsTouchControls(game.state));
  // On desktop with a keyboard the player can already move while the pointer is unlocked on the title screen;
  // other devices wait. Any menu freezes everything: the player, the timer, the sequencer, dynamics and falling.
  const frozen = isFrozen(game.state, input.lastDevice);
  if (dt > 0 && !consumed && simulates(game.state, input.lastDevice)) {
    levelTime += dt;
    playtest?.tick(dt);
    // Time on the title screen does not count towards the hint ladder; neither does a menu or the win.
    if (game.kind === 'playing' || game.kind === 'falling') chamberSeconds += dt;
    simClock += dt;
    // The hint line only changes while the player is playing.
    const tier = hintTier(chamberSeconds, repeatStarts);
    if (!sandbox && game.kind === 'playing' && tier > shownHintTier) {
      shownHintTier = tier;
      hud.setHint(hintFor(CHAMBERS[levelIndex]?.id, level.hint, tier));
      beep(440, 440, 0.12, 'sine', 0.04);
    }
    const wasGrounded = player.isGrounded;
    player.update(dt, frame);
    if (!wasGrounded && player.isGrounded) sound.play('land');

    const interactPressed = player.consumeInteract();
    // Only the nearest usable lever responds, so two levers within reach never both fire.
    let target: (typeof level.switches)[number] | undefined;
    for (const sw of level.switches) {
      if (!sw.isInRange(player.position) || !sw.canUse(gravity.axis)) continue;
      if (!target || sw.distanceTo(player.position) < target.distanceTo(player.position)) target = sw;
    }
    // Saved before the throw, so undo can take it back. Only a throw that fires is kept: `canFire` mirrors `update`.
    const saved =
      interactPressed && target?.canFire(gravity.axis, player.position) && !level.ending ? takeSnapshot() : undefined;
    for (const sw of level.switches) {
      if (sw.update(dt, gravity, player.position, interactPressed && sw === target)) {
        if (saved) undoStack.push(saved);
        // Taking gravity back by hand stops a running sequence.
        if (sw.spec.kind !== 'sequence') level.sequencer?.stop();
        shifts++;
        playtest?.shift();
        shiftSound(gravity.axis);
        checkTrim();
        // In the Descent, the facility objects to every throw.
        if (level.ending) {
          hud.log(descentAlarm(shifts - 1, cubeOf(levelIndex) ?? ''), 9);
          const wasOnline = level.printer.online;
          syncPrinter();
          // The printer winds down: this cube is off the schedule.
          if (wasOnline && !level.printer.online) beep(520, 40, 1.6, 'sawtooth', 0.05);
        }
      }
    }
    const anyInRange = target !== undefined;
    touch.setInteractAvailable(anyInRange);
    const text = TEXT[input.lastDevice];
    if (game.kind === 'descending') hud.setPrompt(false);
    else if (fall.falling) hud.setPrompt(true, text.void);
    else if (target?.spec.kind === 'sequence') hud.setPrompt(anyInRange, text.cycle);
    else hud.setPrompt(anyInRange);

    const seq = level.sequencer;
    if (seq?.active) {
      const next = seq.update(dt);
      if (next) {
        gravity.setAxis(next);
        shifts++;
        playtest?.shift();
        shiftSound(next);
      } else if (seq.remaining < 3 && Math.ceil(seq.remaining) !== Math.ceil(seq.remaining + dt)) {
        // Tick on each of the last three seconds.
        beep(880, 880, 0.05, 'square', 0.05);
      }
      hud.setSequence(seq.next, seq.remaining, skin.hudColor(seq.next));
    } else {
      hud.setSequence(null);
    }

    const dyn = level.update(dt, gravity.vector, player.position);
    // A ballast mass stopping against a wall: louder the faster it came in.
    sound.play('impact', impactGain(dyn.impact));
    if (dyn.plateChanged) beep(520, 520, 0.08, 'square', 0.06);
    if (dyn.doorChanged) beep(180, 360, 0.3, 'triangle', 0.12);
    if (dyn.crateLost) {
      beep(300, 60, 0.9, 'sine', 0.1);
      hud.log(MASS_RELEASED);
    }

    // Anyone who escapes the geometry falls through space for a while, then is put back at the entrance.
    // Leaving an ending chamber is the final fall instead: it is the exit, and it ends on the end card.
    fall.update(dt, distanceOutside(level.bounds, player.position.asArray() as Vec3));
    if (game.kind === 'descending') {
      if (fall.finished) game.send({ type: 'end' });
    } else if (fall.finished) {
      restartLevel();
      game.send({ type: 'respawn' });
    } else if (level.ending && fall.falling) {
      beginDescent();
    } else game.send({ type: fall.falling ? 'fell' : 'recovered' });

    // A chamber is won on the reclaimer's plate: stand on it (touching it counts, under any gravity) and after a
    // moment it takes the attendant. A level without a reclaimer falls back to reaching its exit point.
    let reclaimed = false;
    const reclaimer = level.reclaimer;
    if (level.ending) {
      // No reclaimer: the way out is the fall.
    } else if (reclaimer) {
      const p = player.position;
      const t = reclaimer.trigger;
      const on =
        p.x + 0.5 > t.min[0] && p.x - 0.5 < t.max[0] && p.y + 0.5 > t.min[1] && p.y - 0.5 < t.max[1] &&
        p.z + 0.5 > t.min[2] && p.z - 0.5 < t.max[2];
      if (reclaimer.setPressed(on)) beep(on ? 520 : 390, on ? 520 : 390, 0.08, 'square', 0.06);
      reclaimHold = on ? reclaimHold + dt : 0;
      reclaimed = reclaimHold >= RECLAIM_HOLD;
    } else {
      reclaimed = Vector3.Distance(player.position, level.exitCenter) <= level.exitRadius;
    }
    if (reclaimed) {
      hud.setPrompt(false);
      // The exit is a reclaimer: the view is taken apart from the top down, to the printer's sound run backwards.
      hud.printOut(reducedMotionActive());
      sound.play('reclaim');
      const chamberId = CHAMBERS[levelIndex]?.id;
      const best = chamberId === undefined ? undefined : progress.best[chamberId];
      if (progressWritable && chamberId !== undefined) {
        recordWin(progress, chamberId, levelTime, shifts);
        persistProgress();
      }
      playtest?.clear(levelTime, shifts);
      persistPlaytest();
      const last = finishedAll();
      const cube = cubeOf(levelIndex);
      const par = CHAMBERS[levelIndex]?.par;
      const log = workLog({ time: levelTime, best, shifts, par, next: last ? undefined : cubeOf(levelIndex + 1) });
      const text = TEXT[input.lastDevice];
      const select = sandbox ? '' : text.select;
      const update = applyUpdate ? '\nUpdate ready: it installs when you continue' : '';
      winMessage = {
        title: cube === undefined ? 'CHAMBER CLEARED' : winTitle(cube, last),
        body: `${log}\n\n${last ? text.again : text.next}${select}${update}`,
      };
      game.send({ type: 'win' });
    }
  }

  // The backdrop keeps animating on the win screen. It shows after an escape, through a chamber's window (`vista`),
  // and behind the title, where the camera stands outside the cube.
  const down = gravity.direction.asArray() as Vec3;
  const wasTitleShot = titleShot;
  titleShot = game.kind === 'title' && !sandbox && atPrintBed();
  if (titleShot !== wasTitleShot) {
    backdrop.resetField(); // the field is laid out around the cube for the title, around the view otherwise
    scene.activeCamera = titleShot ? titleCamera : player.camera;
  }
  // Where a window shows the sky, the planet and the Crown swing round as the cube turns; elsewhere a hole in the
  // floor shows the planet at once.
  planetDir = fall.visibility > 0 || level.vista ? chaseDirection(planetDir, down, dt, 3) : down;
  const shared = {
    planetDirection: Vector3.FromArray(planetDir),
    darkFraction: darkFraction(levelIndex, LEVELS.length),
    planetLights: planetLights(levelIndex, sandbox ? -1 : LIGHTS_FROM, LEVELS.length),
  };
  if (titleShot) {
    // Stand off to one side of the cube, a little above its middle, and drift slowly around it.
    titleTime += reducedMotionActive() ? 0 : dt;
    const hull = chamberHull(level.bounds);
    titleAnchor.fromArray(hull.center);
    const axes = fieldBasis(planetDir);
    const a = 0.6 + 0.16 * Math.sin(titleTime * 0.08);
    const at = (k: number) =>
      hull.center[k] + (axes.x[k] * Math.cos(a) + axes.z[k] * Math.sin(a)) * TITLE_STANDOFF + axes.y[k] * 12;
    titleCamera.position.set(at(0), at(1), at(2));
    titleCamera.upVector.fromArray(axes.y);
    const up = Vector3.FromArray(axes.y);
    titleCamera.setTarget(titleAnchor.add(up.scale(47)));
    // From the side the star cannot be both straight above the Crown and in the picture, so here it is drawn where
    // the eye expects it: beyond the Crown, on the line up from the planet through the cube.
    titleSun.copyFrom(titleAnchor).addInPlace(up.scale(TITLE_CROWN + 70)).subtractInPlace(titleCamera.position);
    titleSun.normalize();
    backdrop.update({
      ...shared,
      cameraPosition: titleCamera.position,
      anchor: titleAnchor,
      visibility: 1,
      planetDistance: TITLE_PLANET,
      crownDistance: TITLE_CROWN,
      sunDirection: titleSun,
      speed: 0,
      dt,
    });
  } else {
    // The last fall has ended: one more light comes up on the planet, under the end card.
    // The view settles on the ground below, where it is.
    if (game.kind === 'ended') {
      arrival = Math.min(1, arrival + dt / 2.5);
      player.lookDown(reducedMotionActive() ? 1 : Math.min(1, dt * 2.5));
    }
    backdrop.update({
      ...shared,
      cameraPosition: player.camera.position,
      visibility: fall.visibility,
      vista: level.vista,
      planetDistance: planetDistance(fall.time, fall.duration, level.ending ? PLANET_LAST : PLANET_NEAR),
      speed: dt > 0 ? Vector3.Distance(player.position, lastPosition) / dt : 0,
      dt: frozen ? 0 : dt,
      hullDark: level.ending && !level.printer.online,
      arrival,
    });
  }
  lastPosition.copyFrom(player.position);
  // The air of the fall: silence beside the cube, a roar by the end. It stops dead when the fall does.
  const inFall = fall.falling && !frozen && game.kind !== 'ended' && game.kind !== 'won';
  sound.setFall(inFall ? fall.time / fall.duration : 0);
  // A storm breaking where the Crown can be seen (a window, or out in a fall) is logged: it is what the Crown is for.
  const storming = backdrop.storm > 0;
  if (storming && !wasStorming && !sandbox && !titleShot && game.kind !== 'ended' && (level.vista || fall.falling)) {
    hud.log(stormLine(1 - shared.darkFraction), 8);
    beep(60, 38, 2.4, 'sawtooth', 0.04);
  }
  wasStorming = storming;

  scene.render();
});

// The canvas must follow every change of viewport: window resize, rotation and entering or leaving fullscreen.
const resize = () => {
  engine.resize();
  pauseMenu.refresh();
};
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => {
  resize();
  setTimeout(resize, 250); // some browsers report the old size until the rotation settles
});
try {
  screen.orientation?.addEventListener('change', resize);
} catch {
  /* Screen Orientation API unavailable */
}
onFullscreenChange(() => {
  resize();
  hud.setFullscreenState(isFullscreen());
  pauseMenu.refresh();
});

registerServiceWorker({
  onUpdateReady: (apply) => {
    applyUpdate = apply;
    hud.setUpdateNotice(true);
    pauseMenu.setUpdateReady(true);
  },
});

if (import.meta.env.DEV) {
  // Lightweight inspection hook for manual/automated testing in dev builds only.
  (window as unknown as Record<string, unknown>).__debug = {
    position: () => player.position.asArray(),
    gravityAxis: () => gravity.axis,
    setPosition: (x: number, y: number, z: number) => player.collider.position.set(x, y, z),
    state: () => game.kind,
    /**
     * Simulated seconds since load. The game clock is clamped per frame, so on a slow renderer it runs behind the wall
     * clock: tests wait on this, never on real time.
     */
    simTime: () => simClock,
    /** Renders at 1/`level` of the resolution each way, so software WebGL keeps the frame rate (and the clock) up. */
    setRenderScale: (level: number) => engine.setHardwareScalingLevel(level),
    /** The audio engine's state: context, files decoded, whether the music and the wind are sounding. */
    audio: () => sound.status(),
    /** Starts a stellar storm now (they otherwise come once a minute). */
    storm: () => backdrop.seek(STORM_FIRST),
    /** Leaves the title as a tap or gamepad press would, without pointer lock. */
    begin: () => game.send({ type: 'begin' }),
    hasWon: () => game.kind === 'won',
    /** Skips to the end of the current fall (the Descent's is 25 s). */
    endFall: () => {
      if (fall.falling) fall.time = fall.duration;
    },
    level: () => levelIndex,
    /** The hint tier shown for this chamber visit: 0 (its own hint), 1 or 2 (the ladder in `src/hints.ts`). */
    hintTier: () => shownHintTier,
    startLevel: (index: number) => {
      game.send({ type: 'advance' }); // leaves the win screen if it is up
      startLevel(index);
      game.send({ type: 'restart' });
    },
    /** Undoes the last hand-thrown lever, as Z does. Returns whether anything was undone. */
    undo: () => (game.kind === 'playing' || game.kind === 'falling') && undoLastShift(),
    undoDepth: () => undoStack.size,
    /** Whether the no-trim notice (no lever left reaches the exit's gravity) is showing. */
    outOfTrim: () => outOfTrim,
    openPause: () => game.send({ type: 'pause' }),
    pauseOpen: () => game.kind === 'paused',
    openLevelSelect,
    levelSelectOpen: () => game.kind === 'chamberSelect',
    look: (yaw: number, pitch: number) => player.setLook(yaw, pitch),
    setSkin: (id: SkinId) => setSkin(SKIN_IDS.indexOf(id)),
    crates: () => level.dynamics.crates.map((c) => [...c.body.center]),
    placards: () => level.placards,
    /** Whether each plate is as its door needs it: pressed, or clear for an inverted plate. */
    plates: () => level.dynamics.plates.map((pl) => pl.satisfied),
    cratesLost: () => level.dynamics.crates.map((c) => c.lost),
    doors: () => level.dynamics.doors.map((d) => d.isOpen),
    switches: () =>
      level.switches.map((sw) => ({
        kind: sw.spec.kind,
        target: sw.targetFor(gravity.axis),
        spent: sw.spent,
        inRange: sw.isInRange(player.position),
        position: sw.root.position.asArray(),
      })),
    /** Presses E for one frame, as the player would. */
    interact: () => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE' })),
    setGravity: (axis: GravityAxis) => gravity.setAxis(axis),
    grounded: () => player.isGrounded,
    levelCount: () => LEVELS.length,
    /** `button` is where to stand on the reclaimer's plate, which is what wins the chamber. */
    exit: () => ({ center: level.exitCenter.asArray(), radius: level.exitRadius, button: level.reclaimer?.stand }),
    /** The playtest log, when the page was opened with `?playtest` (undefined otherwise). */
    playtest: () => playtest?.toJSON(),
  };
}
