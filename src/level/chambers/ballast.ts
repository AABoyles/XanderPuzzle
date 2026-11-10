import { Color3, Scene } from '@babylonjs/core';
import { SkinRuntime } from '../../skins/Skin';
import { Builder, BuiltLevel, T, V } from '../Builder';

/**
 * Level 8 - the first crate chamber (-Y -> +X -> -Y). A crate sits in a trough in the floor and the
 * exit door in the far wall is shut. The first lever turns gravity toward the east wall, the crate
 * slides out of the trough and lands on a pressure plate there (crates only), which opens the door.
 * The second lever, on the same wall, puts you back on the floor; the crate stays against the plate.
 */
export function buildBallast(scene: Scene, skin: SkinRuntime): BuiltLevel {
  const b = new Builder(scene, skin, new Color3(0.35, 0.85, 0.75));
  const R = 8;
  const full: [number, number] = [-R, R];
  const doorway = { u: [-2, 2] as [number, number], v: [-R, -R + 3] as [number, number] };

  b.slab('y', -R - T, -R, full, full, b.floor);
  b.slab('y', R, R + T, full, full, b.wall);
  b.slab('x', -R - T, -R, full, full, b.wall);
  b.slab('x', R, R + T, full, full, b.wall);
  b.slab('z', -R - T, -R, full, full, b.wall, doorway);
  b.slab('z', R, R + T, full, full, b.wall, doorway);

  b.tube(V(-2, -R, -R - 9), V(2, -R + 3, -R - T), ['+z'], b.alcove);
  // Sill under the doorway: the wall's hole runs to the floor, so nothing else covers this strip.
  b.box(V(-2, -R - T, -R - T), V(2, -R, -R), b.alcove);
  b.tube(V(-2, -R, R + T), V(2, -R + 3, R + 9), ['-z'], b.exit);
  b.box(V(-2, -R - T, R), V(2, -R, R + T), b.exit);

  // The trough: two walls taller than the crate, open at the east end, running from the west wall.
  b.box(V(-R, -R, 2.5), V(-1, -R + 2, 3.2));
  b.box(V(-R, -R, 4.8), V(-1, -R + 2, 5.5));
  b.addCrate(V(-3, -R + 0.75, 4));

  const plate = b.addPlate(V(R, -R + 0.75, 4), V(-1, 0, 0), 2.5, true);
  b.addDoor(V(-2, -R, R), V(2, -R + 3, R + T), [plate]);

  b.addSwitch(V(R - 0.3, -R + 1.5, -4), V(-1, 0, 0), '+X');
  b.addSwitch(V(R - 1.5, -R + 0.3, -4), V(0, 1, 0), '-Y');

  return b.finish({
    name: 'VIII · THE BALLAST',
    hint: 'Gravity moves more than you do.',
    spawnPosition: V(0, -R + 0.5, -R - 5),
    entranceAxis: '-Y',
    exitAxis: '-Y',
    exitCenter: V(0, -R + 0.5, R + 7),
    exitRadius: 2,
  });
}
