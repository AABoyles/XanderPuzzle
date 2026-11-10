import { Color4, Engine, GlowLayer, Scene, Vector3 } from '@babylonjs/core';
import { chaseDirection, distanceOutside, FallTracker, planetDistance, Vec3 } from './environment/fall';
import { SpaceBackdrop } from './environment/SpaceBackdrop';
import { GravityAxis, GravitySystem } from './gravity/GravitySystem';
import { buildSandbox, CHAMBERS, LEVELS as CHAMBER_LEVELS } from './level/chambers';
import { GamepadInput } from './input/GamepadInput';
import { InputManager } from './input/InputManager';
import type { InputDevice } from './input/InputSource';
import { KeyboardMouseInput } from './input/KeyboardMouseInput';
import { TouchInput } from './input/TouchInput';
import { PlayerController } from './player/PlayerController';
import { canFullscreen, isFullscreen, isIOS, isStandalone, onFullscreenChange, toggleFullscreen } from './pwa/fullscreen';
import { registerServiceWorker } from './pwa/register';
import { shiftTone } from './gravity/shiftSound';
import { simDelta } from './time';
import { fovToRadians, loadSettings, masterGain, saveSettings } from './settings';
import type { Settings, SettingsStorage } from './settings';
import { createSkin, SKIN_IDS, SKIN_LABELS, SkinId } from './skins/Skin';
import { formatBest, furthestCleared, isUnlocked, recordCleared } from './progress';
import { HUD } from './ui/HUD';
import { PauseMenu } from './ui/PauseMenu';

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
      return v === null ? undefined : Number(v);
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
// Resume at the last chamber reached.
let levelIndex = sandbox ? 0 : Math.min(Math.max(Math.floor(store.get('level') ?? 0), 0), LEVELS.length - 1);
// Skin: `?skin=axis|monolith|draft|neon`, else the last one picked with K, else Axis.
const skinParam = params.get('skin') as SkinId | null;
let skinIndex = skinParam && SKIN_IDS.includes(skinParam) ? SKIN_IDS.indexOf(skinParam) : Math.floor(store.get('skin') ?? 0) % SKIN_IDS.length;
let skin = createSkin(SKIN_IDS[skinIndex], scene, glow);
let level = LEVELS[levelIndex](scene, skin);
const keyboardMouse = new KeyboardMouseInput(canvas);
const touch = new TouchInput();
const gamepad = new GamepadInput();
const input = new InputManager([keyboardMouse, touch, gamepad], touch.active ? 'touch' : 'keyboard');
const player = new PlayerController(scene, gravity, level.spawnPosition, input);

const hud = new HUD();
hud.setDevice(input.lastDevice);

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
}
applySettings();

// Whether the player has begun this session; after that, losing control shows the pause menu, not the title.
let started = false;
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
  if (!levelSelectOpen() && !hasWon) {
    if (started) openPause();
    else hud.showStartOverlay();
  }
};
touch.onActivate = syncTouchMode;
touch.onChambers = () => openLevelSelect();
touch.onPause = () => openPause();
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
const fall = new FallTracker();
/** Where the planet is: it chases the gravity direction, so "down" always leads to it. */
let planetDir = gravity.direction.asArray() as Vec3;
const lastPosition = player.position.clone();

let hasWon = false;
/** Simulated seconds in this chamber: accumulates the clamped `dt`, so a hitch or hidden tab can't change a best time. */
let levelTime = 0;
let shifts = 0;
const finishedAll = () => levelIndex >= LEVELS.length - 1;

const TEXT: Record<InputDevice, { void: string; cycle: string; next: string; again: string; select: string }> = {
  keyboard: {
    void: 'Lost to the void · press [R] to return',
    cycle: 'Press [E] to start the cycle',
    next: 'Click or press Enter for the next chamber',
    again: 'Click or press Enter to play again',
    select: '\nL for chamber select',
  },
  touch: {
    void: 'Lost to the void · tap \u21BB to return',
    cycle: 'Tap [USE] to start the cycle',
    next: 'Tap for the next chamber',
    again: 'Tap to play again',
    select: '\nTap \u2630 for chamber select',
  },
  gamepad: {
    void: 'Lost to the void · press [Y] to return',
    cycle: 'Press [X] to start the cycle',
    next: 'Press [A] for the next chamber',
    again: 'Press [A] to play again',
    select: '\nBack for chamber select',
  },
};

function startLevel(index: number): void {
  level.dispose();
  levelIndex = index;
  if (!sandbox) store.set('level', index);
  level = LEVELS[levelIndex](scene, skin);
  if (import.meta.env.DEV && !sandbox && level.name !== CHAMBERS[index].name) {
    console.warn(`CHAMBERS[${index}].name is '${CHAMBERS[index].name}' but the chamber is named '${level.name}'`);
  }
  gravity.setAxis(level.entranceAxis);
  player.reset(level.spawnPosition);
  lastPosition.copyFrom(player.position);
  fall.reset();
  hud.setLevel(level.name, level.hint);
  hud.hideWin();
  hasWon = false;
  levelTime = 0;
  shifts = 0;
}

/** Swaps the skin in place: the chamber is rebuilt, but the player keeps their spot and gravity. */
function setSkin(index: number): void {
  level.dispose();
  skin.dispose();
  skinIndex = ((index % SKIN_IDS.length) + SKIN_IDS.length) % SKIN_IDS.length;
  store.set('skin', skinIndex);
  skin = createSkin(SKIN_IDS[skinIndex], scene, glow);
  level = LEVELS[levelIndex](scene, skin);
  hud.setSkin(SKIN_LABELS[skin.id]);
  hud.setGravityAxis(gravity.axis, skin.hudColor(gravity.axis));
}

function advance(): void {
  if (!hasWon) return;
  startLevel(finishedAll() ? 0 : levelIndex + 1);
  // Between chambers is a safe moment to install a waiting update: the next chamber is already saved as the resume point.
  applyUpdate?.();
}

// --- Chamber select ------------------------------------------------------------------------------
let selectIndex = 0;
/** The chamber select was opened from the pause menu, so closing it returns there. */
let selectFromPause = false;
const levelSelectOpen = () => hud.isLevelSelectOpen;
const chamberUnlocked = (index: number) => isUnlocked(index, furthestCleared(store, LEVELS.length), unlockAll);

function openLevelSelect(): void {
  if (sandbox || levelSelectOpen()) return;
  keyboardMouse.pointerLockSuspended = true;
  if (document.pointerLockElement) document.exitPointerLock();
  hud.hideStartOverlay();
  selectIndex = levelIndex;
  const furthest = furthestCleared(store, LEVELS.length);
  const entries = CHAMBERS.map((c, i) => {
    return {
      name: c.name,
      best: formatBest(store.get(`best.${i}`)),
      completed: i <= furthest,
      unlocked: isUnlocked(i, furthest, unlockAll),
    };
  });
  const devices = input.lastDevice === 'touch' ? 'Tap a chamber to play' : 'Arrows/D-pad choose · Enter/A play · Esc/B back';
  hud.showLevelSelect(entries, selectIndex, unlockAll && storageAvailable ? `${devices} · all unlocked` : devices);
}

function closeLevelSelect(returnToMenu = true): void {
  if (!levelSelectOpen()) return;
  hud.hideLevelSelect();
  keyboardMouse.pointerLockSuspended = touch.active;
  const fromPause = selectFromPause;
  selectFromPause = false;
  if (!returnToMenu || hasWon) return;
  if (fromPause) {
    openPause();
    return;
  }
  // Touch and gamepad have no pointer lock to wait for: closing the menu resumes play.
  if (!touch.active && input.lastDevice !== 'gamepad' && document.pointerLockElement !== canvas) {
    if (started) openPause();
    else hud.showStartOverlay();
  }
}

// --- Pause menu ----------------------------------------------------------------------------------
function openPause(): void {
  if (pauseMenu.isOpen || levelSelectOpen() || hasWon || hud.isStartOverlayVisible) return;
  keyboardMouse.pointerLockSuspended = true;
  if (document.pointerLockElement) document.exitPointerLock();
  hud.setPrompt(false);
  pauseOpenedAt = performance.now();
  pauseMenu.open(input.lastDevice);
}

function finishResume(): void {
  pauseMenu.close();
  keyboardMouse.pointerLockSuspended = touch.active;
  input.drain(); // nothing pressed or moved while paused should fire now
}

/**
 * Closes the pause menu. With a mouse the menu stays open until the browser grants pointer lock (see the
 * `pointerlockchange` handler); a refusal, such as the cooldown after Esc, leaves it open to try again.
 */
function resumePlay(viaGamepad = false): void {
  if (!pauseMenu.isOpen) return;
  if (touch.active || viaGamepad) {
    finishResume();
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
  startLevel(levelIndex);
  resumePlay(gamepadActing);
};
pauseMenu.onChambers = () => {
  selectFromPause = true;
  pauseMenu.close();
  openLevelSelect();
};
pauseMenu.onToggleFullscreen = () => {
  void toggleFullscreen().then(() => pauseMenu.refresh());
};
pauseMenu.onUpdate = () => applyUpdate?.();

/** Leaves the title screen (or a chamber change on touch/gamepad) and starts play. */
function beginPlay(): void {
  started = true;
  hud.hideStartOverlay();
}

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
  closeLevelSelect(false);
  startLevel(index);
  if (touch.active || !grabPointer) beginPlay();
  else {
    // Called from a click or key press, so the browser treats it as a user gesture. If it is refused, fall back
    // to a menu (the title before play has begun, the pause menu after) with a button to try again.
    const refused = () => (started ? openPause() : hud.showStartOverlay());
    try {
      Promise.resolve(canvas.requestPointerLock()).catch(refused);
    } catch {
      refused();
    }
  }
}

if (touch.active) syncTouchMode(); // touch was detected at startup, before the callback existed
hud.onOpenLevelSelect = openLevelSelect;
hud.onCloseLevelSelect = () => closeLevelSelect();
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
  if (document.pointerLockElement === canvas) {
    started = true;
    hud.hideStartOverlay();
    if (pauseMenu.isOpen) finishResume();
  } else if (!hasWon && !levelSelectOpen()) {
    // Esc (which the browser handles itself) lands here: during play it means pause.
    if (started) openPause();
    else if (!pauseMenu.isOpen) hud.showStartOverlay();
  }
});
document.addEventListener('pointerlockerror', () => {
  if (pauseMenu.isOpen) pauseMenu.setHint('The browser would not capture the mouse yet. Try Resume again.');
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
  if (levelSelectOpen() || pauseMenu.isOpen) return;
  // A tap on the start overlay begins play without pointer lock.
  if (touch.active && hud.isStartOverlayVisible) beginPlay();
  else advance();
});
window.addEventListener('keydown', (e) => {
  if (pauseMenu.isOpen) {
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
  if (levelSelectOpen()) {
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
  if (e.code === 'Escape' && !e.repeat && started) openPause();
  if (e.code === 'KeyL') openLevelSelect();
  if (e.code === 'KeyK') setSkin(skinIndex + (e.shiftKey ? -1 : 1));
  if (e.code === 'Enter') advance();
});

// --- Tiny synthesized sound effects (no assets) ------------------------------------------------
let audio: AudioContext | undefined;
function beep(from: number, to: number, duration: number, type: OscillatorType = 'sine', volume = 0.12): void {
  volume *= masterGain(settings);
  if (volume <= 0) return;
  try {
    audio ??= new AudioContext();
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, audio.currentTime);
    osc.frequency.exponentialRampToValueAtTime(to, audio.currentTime + duration);
    gain.gain.setValueAtTime(volume, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + duration);
    osc.connect(gain).connect(audio.destination);
    osc.start();
    osc.stop(audio.currentTime + duration);
  } catch {
    /* audio is optional */
  }
}

function shiftSound(axis: GravityAxis): void {
  const t = shiftTone(axis);
  beep(t.from, t.to, t.duration, t.type, 0.08);
}

engine.runRenderLoop(() => {
  // The one frame delta every system uses: clamped so a hitch or hidden tab advances them all by the same bounded step.
  const dt = simDelta(engine.getDeltaTime() / 1000);
  const frame = input.read(dt);
  const pad = gamepad.menu;
  // Actions below use up this frame's presses, so the player doesn't also act on them.
  let consumed = levelSelectOpen();
  if (levelSelectOpen()) {
    if (pad.up) moveSelection(-1);
    if (pad.down) moveSelection(1);
    if (pad.confirm) pickLevel(selectIndex, false);
    else if (pad.back || pad.select) closeLevelSelect();
  } else if (pauseMenu.isOpen) {
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
  } else if (frame.restart && !hasWon) {
    startLevel(levelIndex);
    consumed = true;
  } else if (hasWon) {
    if (pad.confirm) {
      advance();
      consumed = true;
    }
  } else if (hud.isStartOverlayVisible) {
    // A or Start begins play (or resumes) where there is no pointer lock to wait for.
    if (pad.confirm || frame.pause) {
      beginPlay();
      consumed = true;
    }
  } else if (frame.pause) {
    openPause();
    consumed = true;
  }
  const menuOpen = levelSelectOpen() || pauseMenu.isOpen;
  touch.setVisible(touch.active && input.lastDevice === 'touch' && !hasWon && !menuOpen && !hud.isStartOverlayVisible);
  // On desktop with a keyboard the player can already move while the pointer is unlocked on the title screen;
  // other devices wait. Any menu freezes everything: the player, the timer, the sequencer, dynamics and falling.
  const waitingToStart = hud.isStartOverlayVisible && input.lastDevice !== 'keyboard';
  const frozen = menuOpen || waitingToStart;
  if (dt > 0 && !consumed && !hasWon && !frozen) {
    levelTime += dt;
    const wasGrounded = player.isGrounded;
    player.update(dt, frame);
    if (!wasGrounded && player.isGrounded) beep(110, 60, 0.12, 'triangle', 0.15);

    const interactPressed = player.consumeInteract();
    // Only the nearest usable lever responds, so two levers within reach never both fire.
    let target: (typeof level.switches)[number] | undefined;
    for (const sw of level.switches) {
      if (!sw.isInRange(player.position) || !sw.canUse(gravity.axis)) continue;
      if (!target || sw.distanceTo(player.position) < target.distanceTo(player.position)) target = sw;
    }
    for (const sw of level.switches) {
      if (sw.update(dt, gravity, player.position, interactPressed && sw === target)) {
        // Taking gravity back by hand stops a running sequence.
        if (sw.spec.kind !== 'sequence') level.sequencer?.stop();
        shifts++;
        shiftSound(gravity.axis);
      }
    }
    const anyInRange = target !== undefined;
    touch.setInteractAvailable(anyInRange);
    const text = TEXT[input.lastDevice];
    if (fall.falling) hud.setPrompt(true, text.void);
    else if (target?.spec.kind === 'sequence') hud.setPrompt(anyInRange, text.cycle);
    else hud.setPrompt(anyInRange);

    const seq = level.sequencer;
    if (seq?.active) {
      const next = seq.update(dt);
      if (next) {
        gravity.setAxis(next);
        shifts++;
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
    if (dyn.impact > 4) beep(90, 45, 0.18, 'square', Math.min(0.2, dyn.impact / 150));
    if (dyn.plateChanged) beep(520, 520, 0.08, 'square', 0.06);
    if (dyn.doorChanged) beep(180, 360, 0.3, 'triangle', 0.12);

    // Anyone who escapes the geometry falls through space for a while, then is put back at the entrance.
    fall.update(dt, distanceOutside(level.bounds, player.position.asArray() as Vec3));
    if (fall.finished) startLevel(levelIndex);

    if (Vector3.Distance(player.position, level.exitCenter) <= level.exitRadius) {
      hasWon = true;
      hud.setPrompt(false);
      beep(440, 880, 0.6, 'sine', 0.15);
      const best = store.get(`best.${levelIndex}`);
      const isBest = best === undefined || levelTime < best;
      if (!sandbox) {
        if (isBest) store.set(`best.${levelIndex}`, levelTime);
        recordCleared(store, levelIndex, LEVELS.length);
      }
      const bestText = isBest ? 'new best!' : `best ${best.toFixed(1)}s`;
      const stats = `${levelTime.toFixed(1)}s (${bestText}) · ${shifts} gravity shift${shifts === 1 ? '' : 's'}`;
      const text = TEXT[input.lastDevice];
      const select = sandbox ? '' : text.select;
      const update = applyUpdate ? '\nUpdate ready: it installs when you continue' : '';
      if (finishedAll()) hud.showWin('ALL CHAMBERS CLEARED', `${stats}\n\n${text.again}${select}${update}`);
      else hud.showWin('CHAMBER CLEARED', `${stats}\n\n${text.next}${select}${update}`);
    }
  }

  // The backdrop keeps animating on the win screen, but only ever shows after an escape.
  const down = gravity.direction.asArray() as Vec3;
  planetDir = fall.visibility > 0 ? chaseDirection(planetDir, down, dt, 3) : down;
  backdrop.update({
    cameraPosition: player.camera.position,
    visibility: fall.visibility,
    planetDirection: Vector3.FromArray(planetDir),
    planetDistance: planetDistance(fall.time),
    speed: dt > 0 ? Vector3.Distance(player.position, lastPosition) / dt : 0,
    dt: frozen ? 0 : dt,
  });
  lastPosition.copyFrom(player.position);

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
    hasWon: () => hasWon,
    level: () => levelIndex,
    startLevel,
    openPause,
    pauseOpen: () => pauseMenu.isOpen,
    openLevelSelect,
    levelSelectOpen,
    look: (yaw: number, pitch: number) => player.setLook(yaw, pitch),
    setSkin: (id: SkinId) => setSkin(SKIN_IDS.indexOf(id)),
    crates: () => level.dynamics.crates.map((c) => [...c.body.center]),
    plates: () => level.dynamics.plates.map((pl) => pl.pressed),
    doors: () => level.dynamics.doors.map((d) => d.isOpen),
    switches: () =>
      level.switches.map((sw) => ({
        kind: sw.spec.kind,
        target: sw.targetFor(gravity.axis),
        spent: sw.spent,
        inRange: sw.isInRange(player.position),
      })),
    /** Presses E for one frame, as the player would. */
    interact: () => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE' })),
    setGravity: (axis: GravityAxis) => gravity.setAxis(axis),
    grounded: () => player.isGrounded,
    levelCount: () => LEVELS.length,
    exit: () => ({ center: level.exitCenter.asArray(), radius: level.exitRadius }),
  };
}
