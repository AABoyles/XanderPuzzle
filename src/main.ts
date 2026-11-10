import { Color4, Engine, GlowLayer, Scene, Vector3 } from '@babylonjs/core';
import { GravitySystem } from './gravity/GravitySystem';
import { buildSandbox, CHAMBERS, LEVELS as CHAMBER_LEVELS } from './level/chambers';
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
const player = new PlayerController(scene, canvas, gravity, level.spawnPosition);

const hud = new HUD();
hud.setGravityAxis(gravity.axis, skin.hudColor(gravity.axis));
hud.setLevel(level.name, level.hint);
hud.setSkin(SKIN_LABELS[skin.id]);
gravity.onChangeObservable.add(({ axis }) => {
  hud.setGravityAxis(axis, skin.hudColor(axis));
  hud.flashGravityChange();
});

let hasWon = false;
let levelTime = 0;
let shifts = 0;
const finishedAll = () => levelIndex >= LEVELS.length - 1;

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
  player.pointerLockSuspended = true;
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
  const devices = 'Arrows/D-pad choose · Enter/A play · Esc/B back';
  hud.showLevelSelect(entries, selectIndex, unlockAll && storageAvailable ? `${devices} · all unlocked` : devices);
}

function closeLevelSelect(): void {
  if (!levelSelectOpen()) return;
  hud.hideLevelSelect();
  player.pointerLockSuspended = false;
  if (!hasWon && document.pointerLockElement !== canvas) hud.showStartOverlay();
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
  if (grabPointer) {
    // Called from a click or key press, so the browser treats it as a user gesture; failure just leaves the overlay.
    Promise.resolve(canvas.requestPointerLock()).catch(() => {});
  }
}

hud.onOpenLevelSelect = openLevelSelect;
hud.onCloseLevelSelect = closeLevelSelect;
hud.onPickLevel = (i) => pickLevel(i);
hud.onHoverLevel = (i) => {
  selectIndex = i;
  hud.highlightLevel(i);
};

document.addEventListener('pointerlockchange', () => {
  if (document.pointerLockElement === canvas) hud.hideStartOverlay();
  else if (!hasWon && !levelSelectOpen()) hud.showStartOverlay();
});
canvas.addEventListener('click', () => {
  if (!levelSelectOpen()) advance();
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
  if (e.code === 'KeyR' && !hasWon) startLevel(levelIndex);
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

// Gamepad: Back/Select opens the chamber select; in it the D-pad or left stick moves, A plays and B goes back.
// (Full gamepad play is #9; this only drives the menu.)
const padHeld = new Set<string>();
function pollGamepadMenu(): void {
  const pads = typeof navigator.getGamepads === 'function' ? navigator.getGamepads() : [];
  const now = new Set<string>();
  for (const pad of pads) {
    if (!pad) continue;
    const pressed = (i: number) => pad.buttons[i]?.pressed ?? false;
    const stickY = pad.axes[1] ?? 0;
    if (pressed(12) || stickY < -0.6) now.add('up');
    if (pressed(13) || stickY > 0.6) now.add('down');
    if (pressed(0)) now.add('a');
    if (pressed(1)) now.add('b');
    if (pressed(8)) now.add('select');
  }
  const tapped = (k: string) => now.has(k) && !padHeld.has(k);
  if (levelSelectOpen()) {
    if (tapped('up')) moveSelection(-1);
    if (tapped('down')) moveSelection(1);
    if (tapped('a')) pickLevel(selectIndex, false);
    if (tapped('b') || tapped('select')) closeLevelSelect();
  } else if (tapped('select')) {
    openLevelSelect();
  }
  padHeld.clear();
  for (const k of now) padHeld.add(k);
}

engine.runRenderLoop(() => {
  const dt = engine.getDeltaTime() / 1000;
  pollGamepadMenu();
  if (dt > 0 && !hasWon && !levelSelectOpen()) {
    levelTime += dt;
    const wasGrounded = player.isGrounded;
    player.update(dt);
    if (!wasGrounded && player.isGrounded) beep(110, 60, 0.12, 'triangle', 0.15);

    const interactPressed = player.consumeInteract();
    // Only the nearest usable lever responds, so two levers within reach never both fire.
    let target: (typeof level.switches)[number] | undefined;
    for (const sw of level.switches) {
      if (!sw.isInRange(player.position) || !gravity.isAdjacentTo(sw.targetAxis)) continue;
      if (!target || sw.distanceTo(player.position) < target.distanceTo(player.position)) target = sw;
    }
    for (const sw of level.switches) {
      if (sw.update(dt, gravity, player.position, interactPressed && sw === target)) {
        shifts++;
        beep(660, 110, 0.5, 'sawtooth', 0.08);
      }
    }
    const anyInRange = target !== undefined;
    hud.setPrompt(anyInRange);

    const dyn = level.update(dt, gravity.vector, player.position);
    if (dyn.impact > 4) beep(90, 45, 0.18, 'square', Math.min(0.2, dyn.impact / 150));
    if (dyn.plateChanged) beep(520, 520, 0.08, 'square', 0.06);
    if (dyn.doorChanged) beep(180, 360, 0.3, 'triangle', 0.12);

    // Safety net: anyone who escapes the geometry gets put back at the entrance.
    if (player.position.length() > 90) startLevel(levelIndex);

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
      const select = sandbox ? '' : '\nL for chamber select';
      if (finishedAll()) hud.showWin('ALL CHAMBERS CLEARED', `${stats}\n\nClick or press Enter to play again${select}`);
      else hud.showWin('CHAMBER CLEARED', `${stats}\n\nClick or press Enter for the next chamber${select}`);
    }
  }

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
  };
}
