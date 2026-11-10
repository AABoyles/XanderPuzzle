import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Scene } from '@babylonjs/core/scene';
import { SkinRuntime } from '../../skins/Skin';
import { Builder, BuiltLevel, T, V } from '../Builder';

/**
 * Level 9 - two crates, two plates, one door that needs both pressed. Route: -Y -> -X -> -Y -> +X.
 * One plate sits at the bottom of a shallow pit in the floor, the other on the +X wall. Seating the
 * wall plate (+X) drags the other crate along with it, so the order matters: first slide the pit
 * crate to the -X wall and let it drop into the pit (-X, -Y), where the pit's walls pin it against
 * every sideways gravity; only then send the second crate to the +X plate. The exit door is on the
 * +Z wall, reached by walking along the +X wall.
 */
export function buildCounterweight(scene: Scene, skin: SkinRuntime): BuiltLevel {
  const b = new Builder(scene, skin, new Color3(0.65, 0.4, 0.95));
  const R = 8;
  const full: [number, number] = [-R, R];
  const tall: [number, number] = [-R - 2, R]; // the shell reaches 2 below the floor, for the pit
  const side: [number, number] = [-R, R];
  const doorY: [number, number] = [-R, -R + 3];

  // Shell. The floor is a solid block with a 2x2 pit (1 deep) cut near the -X wall.
  b.slab('y', -R - 2, -R - 1, full, full, b.floor);
  b.box(V(-R, -R - 1, -R), V(-6, -R, -1), b.floor);
  b.box(V(-R, -R - 1, 1), V(-6, -R, R), b.floor);
  b.box(V(-6, -R - 1, -R), V(R, -R, R), b.floor);
  b.slab('y', R, R + T, full, full, b.wall);
  b.slab('x', -R - T, -R, tall, side, b.wall);
  b.slab('x', R, R + T, tall, side, b.wall);
  b.slab('z', -R - T, -R, full, [-R, R], b.wall, { u: [-2, 2], v: doorY });
  b.slab('z', R, R + T, full, [-R, R], b.wall, { u: [5, R], v: doorY });
  b.box(V(-R, -R - 2, -R - T), V(R, -R, -R), b.wall);
  b.box(V(-R, -R - 2, R), V(R, -R, R + T), b.wall);

  // Entrance (-Z) and exit (+Z).
  b.tube(V(-2, -R, -R - 9), V(2, -R + 3, -R - T), ['+z'], b.alcove);
  b.tube(V(5, -R, R + T), V(R, -R + 3, R + 9), ['-z'], b.exit);
  // Sill under the exit doorway: the hole runs to the +X wall, so nothing else covers the strip.
  b.box(V(R, doorY[0], R), V(R + T, doorY[1], R + T), b.exit);

  // Pit crate and wall crate; the pit sits under the -X end of the pit crate's row (z = 0).
  b.addCrate(V(-3, -R + 0.75, 0), 1.5, { stamp: 'BALLAST MASS\nBM-2232' });
  b.addCrate(V(3, -R + 0.75, -3), 1.5, { stamp: 'BALLAST MASS\nBM-2240' });
  const pitPlate = b.addPlate(V(-7, -R - 1, 0), V(0, 1, 0), 1.8, true);
  const wallPlate = b.addPlate(V(R, -R + 0.75, -3), V(-1, 0, 0), 2, true);
  b.addDoor(V(5, doorY[0], R), V(R, doorY[1], R + T), [pitPlate, wallPlate]);

  // -Y -> -X on the -X wall; -X -> -Y on the +Z wall; -Y -> +X on the +X wall.
  b.addSwitch(V(-R + 0.3, -R + 1.5, 6), V(1, 0, 0), '-X');
  b.addSwitch(V(-R + 1.5, -R + 0.5, R - 0.3), V(0, 0, -1), '-Y');
  b.addSwitch(V(R - 0.3, -R + 1.5, 6), V(-1, 0, 0), '+X');
  // Undo for a wrong order: -X-side lever to get back to -Y from the +X wall.
  b.addSwitch(V(R - 1.5, -R + 0.5, -R + 0.3), V(0, 0, 1), '-Y');

  return b.finish({
    name: 'IX · THE COUNTERWEIGHT',
    hint: 'Pin one crate where gravity cannot move it, then seat the other.',
    spawnPosition: V(0, -R + 0.5, -R - 5),
    entranceAxis: '-Y',
    exitAxis: '+X',
    exitCenter: V(R - 0.5, -R + 1.5, R + 5),
    exitRadius: 2.2,
  });
}
