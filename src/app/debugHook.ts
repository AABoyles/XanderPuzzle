import { STORM_FIRST } from '../environment/fall';
import type { GravityAxis } from '../gravity/GravitySystem';
import { SKIN_IDS } from '../skins/Skin';
import type { SkinId } from '../skins/Skin';
import type { App } from './App';
import { setSkin, startLevel } from './chamberFlow';
import { openLevelSelect } from './menus';
import { undoLastShift } from './shifts';

/** Installs `window.__debug`, the inspection hook the smoke tests and manual testing use. Dev builds only. */
export function installDebugHook(app: App): void {
  // Lightweight inspection hook for manual/automated testing in dev builds only.
  (window as unknown as Record<string, unknown>).__debug = {
    position: () => app.player.position.asArray(),
    gravityAxis: () => app.gravity.axis,
    setPosition: (x: number, y: number, z: number) => app.player.collider.position.set(x, y, z),
    state: () => app.game.kind,
    /**
     * Simulated seconds since load. The game clock is clamped per frame, so on a slow renderer it runs behind the wall
     * clock: tests wait on this, never on real time.
     */
    simTime: () => app.simClock,
    /** Renders at 1/`level` of the resolution each way, so software WebGL keeps the frame rate (and the clock) up. */
    setRenderScale: (scale: number) => app.engine.setHardwareScalingLevel(scale),
    /** The audio engine's state: context, files decoded, whether the music and the wind are sounding. */
    audio: () => app.sound.status(),
    /** Starts a stellar storm now (they otherwise come once a minute). */
    storm: () => app.backdrop.seek(STORM_FIRST),
    /** Leaves the title as a tap or gamepad press would, without pointer lock. */
    begin: () => app.game.send({ type: 'begin' }),
    hasWon: () => app.game.kind === 'won',
    /** Skips to the end of the current fall (the Descent's is 25 s). */
    endFall: () => {
      if (app.fall.falling) app.fall.time = app.fall.duration;
    },
    level: () => app.levelIndex,
    /** The hint tier shown for this chamber visit: 0 (its own hint), 1 or 2 (the ladder in `src/hints.ts`). */
    hintTier: () => app.hints.shown,
    /** Resolves once the chamber has started: its code may have to be fetched first. */
    startLevel: async (index: number) => {
      await app.chambers.load(index);
      app.game.send({ type: 'advance' }); // leaves the win screen if it is up
      startLevel(app, index);
      app.game.send({ type: 'restart' });
    },
    /** Undoes the last hand-thrown lever, as Z does. Returns whether anything was undone. */
    undo: () => (app.game.kind === 'playing' || app.game.kind === 'falling') && undoLastShift(app),
    undoDepth: () => app.undoStack.size,
    /** Whether the no-trim notice (no lever left reaches the exit's gravity) is showing. */
    outOfTrim: () => app.outOfTrim,
    openPause: () => app.game.send({ type: 'pause' }),
    pauseOpen: () => app.game.kind === 'paused',
    openLevelSelect: () => openLevelSelect(app),
    levelSelectOpen: () => app.game.kind === 'chamberSelect',
    look: (yaw: number, pitch: number) => app.player.setLook(yaw, pitch),
    setSkin: (id: SkinId) => setSkin(app, SKIN_IDS.indexOf(id)),
    crates: () => app.level.dynamics.crates.map((c) => [...c.body.center]),
    placards: () => app.level.placards,
    /** Whether each plate is as its door needs it: pressed, or clear for an inverted plate. */
    plates: () => app.level.dynamics.plates.map((pl) => pl.satisfied),
    cratesLost: () => app.level.dynamics.crates.map((c) => c.lost),
    doors: () => app.level.dynamics.doors.map((d) => d.isOpen),
    switches: () =>
      app.level.switches.map((sw) => ({
        kind: sw.spec.kind,
        target: sw.targetFor(app.gravity.axis),
        spent: sw.spent,
        inRange: sw.isInRange(app.player.position),
        position: sw.root.position.asArray(),
      })),
    /** Presses E for one frame, as the player would. */
    interact: () => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE' })),
    setGravity: (axis: GravityAxis) => app.gravity.setAxis(axis),
    grounded: () => app.player.isGrounded,
    levelCount: () => app.chambers.count,
    /** `button` is where to stand on the reclaimer's plate, which is what wins the chamber. */
    exit: () => ({
      center: app.level.exitCenter.asArray(),
      radius: app.level.exitRadius,
      button: app.level.reclaimer?.stand,
    }),
    /** The playtest log, when the page was opened with `?playtest` (undefined otherwise). */
    playtest: () => app.playtest?.toJSON(),
  };
}
