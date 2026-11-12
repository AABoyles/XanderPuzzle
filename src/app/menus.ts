import { transition, viewOf } from '../game/GameState';
import type { State } from '../game/GameState';
import { dutyLine, endCard, NOT_RECOVERED } from '../narrative';
import { toggleFullscreen } from '../pwa/fullscreen';
import { PROMPTS } from '../ui/prompts';
import { atPrintBed, cubeOf, persistPlaytest } from './App';
import type { App } from './App';
import { printIn, startLevel } from './chamberFlow';
import { sandbox, shared } from './flags';

export function openLevelSelect(app: App): void {
  if (sandbox && !shared) return;
  app.game.send({ type: 'openChambers' });
}

export function closeLevelSelect(app: App): void {
  // Touch and gamepad have no pointer lock to wait for: closing the menu resumes play.
  const resume = app.touch.active || app.input.lastDevice === 'gamepad' || document.pointerLockElement === app.canvas;
  app.game.send({ type: 'closeChambers', resume });
}

// --- Pause menu ----------------------------------------------------------------------------------
export function showPause(app: App): void {
  app.hud.setPrompt(false);
  app.pauseOpenedAt = performance.now();
  app.pauseMenu.open(app.input.lastDevice);
}

/**
 * Closes the pause menu. With a mouse the menu stays open until the browser grants pointer lock (see the
 * `pointerlockchange` handler); a refusal, such as the cooldown after Esc, leaves it open to try again.
 */
export function resumePlay(app: App, viaGamepad = false): void {
  if (app.game.kind !== 'paused') return;
  if (app.touch.active || viaGamepad) {
    app.game.send({ type: 'resume' });
    return;
  }
  const refused = () => app.pauseMenu.setHint('The browser would not capture the mouse yet. Try Resume again.');
  try {
    Promise.resolve(app.canvas.requestPointerLock()).catch(refused);
  } catch {
    refused();
  }
}

/** Touch detected: no pointer lock, and the player taps the start overlay to begin. */
function syncTouchMode(app: App): void {
  app.keyboardMouse.pointerLockSuspended = true;
  app.input.setLastDevice('touch');
  app.hud.setDevice('touch');
  app.game.send({ type: 'controlLost' });
}

/**
 * Wires the menus to the game: the touch buttons, the pause menu's actions, and the one handler that shows and hides
 * every overlay when the flow changes.
 */
export function wireMenus(app: App): void {
  app.touch.onActivate = () => syncTouchMode(app);
  app.touch.onChambers = () => openLevelSelect(app);
  app.touch.onPause = () => app.game.send({ type: 'pause' });
  /** Touch the screen again after using another device and the on-screen controls come back. */
  window.addEventListener(
    'pointerdown',
    (e) => {
      if (e.pointerType === 'touch' && app.touch.active) app.input.setLastDevice('touch');
    },
    true,
  );

  app.pauseMenu.onResume = () => resumePlay(app, app.gamepadActing);
  app.pauseMenu.onRestart = () => {
    // Refused during the final fall, which is final.
    if (!transition(app.game.state, { type: 'restart' })) return;
    app.playtest?.restart();
    startLevel(app, app.levelIndex);
    persistPlaytest(app);
    app.game.send({ type: 'restart' });
    resumePlay(app, app.gamepadActing);
  };
  app.pauseMenu.onChambers = () => openLevelSelect(app);
  app.pauseMenu.onToggleFullscreen = () => {
    void toggleFullscreen().then(() => app.pauseMenu.refresh());
  };
  app.pauseMenu.onUpdate = () => app.applyUpdate?.();

  /** Every overlay, pointer-lock and touch side effect of a flow change lives here. */
  app.game.onChange = (prev: State, next: State) => {
    const was = viewOf(prev);
    const now = viewOf(next);
    const resumed = was.pause && !now.pause && !now.select && !now.title;
    if (was.pause && !now.pause) {
      app.pauseMenu.close();
      app.keyboardMouse.pointerLockSuspended = app.touch.active;
      if (resumed) app.input.drain(); // nothing pressed or moved while paused should fire now
    }
    if (was.select && !now.select) {
      app.hud.hideLevelSelect();
      app.keyboardMouse.pointerLockSuspended = app.touch.active;
    }
    if (was.win && !now.win) app.hud.hideWin();
    if (was.title && !now.title) {
      app.hud.hideStartOverlay();
      if (app.playtest && next.kind === 'playing') app.hud.log('PLAYTEST LOG ON · save it from the pause menu', 8);
      // Play begins: the attendant is printed, and the facility logs it.
      if (next.kind === 'playing' && atPrintBed(app)) {
        const cube = cubeOf(app.levelIndex);
        if (cube !== undefined) app.hud.log(dutyLine(cube));
        printIn(app);
      }
    }
    if (!was.title && now.title) app.hud.showStartOverlay();
    if (!was.select && now.select) {
      app.keyboardMouse.pointerLockSuspended = true;
      if (document.pointerLockElement) document.exitPointerLock();
      app.chamberSelect.show(Math.max(0, app.levelIndex), app.input.lastDevice);
    }
    if (!was.pause && now.pause) {
      app.keyboardMouse.pointerLockSuspended = true;
      if (document.pointerLockElement) document.exitPointerLock();
      showPause(app);
    }
    if (!was.win && now.win) app.hud.showWin(app.winMessage.title, app.winMessage.body);
    if (!was.ending && now.ending) {
      app.hud.setPrompt(false);
      const body = endCard(app.recoveries, cubeOf(app.levelIndex));
      app.hud.showEnding(NOT_RECOVERED, `${body}\n\nSHIFTBOUND\n\n${PROMPTS[app.input.lastDevice].title}`);
    }
    if (was.ending && !now.ending) app.hud.hideEnding();
  };

  if (app.touch.active) syncTouchMode(app); // touch was detected at startup, before the callback existed
}
