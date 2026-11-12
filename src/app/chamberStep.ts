import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { impactGain } from '../audio/sounds';
import { distanceOutside } from '../environment/fall';
import type { Vec3 } from '../environment/fall';
import { takeSnapshot } from '../game/chamberSnapshot';
import { RECLAIM_HOLD, touchesPlate } from '../game/reclaim';
import { hintFor } from '../hints';
import type { InputFrame } from '../input/InputSource';
import { CHAMBERS } from '../level/chambers/catalog';
import { descentAlarm, MASS_RELEASED, winTitle, workLog } from '../narrative';
import { recordWin } from '../progress';
import { PROMPTS } from '../ui/prompts';
import {
  beep,
  cubeOf,
  finishedAll,
  persistPlaytest,
  persistProgress,
  progressWritable,
  reducedMotionActive,
  shiftSound,
  snapshotTargets,
} from './App';
import type { App } from './App';
import { beginDescent, restartLevel, syncPrinter } from './chamberFlow';
import { sandbox } from './flags';
import { checkTrim } from './shifts';

/**
 * One frame of the chamber itself: the player, the levers, the timed cycle, crates and doors, falling out, and the
 * win on the reclaimer's plate. Runs only while the game simulates (not in a menu).
 */
export function stepChamber(app: App, dt: number, frame: InputFrame): void {
  app.levelTime += dt;
  app.playtest?.tick(dt);
  // Time on the title screen does not count towards the hint ladder; neither does a menu or the win.
  if (app.game.kind === 'playing' || app.game.kind === 'falling') app.hints.tick(dt);
  app.simClock += dt;
  // The hint line only changes while the player is playing.
  const tier = !sandbox && app.game.kind === 'playing' ? app.hints.rise(app.repeatStarts) : undefined;
  if (tier) {
    app.playtest?.hint(tier);
    app.hud.setHint(hintFor(CHAMBERS[app.levelIndex]?.id, app.level.hint, tier));
    beep(app, 440, 440, 0.12, 'sine', 0.04);
  }
  const wasGrounded = app.player.isGrounded;
  app.player.update(dt, frame);
  if (!wasGrounded && app.player.isGrounded) app.sound.play('land');

  const interactPressed = app.player.consumeInteract();
  // Only the nearest usable lever responds, so two levers within reach never both fire.
  let target: (typeof app.level.switches)[number] | undefined;
  for (const sw of app.level.switches) {
    if (!sw.isInRange(app.player.position) || !sw.canUse(app.gravity.axis)) continue;
    if (!target || sw.distanceTo(app.player.position) < target.distanceTo(app.player.position)) target = sw;
  }
  app.cratePreview.refresh(app.level, target, app.gravity, app.player.position, app.fall.falling, app.simClock);
  // Saved before the throw, so undo can take it back. Only a throw that fires is kept: `canFire` mirrors `update`.
  const saved =
    interactPressed && target?.canFire(app.gravity.axis, app.player.position) && !app.level.ending
      ? takeSnapshot(snapshotTargets(app), app.shifts)
      : undefined;
  for (const sw of app.level.switches) {
    if (sw.update(dt, app.gravity, app.player.position, interactPressed && sw === target)) {
      if (saved) app.undoStack.push(saved);
      app.cratePreview.invalidate();
      // Taking gravity back by hand stops a running sequence.
      if (sw.spec.kind !== 'sequence') app.level.sequencer?.stop();
      app.shifts++;
      app.playtest?.shift();
      shiftSound(app, app.gravity.axis);
      checkTrim(app);
      // In the Descent, the facility objects to every throw.
      if (app.level.ending) {
        app.hud.log(descentAlarm(app.shifts - 1, cubeOf(app.levelIndex) ?? ''), 9);
        const wasOnline = app.level.printer.online;
        syncPrinter(app);
        // The printer winds down: this cube is off the schedule.
        if (wasOnline && !app.level.printer.online) beep(app, 520, 40, 1.6, 'sawtooth', 0.05);
      }
    }
  }
  const anyInRange = target !== undefined;
  app.touch.setInteractAvailable(anyInRange);
  const text = PROMPTS[app.input.lastDevice];
  if (app.game.kind === 'descending') app.hud.setPrompt(false);
  else if (app.fall.falling) app.hud.setPrompt(true, text.void);
  else if (target?.spec.kind === 'sequence') app.hud.setPrompt(anyInRange, text.cycle);
  else app.hud.setPrompt(anyInRange);

  const seq = app.level.sequencer;
  if (seq?.active) {
    const next = seq.update(dt);
    if (next) {
      app.gravity.setAxis(next);
      app.shifts++;
      app.playtest?.shift();
      shiftSound(app, next);
    } else if (seq.remaining < 3 && Math.ceil(seq.remaining) !== Math.ceil(seq.remaining + dt)) {
      // Tick on each of the last three seconds.
      beep(app, 880, 880, 0.05, 'square', 0.05);
    }
    app.hud.setSequence(seq.next, seq.remaining, app.skin.hudColor(seq.next));
  } else {
    app.hud.setSequence(null);
  }

  const dyn = app.level.update(dt, app.gravity.vector, app.player.position);
  // A ballast mass stopping against a wall: louder the faster it came in.
  app.sound.play('impact', impactGain(dyn.impact));
  if (dyn.plateChanged) beep(app, 520, 520, 0.08, 'square', 0.06);
  if (dyn.doorChanged) beep(app, 180, 360, 0.3, 'triangle', 0.12);
  if (dyn.crateLost) {
    beep(app, 300, 60, 0.9, 'sine', 0.1);
    app.hud.log(MASS_RELEASED);
  }

  // Anyone who escapes the geometry falls through space for a while, then is put back at the entrance.
  // Leaving an ending chamber is the final fall instead: it is the exit, and it ends on the end card.
  app.fall.update(dt, distanceOutside(app.level.bounds, app.player.position.asArray() as Vec3));
  if (app.game.kind === 'descending') {
    if (app.fall.finished) app.game.send({ type: 'end' });
  } else if (app.fall.finished) {
    restartLevel(app);
    app.game.send({ type: 'respawn' });
  } else if (app.level.ending && app.fall.falling) {
    beginDescent(app);
  } else app.game.send({ type: app.fall.falling ? 'fell' : 'recovered' });

  // A chamber is won on the reclaimer's plate: stand on it (touching it counts, under any gravity) and after a
  // moment it takes the attendant. A level without a reclaimer falls back to reaching its exit point.
  let reclaimed = false;
  const reclaimer = app.level.reclaimer;
  if (app.level.ending) {
    // No reclaimer: the way out is the fall.
  } else if (reclaimer) {
    const on = touchesPlate(app.player.position, reclaimer.trigger);
    if (reclaimer.setPressed(on)) beep(app, on ? 520 : 390, on ? 520 : 390, 0.08, 'square', 0.06);
    app.reclaimHold = on ? app.reclaimHold + dt : 0;
    reclaimed = app.reclaimHold >= RECLAIM_HOLD;
  } else {
    reclaimed = Vector3.Distance(app.player.position, app.level.exitCenter) <= app.level.exitRadius;
  }
  if (reclaimed) {
    app.hud.setPrompt(false);
    // The exit is a reclaimer: the view is taken apart from the top down, to the printer's sound run backwards.
    app.hud.printOut(reducedMotionActive(app));
    app.sound.play('reclaim');
    const chamberId = CHAMBERS[app.levelIndex]?.id;
    const best = chamberId === undefined ? undefined : app.progress.best[chamberId];
    if (progressWritable() && chamberId !== undefined) {
      recordWin(app.progress, chamberId, app.levelTime, app.shifts);
      persistProgress(app);
    }
    app.playtest?.clear(app.levelTime, app.shifts);
    persistPlaytest(app);
    const last = finishedAll(app);
    const cube = cubeOf(app.levelIndex);
    const par = CHAMBERS[app.levelIndex]?.par;
    const next = last ? undefined : cubeOf(app.levelIndex + 1);
    const log = workLog({ time: app.levelTime, best, shifts: app.shifts, par, next });
    const text = PROMPTS[app.input.lastDevice];
    const select = sandbox ? '' : text.select;
    const update = app.applyUpdate ? '\nUpdate ready: it installs when you continue' : '';
    app.winMessage = {
      title: cube === undefined ? 'CHAMBER CLEARED' : winTitle(cube, last),
      body: `${log}\n\n${last ? text.again : text.next}${select}${update}`,
    };
    app.game.send({ type: 'win' });
  }
}
