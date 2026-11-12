import { DESCENT_DURATION, FALL_DURATION } from '../environment/fall';
import { transition } from '../game/GameState';
import { hintFor } from '../hints';
import type { LevelFactory } from '../level/Builder';
import { CHAMBERS } from '../level/chambers/catalog';
import { cubeUnreachable, DESCENT_OUT_OF_TRIM, dutyLine, recoveryLine } from '../narrative';
import { recordWin, setResume } from '../progress';
import { createSkin, SKIN_IDS, SKIN_LABELS } from '../skins/Skin';
import {
  beep,
  cubeOf,
  nextIndex,
  persistPlaytest,
  persistProgress,
  progressWritable,
  reducedMotionActive,
} from './App';
import type { App } from './App';
import { sandbox, store } from './flags';

/**
 * Chamber flow: starting, restarting, leaving and picking chambers, and swapping the skin under one. Chamber code is
 * lazy, so `startLevel` needs the chamber's module already loaded; anything that may start a chamber the player has
 * not fetched goes through `whenLoaded`.
 */

/** Restarts the chamber; if the player was falling, the facility logs the lost attendant's replacement. */
export function restartLevel(app: App): void {
  const lost = app.fall.falling;
  if (lost) app.playtest?.fall();
  else app.playtest?.restart();
  startLevel(app, app.levelIndex);
  persistPlaytest(app);
  if (lost) app.hud.log(recoveryLine(++app.recoveries));
}

/**
 * The view opens as the attendant is printed (see `HUD.printIn`), with the printer's hum. `repeats` is how many times in
 * a row the chamber has just been started (0 for the full-length print).
 */
export function printIn(app: App, repeats = 0): void {
  app.hud.printIn(reducedMotionActive(app), repeats);
  app.sound.play('print');
}

/** The factory of a chamber whose code is already here; `whenLoaded` is how a caller makes sure of that. */
export function factory(app: App, index: number): LevelFactory {
  const build = app.chambers.get(index);
  if (!build) throw new Error(`Chamber ${index} was started before its code was loaded`);
  return build;
}

/**
 * Runs `then` once chamber `index`'s code is here: at once if it already is (the usual case, since the next chamber is
 * fetched while the current one is played), otherwise when it arrives. If it cannot be fetched the facility says so
 * and nothing else changes, so the player can try again.
 */
export function whenLoaded(app: App, index: number, then: () => void): void {
  if (app.chambers.get(index)) {
    then();
    return;
  }
  app.chambers.load(index).then(then, () => {
    app.hud.log(
      `${cubeUnreachable(cubeOf(index))}\nCould not load the chamber. Check the connection and try again.`,
      8,
    );
    beep(app, 140, 90, 0.15, 'square', 0.08);
  });
}

/** Starts chamber `index`, whose code must already be loaded (see `whenLoaded`). */
export function startLevel(app: App, index: number): void {
  const build = factory(app, index);
  app.level.dispose();
  app.repeatStarts = index === app.levelIndex ? app.repeatStarts + 1 : 0;
  app.levelIndex = index;
  app.playtest?.enter(CHAMBERS[index].id);
  persistPlaytest(app);
  if (progressWritable) {
    setResume(app.progress, CHAMBERS[index].id);
    persistProgress(app);
  }
  app.level = build(app.scene, app.skin);
  if (import.meta.env.DEV && !sandbox && app.level.name !== CHAMBERS[index].name) {
    console.warn(`CHAMBERS[${index}].name is '${CHAMBERS[index].name}' but the chamber is named '${app.level.name}'`);
  }
  app.gravity.setAxis(app.level.entranceAxis);
  app.player.reset(app.level.spawnPosition);
  app.sky.chamberStarted();
  app.fall.reset();
  app.backdrop.setChamber(app.level.bounds);
  // Leaving an ending chamber is the final fall, and a long one.
  app.fall.duration = app.level.ending ? DESCENT_DURATION : FALL_DURATION;
  app.hud.setLevel(app.level.name, app.level.hint);
  if (app.repeatStarts === 0) app.hints.reset();
  // A restart of the same chamber keeps the hint it had reached.
  const chamberId = sandbox ? undefined : CHAMBERS[index]?.id;
  if (app.hints.shown > 0) app.hud.setHint(hintFor(chamberId, app.level.hint, app.hints.shown));
  const cube = cubeOf(index);
  if (cube !== undefined) app.hud.log(dutyLine(cube));
  app.levelTime = 0;
  app.shifts = 0;
  app.undoStack.clear();
  app.cratePreview.invalidate();
  app.outOfTrim = false;
  app.reclaimHold = 0;
  // Behind the title the view is outside the cube; the print-in plays when the title lifts.
  if (app.game.kind !== 'title') printIn(app, app.repeatStarts);
  // The chamber after this one is fetched while this one is played, so moving on does not wait.
  app.chambers.preload(nextIndex(app));
}

/** Swaps the skin in place: the chamber is rebuilt, but the player keeps their spot and gravity. */
export function setSkin(app: App, index: number): void {
  app.level.dispose();
  app.skin.dispose();
  app.skinIndex = ((index % SKIN_IDS.length) + SKIN_IDS.length) % SKIN_IDS.length;
  store.set('skin', app.skinIndex);
  app.skinColorAssist = app.settings.colorAssist;
  app.skin = createSkin(SKIN_IDS[app.skinIndex], app.scene, app.glow, app.skinColorAssist);
  app.level = factory(app, app.levelIndex)(app.scene, app.skin);
  syncPrinter(app);
  app.hud.setSkin(SKIN_LABELS[app.skin.id]);
  app.hud.setGravityAxis(app.gravity.axis, app.skin.hudColor(app.gravity.axis));
}

/** In an ending chamber the printer goes offline once the cube is out of trim: nobody will be printed back here. */
export function syncPrinter(app: App): void {
  app.level.printer.setOnline(!(app.level.ending && app.shifts >= DESCENT_OUT_OF_TRIM));
}

/** The player has left an ending chamber: the clear is saved now, and the final fall begins. */
export function beginDescent(app: App): void {
  const chamberId = CHAMBERS[app.levelIndex]?.id;
  if (progressWritable && chamberId !== undefined) {
    recordWin(app.progress, chamberId, app.levelTime, app.shifts);
    persistProgress(app);
  }
  app.playtest?.clear(app.levelTime, app.shifts);
  persistPlaytest(app);
  app.hud.setSequence(null);
  app.game.send({ type: 'descend' });
}

export function advance(app: App): void {
  if (!transition(app.game.state, { type: 'advance' })) return;
  const next = nextIndex(app);
  if (!app.chambers.get(next)) {
    // Its code is still on the way: the win screen stays up until it lands, then this runs again.
    whenLoaded(app, next, () => advance(app));
    return;
  }
  app.game.send({ type: 'advance' });
  startLevel(app, next);
  // Between chambers is a safe moment to install a waiting update: the next chamber is already saved as the resume point.
  app.applyUpdate?.();
}

/** Starts chamber `index` if it's unlocked. `grabPointer` is false where the browser won't allow it (gamepad). */
export function pickLevel(app: App, index: number, grabPointer = true): void {
  if (!app.chamberSelect.unlocked(index)) {
    beep(app, 140, 90, 0.15, 'square', 0.08);
    return;
  }
  if (!app.chambers.get(index)) {
    // Its code is still on the way: start it when it lands, if the list is still up.
    whenLoaded(app, index, () => {
      if (app.game.kind === 'chamberSelect') pickLevel(app, index, grabPointer);
    });
    return;
  }
  const immediate = app.touch.active || !grabPointer;
  app.game.send({ type: 'pick', immediate });
  startLevel(app, index);
  if (!immediate) {
    // Called from a click or key press, so the browser treats it as a user gesture. If it is refused, fall back
    // to a menu (the title before play has begun, the pause menu after) with a button to try again.
    const refused = () => app.game.send({ type: 'controlLost' });
    try {
      Promise.resolve(app.canvas.requestPointerLock()).catch(refused);
    } catch {
      refused();
    }
  }
}
