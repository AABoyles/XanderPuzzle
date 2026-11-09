import {
  Color3,
  Color4,
  DynamicTexture,
  Engine,
  GlowLayer,
  HemisphericLight,
  Mesh,
  MeshBuilder,
  PointLight,
  Scene,
  StandardMaterial,
  Vector3,
} from '@babylonjs/core';
import { GravitySystem } from './gravity/GravitySystem';
import { buildLevel } from './level/Level';
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
const level = buildLevel(scene);

// A couple of warm point lights near the switches so the vault doesn't feel flat.
addAccentLight(scene, new Vector3(0, -6, 10));
addAccentLight(scene, new Vector3(9, 0, 6));
addAccentLight(scene, new Vector3(0, -9, -14));

const player = new PlayerController(scene, canvas, gravity, level.spawnPosition);

const hud = new HUD();
hud.setGravityAxis(gravity.axis);
gravity.onChangeObservable.add(({ axis }) => {
  hud.setGravityAxis(axis);
  hud.flashGravityChange();
});

document.addEventListener('pointerlockchange', () => {
  if (document.pointerLockElement === canvas && !hasWon) {
    hud.hideStartOverlay();
  }
});

let hasWon = false;

engine.runRenderLoop(() => {
  const dt = engine.getDeltaTime() / 1000;
  if (dt > 0 && !hasWon) {
    player.update(dt);

    const interactPressed = player.consumeInteract();
    let anyInRange = false;
    for (const sw of level.switches) {
      sw.update(dt, gravity, player.position, interactPressed);
      if (sw.isInRange(player.position)) anyInRange = true;
    }
    hud.setPrompt(anyInRange);

    if (Vector3.Distance(player.position, level.exitCenter) <= level.exitRadius) {
      hasWon = true;
      hud.setPrompt(false);
      hud.showWin();
      if (document.pointerLockElement === canvas) document.exitPointerLock();
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
    setGravityAxis: (axis: Parameters<typeof gravity.setAxis>[0]) => gravity.setAxis(axis),
    setPosition: (x: number, y: number, z: number) => player.collider.position.set(x, y, z),
    hasWon: () => hasWon,
  };
}

function addAccentLight(s: Scene, position: Vector3): void {
  const light = new PointLight(`accent_${position.toString()}`, position, s);
  light.diffuse = new Color3(0.9, 0.75, 0.55);
  light.intensity = 0.35;
  light.range = 18;
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
