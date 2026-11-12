import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Scene } from '@babylonjs/core/scene';
import { SkinRuntime } from '../../skins/Skin';
import { Builder, BuiltLevel, T, V } from '../Builder';

/**
 * Level 17 - too much mass. Two crates, A (lane z = -3) and B (lane z = +3), rest on the floor and the exit door
 * wants B on its plate and A's plate clear. Throwing +X seats both: one green, one red, door shut. One crate has
 * to go, out of the hole in the -X wall, and it has to be A (the hole is in A's lane).
 * Route: -Y -> -X -> -Y -> +X -> -Y. -X sends A out through the hole and leaves B against the wall; -Y and +X then
 * slide B onto its plate.
 * Decoy: the -Z lever (also from -Y). Both crates slide south and stack in one column (A on the wall, B beside it),
 * which puts B, not A, in line with the hole's southern end: a later -X loses B for good and the door can never
 * open (restart). Throwing +X first is merely a no-op: -Y undoes it.
 * Trap hole: the opening in the -X wall is crate-sized plus 1 on every side and runs to the floor, so under -Y it
 * is an exit you can walk out of (and fall away from), and under -X it is a hole in the floor. Every lever stands
 * on a glass pane in the middle (clear of both crate lanes) or on the wall the previous shift lands you on, well
 * away from the hole.
 */
export function buildSurplus(scene: Scene, skin: SkinRuntime): BuiltLevel {
  const b = new Builder(scene, skin, new Color3(0.78, 0.55, 0.3));
  const R = 8;
  const full: [number, number] = [-R, R];
  const doorX: [number, number] = [4, 7];
  const doorY: [number, number] = [-R, -R + 3];

  // Shell. The -X wall has the release hole: y up to -5.5 (crate 1.5 high), z from -7 to -1.5 (crate lane at -3,
  // and the stacked B lane at -5.75, but not the stacked A lane at -7.25, which the wall's last metre holds).
  b.slab('y', -R - T, -R, full, full, b.floor);
  b.slab('y', R, R + T, full, full, b.wall);
  b.slab('x', -R - T, -R, full, full, b.wall, { u: [-R, -5.5], v: [-7, -1.5] });
  b.slab('x', R, R + T, full, full, b.wall);
  b.slab('z', -R - T, -R, full, full, b.wall, { u: doorX, v: doorY });
  b.slab('z', R, R + T, full, full, b.wall, { u: doorX, v: doorY });

  // Entrance (south) and exit (north), off to the +X side, away from the crates' columns. Sills fill the strip under
  // each doorway that the hole cut leaves open.
  b.tube(V(4, -R, -R - 9), V(7, -R + 3, -R - T), ['+z'], b.alcove);
  b.box(V(4, -R - T, -R - T), V(7, -R, -R), b.alcove);
  b.tube(V(4, -R, R + T), V(7, -R + 3, R + 9), ['-z'], b.exit);
  b.box(V(4, -R - T, R), V(7, -R, R + T), b.exit);

  // A glass pane in the middle strip (z in [-1.2, 1.2], clear of both lanes) carries the levers whose standpoint
  // must see the crates and the hole.
  b.glass(V(0, -R, -1.2), V(0.3, -5.2, 1.2));

  // The crates: A in the hole's lane, B in the plates' other lane, both west of the pane.
  b.addCrate(V(-3, -R + 0.75, -3), 1.5, { stamp: 'BALLAST MASS\nBM-2318' });
  b.addCrate(V(-3, -R + 0.75, 3), 1.5, { stamp: 'BALLAST MASS\nBM-2319' });
  const plateA = b.addPlate(V(R, -R + 0.75, -3), V(-1, 0, 0), 1.4, true, true);
  const plateB = b.addPlate(V(R, -R + 0.75, 3), V(-1, 0, 0), 1.4, true);
  b.addDoor(V(doorX[0], doorY[0], R), V(doorX[1], doorY[1], R + T), [plateA, plateB]);

  // 0: -Y -> -X, on the pane's west face. Facing west: both crates, the plates behind them, the hole beyond.
  b.addSwitch(V(-0.3, -R + 1.8, 0.7), V(-1, 0, 0), '-X');
  // 1: -Y -> -Z (the decoy), beside it, on the side away from the strip -X lands you in. Same view.
  b.addSwitch(V(-0.3, -R + 1.8, -0.7), V(-1, 0, 0), '-Z');
  // 2: -X -> -Y, on the -X wall where -X lands you, in the strip between the lanes.
  b.addSwitch(V(-R + 0.3, -R + 1.6, 1), V(1, 0, 0), '-Y');
  // 3: -Z -> -Y, on the -Z wall where the decoy lands you.
  b.addSwitch(V(-0.8, -R + 1.6, -R + 0.3), V(0, 0, 1), '-Y');
  // 4: -Y -> +X, on the pane's east face. Facing west: the crates come at you along their lanes.
  b.addSwitch(V(0.6, -R + 1.8, 0), V(1, 0, 0), '+X');
  // 5: +X -> -Y, on the +X wall where +X lands you, between the plates.
  b.addSwitch(V(R - 0.3, -R + 1.6, 1), V(-1, 0, 0), '-Y');

  b.placard(V(4, -R + 1.6, -R - 3), V(1, 0, 0), '-Y', 'CUBE 0132', { width: 2.6 });
  b.placard(V(R, -4, 0), V(-1, 0, 0), '-Y', 'TRIM REQUIRES 1 MASS\nMASSES PRESENT: 2', { width: 6 });
  b.placard(V(-R, -3.6, -4.25), V(1, 0, 0), '-Y', 'RELEASE APERTURE', { width: 4 });
  b.note(V(-R, -1.2, -4.25), V(1, 0, 0), '-Y', 'It lets go of whatever\nit has no use for.', { width: 4.2 });

  return b.finish({
    name: 'XVII · THE SURPLUS',
    hint: 'One mass too many. There is a way to be rid of it. Choose with care.',
    spawnPosition: V(5.5, -R + 0.5, -R - 6),
    entranceAxis: '-Y',
    exitAxis: '-Y',
    exitCenter: V(5.5, -R + 1.5, R + 5),
    exitRadius: 1.5,
  });
}

export default buildSurplus;
