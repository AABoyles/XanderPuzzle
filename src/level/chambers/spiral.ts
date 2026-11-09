import { Color3, Scene } from '@babylonjs/core';
import { SkinRuntime } from '../../skins/Skin';
import { Builder, BuiltLevel, T, V } from '../Builder';

/**
 * Level 4 - three shifts around the room: -Y -> -X -> +Y -> +X, each lever only reachable
 * from the surface the previous one puts you on.
 */
export function buildSpiral(scene: Scene, skin: SkinRuntime): BuiltLevel {
  const b = new Builder(scene, skin, new Color3(0.95, 0.8, 0.3));
  const R = 8;
  const full: [number, number] = [-R, R];

  b.slab('y', -R - T, -R, full, full, b.floor);
  b.slab('y', R, R + T, full, full, b.wall);
  b.slab('x', -R - T, -R, full, full, b.wall);
  b.slab('z', R, R + T, full, full, b.wall);
  b.slab('z', -R - T, -R, full, full, b.wall, { u: [-2, 2], v: [-R, -R + 3] });
  b.slab('x', R, R + T, full, full, b.wall, { u: [-6, -2], v: [-6, -2] });

  b.tube(V(-2, -R, -R - 9), V(2, -R + 3, -R - T), ['+z'], b.alcove);
  // Sill under the doorway: the wall's hole runs to the floor, so nothing else covers this strip.
  b.box(V(-2, -R - T, -R - T), V(2, -R, -R), b.alcove);
  b.tube(V(R + T, -6, -6), V(R + 9, -2, -2), ['-x'], b.exit);

  b.addSwitch(V(-R + 0.3, -R + 1.5, 0), V(1, 0, 0), '-X');
  b.addSwitch(V(-R + 1.5, R - 0.3, 0), V(0, -1, 0), '+Y');
  b.addSwitch(V(R - 0.3, R - 1.5, 0), V(-1, 0, 0), '+X');
  // Decoy: the far wall is a dead end, with a lever on the old floor to come back.
  b.addSwitch(V(0, -R + 1.5, R - 0.3), V(0, 0, -1), '+Z');
  b.addSwitch(V(0, -R + 0.3, R - 1.5), V(0, 1, 0), '-Y');

  return b.finish({
    name: 'IV · THE SPIRAL',
    hint: 'One lever leads to the next. Not every lever leads somewhere.',
    spawnPosition: V(0, -R + 0.5, -R - 5),
    entranceAxis: '-Y',
    exitAxis: '+X',
    exitCenter: V(R + 7, -4, -4),
    exitRadius: 2.5,
  });
}
