import {
  Color3,
  Color4,
  DynamicTexture,
  Engine,
  GlowLayer,
  HemisphericLight,
  Mesh,
  MeshBuilder,
  Scene,
  StandardMaterial,
  Vector3,
} from '@babylonjs/core';
import { GravitySystem } from './gravity/GravitySystem';
import { LEVELS } from './level/Level';
import { PlayerController } from './player/PlayerController';
import { HUD } from './ui/HUD';

const canvas = document.getElementById('renderCanvas') as HTMLCanvasElement;
const engine = new Engine(canvas, true, { stencil: true, preserveDrawingBuffer: true }, true);

const scene = new Scene(engine);
scene.clearColor = new Color4(0.01, 0.012, 0.02, 1);
scene.collisionsEnabled = true;

createSkybox(scene);

const ambient = new HemisphericLight('ambient', new Vector3(0.3, 1, 0.2), scene);
ambient.intensity = 0.55;
ambient.groundColor = new Color3(0.15, 0.17, 0.22);

const glow = new GlowLayer('glow', scene);
glow.intensity = 0.7;

const gravity = new GravitySystem('-Y', 22);
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
let levelIndex = Math.min(Math.max(Math.floor(store.get('level') ?? 0), 0), LEVELS.length - 1);
let level = LEVELS[levelIndex](scene);
const player = new PlayerController(scene, canvas, gravity, level.spawnPosition);

const hud = new HUD();
hud.setGravityAxis(gravity.axis);
hud.setLevel(level.name, level.hint);
gravity.onChangeObservable.add(({ axis }) => {
  hud.setGravityAxis(axis);
  hud.flashGravityChange();
});

let hasWon = false;
let levelTime = 0;
let shifts = 0;
const finishedAll = () => levelIndex >= LEVELS.length - 1;

function startLevel(index: number): void {
  level.dispose();
  levelIndex = index;
  store.set('level', index);
  level = LEVELS[levelIndex](scene);
  gravity.setAxis(level.entranceAxis);
  player.reset(level.spawnPosition);
  hud.setLevel(level.name, level.hint);
  hud.hideWin();
  hasWon = false;
  levelTime = 0;
  shifts = 0;
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
    let anyInRange = false;
    for (const sw of level.switches) {
      if (sw.update(dt, gravity, player.position, interactPressed)) {
        shifts++;
        beep(660, 110, 0.5, 'sawtooth', 0.08);
      }
      if (sw.isInRange(player.position) && sw.targetAxis !== gravity.axis) anyInRange = true;
    }
    hud.setPrompt(anyInRange);

    // Safety net: anyone who escapes the geometry gets put back at the entrance.
    if (player.position.length() > 90) startLevel(levelIndex);

    if (Vector3.Distance(player.position, level.exitCenter) <= level.exitRadius) {
      hasWon = true;
      hud.setPrompt(false);
      beep(440, 880, 0.6, 'sine', 0.15);
      const best = store.get(`best.${levelIndex}`);
      const isBest = best === undefined || levelTime < best;
      if (isBest) store.set(`best.${levelIndex}`, levelTime);
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
  };
}

function createSkybox(s: Scene): Mesh {
  const sky = MeshBuilder.CreateSphere('sky', { diameter: 900, sideOrientation: Mesh.BACKSIDE }, s);
  const tex = new DynamicTexture('skyGradient', { width: 4, height: 256 }, s, false);
  const ctx = tex.getContext();
  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, '#0a1420');
  grad.addColorStop(0.55, '#050810');
  grad.addColorStop(1, '#000000');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 4, 256);
  tex.update();

  const mat = new StandardMaterial('skyMat', s);
  mat.diffuseTexture = tex;
  mat.emissiveTexture = tex;
  mat.disableLighting = true;
  mat.backFaceCulling = false;
  sky.material = mat;
  sky.infiniteDistance = true;
  sky.isPickable = false;
  return sky;
}
