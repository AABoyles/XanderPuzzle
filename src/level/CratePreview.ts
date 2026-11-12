import type { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { GravitySystem } from '../gravity/GravitySystem';
import type { GravityAxis } from '../gravity/GravitySystem';
import type { BuiltLevel } from './Builder';
import type { GravitySwitch } from './GravitySwitch';

/** The preview is worked out again at most this often (simulated seconds) while the same lever stays in reach. */
const PREVIEW_INTERVAL = 0.25;

/**
 * Shows where crates would rest if the lever in reach were thrown now (`LevelDynamics.predict` and `showPreview`),
 * without working it out every frame.
 */
export class CratePreview {
  private cache?: { lever: GravitySwitch; axis: GravityAxis; time: number };

  /** Forget the last prediction: the chamber changed under it (a lever fired, an undo, a new start). */
  public invalidate(): void {
    this.cache = undefined;
  }

  /**
   * @param target the usable lever in reach, if any. Nothing is shown for a sequence lever, which cycles.
   * @param now simulated seconds, to pace the refresh
   */
  public refresh(
    level: BuiltLevel,
    target: GravitySwitch | undefined,
    gravity: GravitySystem,
    playerPosition: Vector3,
    falling: boolean,
    now: number,
  ): void {
    const next = target && target.spec.kind !== 'sequence' ? target.targetFor(gravity.axis) : null;
    if (!target || !next || !level.dynamics.crates.length || falling) {
      level.dynamics.showPreview(null);
      this.cache = undefined;
      return;
    }
    const c = this.cache;
    if (c && c.lever === target && c.axis === gravity.axis && now - c.time < PREVIEW_INTERVAL) return;
    const vector = GravitySystem.axisVector(next).scale(gravity.magnitude);
    level.dynamics.showPreview(level.dynamics.predict(vector, playerPosition));
    this.cache = { lever: target, axis: gravity.axis, time: now };
  }
}
