import { Color4 } from '@babylonjs/core/Maths/math.color';
import { Engine } from '@babylonjs/core/Engines/engine';
import { GlowLayer } from '@babylonjs/core/Layers/glowLayer';
import { Scene } from '@babylonjs/core/scene';
import { AudioEngine } from '../audio/AudioEngine';
import { FallTracker } from '../environment/fall';
import { SpaceBackdrop } from '../environment/SpaceBackdrop';
import type { ChamberSnapshot } from '../game/chamberSnapshot';
import { GameState } from '../game/GameState';
import { UndoStack } from '../game/undo';
import { GravitySystem } from '../gravity/GravitySystem';
import { HintLadder } from '../hints';
import { GamepadInput } from '../input/GamepadInput';
import { InputManager } from '../input/InputManager';
import { KeyboardMouseInput } from '../input/KeyboardMouseInput';
import { TouchInput } from '../input/TouchInput';
import { CHAMBERS, ChamberLoader, SANDBOX } from '../level/chambers';
import { sharedGuest } from './sharedChamber';
import { CratePreview } from '../level/CratePreview';
import { loadFonts } from '../level/fonts';
import { PlayerController } from '../player/PlayerController';
import { PlaytestRecorder, loadPlaytest, playtestFileName } from '../playtest';
import { furthestCleared, isUnlocked, loadProgress, resetProgress, resumeIndex } from '../progress';
import { routeFromHash } from '../level/route';
import { isFullscreen } from '../pwa/fullscreen';
import { loadSettings, saveSettings } from '../settings';
import { createSkin, DEFAULT_SKIN, SKIN_IDS, SKIN_LABELS, SkinId } from '../skins/Skin';
import { TitleView } from '../title/TitleView';
import { downloadText } from '../ui/download';
import { HUD } from '../ui/HUD';
import { PauseMenu } from '../ui/PauseMenu';
import {
  beep,
  CHAMBER_IDS,
  fullscreenMode,
  GUEST_INDEX,
  persistPlaytest,
  progressStorage,
  settingsStorage,
  systemReducedMotion,
} from './App';
import type { App } from './App';
import { applySettings } from './applySettings';
import { ChamberSelect } from './ChamberSelect';
import { params, playtesting, sandbox, shared, storageAvailable, store, unlockAll } from './flags';
import { Sky } from './Sky';

/**
 * Builds the running game: the engine and scene, the first chamber, input, HUD, sound and the rest, and returns them
 * as one `App`. It waits for the first chamber's code; the others arrive as they are needed. Nothing here runs the
 * game: `main.ts` wires the handlers and starts the frame loop.
 */
/** Ends the current task so the browser can paint or handle input; start-up is split into several short ones. */
const yieldToMain = () => new Promise<void>((resolve) => setTimeout(resolve));

export async function createApp(): Promise<App> {
  const canvas = document.getElementById('renderCanvas') as HTMLCanvasElement;
  const engine = new Engine(canvas, true, { stencil: true, preserveDrawingBuffer: true }, true);
  // Babylon's default of 1 puts the canvas ahead of everything in the tab order; 0 keeps it in document order.
  engine.canvasTabIndex = 0;

  await yieldToMain();
  const scene = new Scene(engine);
  scene.clearColor = new Color4(0.01, 0.012, 0.02, 1);
  scene.collisionsEnabled = true;

  await yieldToMain();
  const glow = new GlowLayer('glow', scene);
  glow.intensity = 0.7;

  const gravity = new GravitySystem('-Y', 22);
  // A shared chamber is a guest in the game: it is built from its spec, and the chamber list is the real one.
  const guest = await sharedGuest();
  const chambers = new ChamberLoader(params.has('sandbox') ? [SANDBOX] : CHAMBERS);
  const playtest = playtesting ? new PlaytestRecorder(() => new Date().toISOString()) : undefined;
  // Progress is keyed by chamber id.
  const progress = loadProgress(progressStorage(), CHAMBER_IDS);
  // Resume at the last chamber reached.
  // `#<id>` names a chamber to start at; it must be open, like a pick from the chamber list.
  const route = routeFromHash(location.hash);
  const routed = route?.kind === 'chamber' ? CHAMBER_IDS.indexOf(route.id) : -1;
  const routedOpen = routed >= 0 && isUnlocked(routed, furthestCleared(progress, CHAMBER_IDS), unlockAll);
  const levelIndex = guest
    ? GUEST_INDEX
    : sandbox
      ? 0
      : routedOpen
        ? routed
        : Math.min(resumeIndex(progress, CHAMBER_IDS), chambers.count - 1);
  // Skin: `?skin=station|axis|monolith|draft|neon`, else the last one picked with K, else Station.
  const skinParam = params.get('skin') as SkinId | null;
  const storedSkin = Math.floor(store.get('skin') ?? SKIN_IDS.indexOf(DEFAULT_SKIN));
  const skinIndex =
    skinParam && SKIN_IDS.includes(skinParam)
      ? SKIN_IDS.indexOf(skinParam)
      : ((storedSkin % SKIN_IDS.length) + SKIN_IDS.length) % SKIN_IDS.length;
  // The colour-blind palette is read at start-up from the same saved settings `applySettings` uses.
  const skinColorAssist = loadSettings(storageAvailable ? localStorage : null).colorAssist;
  await yieldToMain();
  const skin = createSkin(SKIN_IDS[skinIndex], scene, glow, skinColorAssist);
  // Placards draw at once in fallback fonts and redraw when the bundled ones arrive.
  void loadFonts();
  // The first chamber's code is fetched before anything is built; the rest arrive as they are needed.
  const level = (guest ?? (await chambers.load(levelIndex)))(scene, skin);
  await yieldToMain();
  const keyboardMouse = new KeyboardMouseInput(canvas);
  const touch = new TouchInput();
  const gamepad = new GamepadInput();
  const input = new InputManager([keyboardMouse, touch, gamepad], touch.active ? 'touch' : 'keyboard');
  const player = new PlayerController(scene, gravity, level.spawnPosition, input);

  const hud = new HUD();
  hud.setDevice(input.lastDevice);

  // Sound: music, recorded effects and the wind of a fall. Browsers only allow it after the player has acted, so the
  // first click, key or tap unlocks it.
  const sound = new AudioEngine();
  for (const type of ['click', 'keydown', 'pointerup', 'touchend'] as const) {
    window.addEventListener(type, () => sound.unlock(), { capture: true, passive: true });
  }

  const game = new GameState();
  hud.configureFullscreen(fullscreenMode());
  hud.setFullscreenState(isFullscreen());

  // The menu's and the gravity observer's callbacks run long after this function returns, by which time `app` exists.
  // eslint-disable-next-line prefer-const -- the object is built below, after the callbacks that read it are made
  let app: App;
  const pauseMenu = new PauseMenu({
    texture: hud.texture,
    getSettings: () => app.settings,
    systemReducedMotion,
    onSettingsChange: (next, changed) => {
      app.settings = next;
      saveSettings(settingsStorage(), app.settings);
      applySettings(app);
      if (changed === 'volume' || changed === 'muted') beep(app, 520, 520, 0.08, 'square', 0.06);
    },
    onResetProgress: () => {
      app.progress = resetProgress(progressStorage());
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
          playtest.enter(CHAMBERS[app.levelIndex].id);
          persistPlaytest(app);
          pauseMenu.setHint('Playtest log cleared');
        }
      : undefined,
    fullscreen: () => ({ kind: fullscreenMode(), on: isFullscreen() }),
    hasChamberSelect: !sandbox || shared,
  });
  pauseMenu.setDevice(input.lastDevice);
  input.onDeviceChange = (device) => {
    hud.setDevice(device);
    pauseMenu.setDevice(device);
  };
  hud.setGravityAxis(gravity.axis, skin.hudColor(gravity.axis));
  hud.setLevel(level.name, level.hint);
  hud.setSkin(SKIN_LABELS[skin.id]);
  gravity.onChangeObservable.add(({ axis }) => {
    hud.setGravityAxis(axis, app.skin.hudColor(axis));
    hud.flashGravityChange();
  });

  await yieldToMain();
  const backdrop = new SpaceBackdrop(scene, glow);
  backdrop.setChamber(level.bounds);
  const fall = new FallTracker();

  // The title's outside view (`src/title/TitleView.ts`) is on screen only while `sky.titleShot` holds.
  const titleView = new TitleView(scene);
  scene.activeCamera = player.camera;
  const sky = new Sky(scene, backdrop, titleView, player, gravity, fall);

  app = {
    canvas,
    engine,
    scene,
    glow,
    gravity,
    chambers,
    keyboardMouse,
    touch,
    gamepad,
    input,
    player,
    hud,
    pauseMenu,
    sound,
    game,
    backdrop,
    fall,
    titleView,
    sky,
    hints: new HintLadder(),
    undoStack: new UndoStack<ChamberSnapshot>(),
    cratePreview: new CratePreview(),
    guest,
    chamberSelect: new ChamberSelect(
      hud,
      () => app.progress,
      (index) => chambers.preload(index),
    ),
    playtest,
    level,
    levelIndex,
    skin,
    skinIndex,
    skinColorAssist,
    settings: loadSettings(settingsStorage()),
    progress,
    levelTime: 0,
    shifts: 0,
    reclaimHold: 0,
    outOfTrim: false,
    repeatStarts: 0,
    simClock: 0,
    recoveries: 0,
    winMessage: { title: '', body: '' },
    pauseOpenedAt: 0,
    gamepadActing: false,
    applyUpdate: undefined,
  };

  // The log continues a stored one, so a reload keeps its visits; the first chamber's visit starts at once.
  playtest?.begin(input.lastDevice, SKIN_IDS[skinIndex], loadPlaytest() ?? undefined);
  playtest?.enter(CHAMBERS[levelIndex].id);
  persistPlaytest(app);
  return app;
}
