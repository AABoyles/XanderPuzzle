import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Scene } from '@babylonjs/core/scene';
import { SkinRuntime } from '../../skins/Skin';
import { Builder, BuiltLevel, T, V } from '../Builder';

/**
 * Chamber IX - a crate is also something to stand on (-Y -> -X -> -Y -> +X -> -Y).
 *
 * A full partition splits the room into a south room (you arrive here) and a north room (the exit). The only way
 * through is a window whose sill is 2.6 above the floor: too high to jump to (a jump raises you 1.64), but a 1.25
 * crate under it makes a step (floor -> crate 1.25 -> sill 1.35).
 *
 * The crate starts on a low ledge east of the window, against the partition. +X (the obvious throw) only sends it to
 * the east wall. -X slides it west over a low stop block and under the window, to the west wall; -Y drops it to the
 * floor; +X then slides it east along the foot of the partition and the stop block catches it exactly under the window.
 * The ledge lifts the crate's first slide clear of the block (ledge 0.7 > block 0.6), so it can pass west once but
 * is caught going east. Every wrong state is recoverable with the same levers.
 *
 * Levers: only -X, +X and -Y (no +Y or +/-Z: under +/-Z the partition would become a floor and the window a hole).
 * They sit on low consoles in front of the partition, so the lane the crate slides along is in view.
 * Leaks considered: see the comments by the window wings and the stop block.
 */
export function buildFooting(scene: Scene, skin: SkinRuntime): BuiltLevel {
  const b = new Builder(scene, skin, new Color3(0.8, 0.65, 0.3));
  const W = 8; // half-width of the room (x)
  const H = 6; // ceiling height
  const south = -9;
  const north = 11;
  const doorway = (x0: number, x1: number) => ({ u: [x0, x1] as [number, number], v: [0, 3] as [number, number] });
  const crate = 1.25;

  b.slab('y', -T, 0, [-W, W], [south, north], b.floor);
  b.slab('y', H, H + T, [-W, W], [south, north], b.wall);
  b.slab('x', -W - T, -W, [0, H], [south, north], b.wall);
  b.slab('x', W, W + T, [0, H], [south, north], b.wall);
  b.slab('z', south - T, south, [-W, W], [0, H], b.wall, doorway(-6, -2));
  b.slab('z', north, north + T, [-W, W], [0, H], b.wall, doorway(-2, 2));

  // Entrance corridor into the south room (west of centre) and exit corridor out of the north room.
  b.tube(V(-6, 0, south - T - 9), V(-2, 3, south - T), ['+z'], b.alcove);
  b.box(V(-6, -T, south - T), V(-2, 0, south), b.alcove);
  b.tube(V(-2, 0, north + T), V(2, 3, north + T + 9), ['-z'], b.exit);
  b.box(V(-2, -T, north), V(2, 0, north + T), b.exit);

  // The partition is 2 thick (z 0..2) with the window at its middle: x -1.1..1.1, y 2.6..5.1. Thick, so that falling
  // sideways past it cannot be steered into it.
  b.slab('z', 0, 2 * T, [-W, W], [0, H], b.wall, { u: [-1.1, 1.1], v: [2.6, 5.1] });

  // Window wings: housings on the south face, flush with the window's sides and 1.5 deep. Above the crate lane (the
  // crate tops out at 1.95 on its first slide). Under +X/-X a player who is falling past the window at window
  // height lands on a wing's outer face (a dead end) instead of drifting in: the player needs about 2 units of
  // sideways travel to get past them, and is alongside the window for about 0.1 s (fall of 2+ units at 22/s^2 is
  // 9 u/s or more across a 1.2 span, ~0.12 s, at most 1.3 units of steering at run speed). The 0.9 gap under the
  // ceiling is less than the player's diameter.
  b.box(V(-1.1 - T, 2.6, -1.5), V(-1.1, 5.1, 0));
  b.box(V(1.1, 2.6, -1.5), V(1.1 + T, 5.1, 0));

  // Stop block: catches a crate sliding east along the floor with its east face at x 0.625, i.e. centred under the
  // window. Low (0.6) on purpose: it is not a wall to stand on at window height under +X, and standing on it gets
  // you 0.6 + 0.5 + 1.64 = 2.74 centre height, short of the 3.1 the sill needs by 0.36.
  b.box(V(0.625, 0, -crate), V(1.6, 0.6, 0));
  // The ledge the crate starts on: 0.7 high so a crate riding on it clears the block (0.6) going west.
  b.box(V(2.5, 0, -1.5), V(W, 0.7, 0));
  b.addCrate(V(5, 0.7 + crate / 2, -crate / 2), crate, { stamp: 'BALLAST MASS\nBM-2234' });

  // Consoles for the levers, 0.9 high so you can see the lane over them, set back from the lane (z -2.8..-2.2; the
  // crate's lane ends at -1.25), so a player standing at one is not in the way of the crate. Levers are on the face
  // toward the arrival side (normal -Z); you stand facing the partition.
  const lever = (x: number) => V(x, 0.6, -2.8);
  const faceS = V(0, 0, -1);
  b.box(V(4, 0, -2.8), V(W - 0.4, 0.9, -2.2));
  b.box(V(-W + 0.4, 0, -2.8), V(-4, 0.9, -2.2));
  b.addSwitch(lever(4.6), faceS, '-X'); // 0: from the east side: the crate is on the ledge dead ahead
  b.addSwitch(lever(-4.6), faceS, '+X'); // 1: from the west side
  b.addSwitch(lever(-7), faceS, '-Y'); // 2: the west wall's -Y lever
  b.addSwitch(lever(7), faceS, '-Y'); // 3: the east wall's -Y lever

  b.placard(V(-6, 1.6, south - T - 4), V(1, 0, 0), '-Y', 'CUBE 0122', { width: 2.6 });
  b.placard(V(-5.2, 3.4, 0), V(0, 0, -1), '-Y', 'NORTH BAY: CLEANING 0700\nSILL HEIGHT: 2.6\nSTEP ISSUED: 1', {
    width: 4.6,
  });
  b.note(V(5.2, 3.6, 0), V(0, 0, -1), '-Y', 'Scuffs on the top of the mass.\nBoots. Not mine.', {
    width: 4.6,
    lineHeight: 0.45,
  });

  return b.finish({
    name: 'IX · THE FOOTING',
    hint: 'A mass is a floor you can move. Mind where it stops.',
    spawnPosition: V(-4, 0.5, south - T - 6),
    entranceAxis: '-Y',
    exitAxis: '-Y',
    exitCenter: V(0, 0.5, north + T + 7),
    exitRadius: 2,
  });
}

export default buildFooting;
