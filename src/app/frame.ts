import { isFrozen, showsTouchControls, simulates, transition } from '../game/GameState';
import { stormLine } from '../narrative';
import { simDelta } from '../time';
import { atPrintBed, beep, LIGHTS_FROM, reducedMotionActive } from './App';
import type { App } from './App';
import { advance, pickLevel, restartLevel } from './chamberFlow';
import { stepChamber } from './chamberStep';
import { sandbox } from './flags';
import { closeLevelSelect, openLevelSelect, resumePlay } from './menus';
import { undoLastShift } from './shifts';

/** One frame: menu input, the chamber's step, the sky, the sound of a fall, and the draw. */
export function runFrame(app: App): void {
  // The one frame delta every system uses: clamped so a hitch or hidden tab advances them all by the same bounded step.
  const dt = simDelta(app.engine.getDeltaTime() / 1000);
  const frame = app.input.read(dt);
  const pad = app.gamepad.menu;
  // Actions below use up this frame's presses, so the player doesn't also act on them.
  let consumed = app.game.kind === 'chamberSelect';
  if (app.game.kind === 'chamberSelect') {
    if (pad.up) app.chamberSelect.move(-1);
    if (pad.down) app.chamberSelect.move(1);
    if (pad.confirm) pickLevel(app, app.chamberSelect.index, false);
    else if (pad.back || pad.select) closeLevelSelect(app);
  } else if (app.game.kind === 'paused') {
    // Gamepad drives the menu; keyboard and pointer are handled by events.
    app.gamepadActing = true;
    if (pad.up) app.pauseMenu.move(-1);
    if (pad.down) app.pauseMenu.move(1);
    if (pad.left) app.pauseMenu.adjust(-1);
    if (pad.right) app.pauseMenu.adjust(1);
    if (frame.pause) resumePlay(app, true);
    else if (pad.confirm) app.pauseMenu.activate();
    else if (pad.back) app.pauseMenu.back();
    app.gamepadActing = false;
    consumed = true;
  } else if (pad.select) {
    openLevelSelect(app);
    consumed = true;
  } else if (frame.restart && app.game.kind !== 'won' && transition(app.game.state, { type: 'restart' })) {
    restartLevel(app);
    app.game.send({ type: 'restart' });
    consumed = true;
  } else if (frame.undo && (app.game.kind === 'playing' || app.game.kind === 'falling')) {
    if (undoLastShift(app)) consumed = true;
    else beep(app, 140, 90, 0.15, 'square', 0.08);
  } else if (app.game.kind === 'won' || app.game.kind === 'ended') {
    if (pad.confirm) {
      advance(app);
      consumed = true;
    }
  } else if (app.game.kind === 'title') {
    // A or Start begins play (or resumes) where there is no pointer lock to wait for.
    if (pad.confirm || frame.pause) {
      app.game.send({ type: 'begin' });
      consumed = true;
    }
  } else if (frame.pause) {
    app.game.send({ type: 'pause' });
    consumed = true;
  }
  app.touch.setVisible(app.touch.active && app.input.lastDevice === 'touch' && showsTouchControls(app.game.state));
  // On desktop with a keyboard the player can already move while the pointer is unlocked on the title screen;
  // other devices wait. Any menu freezes everything: the player, the timer, the sequencer, dynamics and falling.
  const frozen = isFrozen(app.game.state, app.input.lastDevice);
  if (dt > 0 && !consumed && simulates(app.game.state, app.input.lastDevice)) stepChamber(app, dt, frame);

  // The camera in use and everything outside the chamber: the title's view from outside, the planet, the backdrop.
  const view = app.sky.update({
    dt,
    frozen,
    kind: app.game.kind,
    titleShot: app.game.kind === 'title' && !sandbox && atPrintBed(app),
    level: app.level,
    levelIndex: app.levelIndex,
    levelCount: app.chambers.count,
    lightsFrom: sandbox ? -1 : LIGHTS_FROM,
    reducedMotion: reducedMotionActive(app),
  });
  // The air of the fall: silence beside the cube, a roar by the end. It stops dead when the fall does.
  const inFall = app.fall.falling && !frozen && app.game.kind !== 'ended' && app.game.kind !== 'won';
  app.sound.setFall(inFall ? app.fall.time / app.fall.duration : 0);
  // A storm breaking where the Crown can be seen (a window, or out in a fall) is logged: it is what the Crown is for.
  const seen = !sandbox && !app.sky.titleShot && app.game.kind !== 'ended' && (app.level.vista || app.fall.falling);
  if (view.stormBroke && seen) {
    app.hud.log(stormLine(1 - view.darkFraction), 8);
    beep(app, 60, 38, 2.4, 'sawtooth', 0.04);
  }

  app.scene.render();
}
