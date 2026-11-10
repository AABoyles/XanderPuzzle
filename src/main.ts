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
import { createSkin, SKIN_IDS, SKIN_LABELS, SkinId } from './skins/Skin';
import { formatBest, furthestCleared, isUnlocked, recordCleared } from './progress';
import { HUD } from './ui/HUD';

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
input.onDeviceChange = (device) => hud.setDevice(device);
/** Touch detected: no pointer lock, and the player taps the start overlay to begin. */
const syncTouchMode = () => {
  keyboardMouse.pointerLockSuspended = true;
  input.setLastDevice('touch');
  hud.setDevice('touch');
  if (!levelSelectOpen() && !hasWon) hud.showStartOverlay();
};
touch.onActivate = syncTouchMode;
touch.onChambers = () => openLevelSelect();
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
let levelTime = 0;
let shifts = 0;
const finishedAll = () => levelIndex >= LEVELS.length - 1;
/** Paused with the start overlay (gamepad Start): the player stays frozen until they resume. */
let paused = false;

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
}

// --- Chamber select ------------------------------------------------------------------------------
let selectIndex = 0;
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

function closeLevelSelect(): void {
  if (!levelSelectOpen()) return;
  hud.hideLevelSelect();
  keyboardMouse.pointerLockSuspended = touch.active;
  // Touch and gamepad have no pointer lock to wait for: closing the menu resumes play.
  if (!touch.active && input.lastDevice !== 'gamepad' && !hasWon && document.pointerLockElement !== canvas) hud.showStartOverlay();
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
  closeLevelSelect();
  startLevel(index);
  if (touch.active || !grabPointer) hud.hideStartOverlay();
  else {
    // Called from a click or key press, so the browser treats it as a user gesture; failure just leaves the overlay.
    Promise.resolve(canvas.requestPointerLock()).catch(() => {});
  }
}

if (touch.active) syncTouchMode(); // touch was detected at startup, before the callback existed
hud.onOpenLevelSelect = openLevelSelect;
hud.onCloseLevelSelect = closeLevelSelect;
hud.onPickLevel = (i) => pickLevel(i);
hud.onHoverLevel = (i) => {
  selectIndex = i;
  hud.highlightLevel(i);
};

document.addEventListener('pointerlockchange', () => {
  if (touch.active) return;
  if (document.pointerLockElement === canvas) hud.hideStartOverlay();
  else if (!hasWon && !levelSelectOpen()) hud.showStartOverlay();
});
canvas.addEventListener('click', () => {
  if (levelSelectOpen()) return;
  // A tap on the start overlay begins play without pointer lock.
  if (touch.active && hud.isStartOverlayVisible) hud.hideStartOverlay();
  else advance();
});
window.addEventListener('keydown', (e) => {
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
  if (e.code === 'KeyL') openLevelSelect();
  if (e.code === 'KeyK') setSkin(skinIndex + (e.shiftKey ? -1 : 1));
  if (e.code === 'Enter') advance();
});

// --- Tiny synthesized sound effects (no assets) ------------------------------------------------
let audio: AudioContext | undefined;
function beep(from: number, to: number, duration: number, type: OscillatorType = 'sine', volume = 0.12): void {
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

engine.runRenderLoop(() => {
  const dt = engine.getDeltaTime() / 1000;
  const frame = input.read(dt);
  const pad = gamepad.menu;
  // Actions below use up this frame's presses, so the player doesn't also act on them.
  let consumed = levelSelectOpen();
  if (levelSelectOpen()) {
    if (pad.up) moveSelection(-1);
    if (pad.down) moveSelection(1);
    if (pad.confirm) pickLevel(selectIndex, false);
    else if (pad.back || pad.select) closeLevelSelect();
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
      hud.hideStartOverlay();
      consumed = true;
    }
  } else if (frame.pause) {
    hud.showStartOverlay();
    paused = true;
    consumed = true;
  }
  if (!hud.isStartOverlayVisible) paused = false;
  touch.setVisible(touch.active && input.lastDevice === 'touch' && !hasWon && !levelSelectOpen() && !hud.isStartOverlayVisible);
  // On desktop with a keyboard the player can already move while the pointer is unlocked; other devices wait.
  const waitingToStart = hud.isStartOverlayVisible && (paused || input.lastDevice !== 'keyboard');
  if (dt > 0 && !consumed && !hasWon && !levelSelectOpen() && !waitingToStart) {
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
        beep(660, 110, 0.5, 'sawtooth', 0.08);
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
        beep(660, 110, 0.5, 'sawtooth', 0.08);
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
      if (finishedAll()) hud.showWin('ALL CHAMBERS CLEARED', `${stats}\n\n${text.again}${select}`);
      else hud.showWin('CHAMBER CLEARED', `${stats}\n\n${text.next}${select}`);
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
    dt,
  });
  lastPosition.copyFrom(player.position);

  scene.render();
});

window.addEventListener('resize', () => engine.resize());

if (import.meta.env.DEV) {
  // Lightweight inspection hook for manual/automated testing in dev builds only.
  (window as unknown as Record<string, unknown>).__debug = {
    position: () => player.position.asArray(),
    gravityAxis: () => gravity.axis,
    setPosition: (x: number, y: number, z: number) => player.collider.position.set(x, y, z),
    hasWon: () => hasWon,
    level: () => levelIndex,
    startLevel,
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
