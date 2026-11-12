import type { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { GravityAxis, GravitySystem } from '../gravity/GravitySystem';
import type { BuiltLevel } from '../level/Builder';
import type { DynamicsSnapshot } from '../level/Dynamics';
import type { PlayerController } from '../player/PlayerController';

/** The chamber just before a lever the player threw by hand, enough to put it back (undo). */
export interface ChamberSnapshot {
  position: Vector3;
  look: { yaw: number; pitch: number };
  gravity: GravityAxis;
  dynamics: DynamicsSnapshot;
  /** Whether each lever in `level.switches` was spent. */
  spent: boolean[];
  sequencer?: { active: boolean; remaining: number; index: number };
  /** The shift count at the time; the caller owns the counter and puts it back. */
  shifts: number;
}

/** What a snapshot is taken from and put back into. The level is the one built now, not one from an earlier start. */
export interface SnapshotTargets {
  player: PlayerController;
  gravity: GravitySystem;
  level: BuiltLevel;
}

export function takeSnapshot({ player, gravity, level }: SnapshotTargets, shifts: number): ChamberSnapshot {
  return {
    position: player.position.clone(),
    look: player.getLook(),
    gravity: gravity.axis,
    dynamics: level.dynamics.snapshot(),
    spent: level.switches.map((sw) => sw.spent),
    sequencer: level.sequencer?.snapshot(),
    shifts,
  };
}

/** Puts the player, gravity, crates, plates, doors, levers and sequencer back. The chamber timer is not rewound. */
export function restoreSnapshot({ player, gravity, level }: SnapshotTargets, s: ChamberSnapshot): void {
  // Gravity first: the player's orientation follows it when they are reset.
  gravity.setAxis(s.gravity);
  player.reset(s.position);
  player.setLook(s.look.yaw, s.look.pitch);
  level.dynamics.restore(s.dynamics);
  level.switches.forEach((sw, i) => {
    if (sw.spent && !s.spent[i]) sw.revive();
    else if (!sw.spent && s.spent[i]) sw.burnOut();
  });
  if (s.sequencer) level.sequencer?.restore(s.sequencer);
}
