import { leversExhausted } from '../game/stuck';
import { restoreSnapshot } from '../game/chamberSnapshot';
import type { GravityAxis } from '../gravity/GravitySystem';
import { NO_TRIM, SHIFT_REVERTED } from '../narrative';
import { PROMPTS } from '../ui/prompts';
import { beep, snapshotTargets } from './App';
import type { App } from './App';
import { syncPrinter } from './chamberFlow';
import { sandbox } from './flags';

/**
 * Steps back to the moment before the last hand-thrown lever. Refused in an ending chamber, whose levers are the story,
 * and when there is nothing to undo. Returns whether anything was undone.
 */
export function undoLastShift(app: App): boolean {
  if (app.level.ending) return false;
  const s = app.undoStack.pop();
  if (!s) return false;
  restoreSnapshot(snapshotTargets(app), s);
  app.shifts = s.shifts;
  app.sky.playerPlaced();
  // The fall, if there was one, is over: the player is back in the chamber.
  app.fall.reset();
  app.hud.log(SHIFT_REVERTED);
  app.playtest?.undo();
  beep(app, 300, 220, 0.12, 'triangle', 0.06);
  syncPrinter(app);
  checkTrim(app);
  return true;
}

/**
 * Tells the player once when no lever left can turn gravity to the exit's (a lever-only check, see `leversExhausted`).
 * Not in the Descent, not while a sequence runs, and not in the sandbox. Called after every gravity change.
 */
export function checkTrim(app: App): void {
  const exhausted =
    !sandbox &&
    !app.level.ending &&
    !app.level.sequencer?.active &&
    leversExhausted(
      app.gravity.axis,
      app.level.exitAxis,
      app.level.switches.map((sw) => ({
        targetFor: (a: GravityAxis) => sw.targetFor(a),
        cycle: sw.spec.kind === 'sequence' ? sw.spec.sequencer.axes : undefined,
      })),
    );
  if (exhausted && !app.outOfTrim) {
    app.hud.log(`${NO_TRIM}\n${PROMPTS[app.input.lastDevice].stuck}`, 12);
    app.playtest?.stuck();
    beep(app, 140, 90, 0.15, 'square', 0.08);
  }
  app.outOfTrim = exhausted;
}
