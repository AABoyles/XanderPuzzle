import { Color4, Engine, GlowLayer, Scene, Vector3 } from '@babylonjs/core';
import { GravityAxis, GravitySystem } from './gravity/GravitySystem';
import { buildSandbox, LEVELS as CHAMBERS } from './level/chambers';
import { PlayerController } from './player/PlayerController';
import { createSkin, SKIN_IDS, SKIN_LABELS, SkinId } from './skins/Skin';
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
const sandbox = new URLSearchParams(location.search).has('sandbox');
const LEVELS = sandbox ? [buildSandbox] : CHAMBERS;

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
// Resume at the last chamber reached.
let levelIndex = sandbox ? 0 : Math.min(Math.max(Math.floor(store.get('level') ?? 0), 0), LEVELS.length - 1);
// Skin: `?skin=axis|monolith|draft|neon`, else the last one picked with K, else Axis.
const skinParam = new URLSearchParams(location.search).get('skin') as SkinId | null;
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

document.addEventListener('pointerlockchange', () => {
  if (document.pointerLockElement === canvas) hud.hideStartOverlay();
  else if (!hasWon) hud.showStartOverlay();
});
canvas.addEventListener('click', advance);
window.addEventListener('keydown', (e) => {
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

engine.runRenderLoop(() => {
  const dt = engine.getDeltaTime() / 1000;
  if (dt > 0 && !hasWon) {
    levelTime += dt;
    const wasGrounded = player.isGrounded;
    player.update(dt);
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
    hud.setPrompt(anyInRange, target?.spec.kind === 'sequence' ? 'Press [E] to start the cycle' : undefined);

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

    // Safety net: anyone who escapes the geometry gets put back at the entrance.
    if (player.position.length() > 90) startLevel(levelIndex);

    if (Vector3.Distance(player.position, level.exitCenter) <= level.exitRadius) {
      hasWon = true;
      hud.setPrompt(false);
      beep(440, 880, 0.6, 'sine', 0.15);
      const best = store.get(`best.${levelIndex}`);
      const isBest = best === undefined || levelTime < best;
      if (isBest && !sandbox) store.set(`best.${levelIndex}`, levelTime);
      const bestText = isBest ? 'new best!' : `best ${best.toFixed(1)}s`;
      const stats = `${levelTime.toFixed(1)}s (${bestText}) · ${shifts} gravity shift${shifts === 1 ? '' : 's'}`;
      if (finishedAll()) hud.showWin('ALL CHAMBERS CLEARED', `${stats}\n\nClick or press Enter to play again`);
      else hud.showWin('CHAMBER CLEARED', `${stats}\n\nClick or press Enter for the next chamber`);
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
