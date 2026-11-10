import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Scene } from '@babylonjs/core/scene';
import { SkinRuntime } from '../../skins/Skin';
import { Builder, BuiltLevel, T, V } from '../Builder';

/**
 * Level 1 - a hollow cube. -Y -> +Z -> +X, then drop through the hole in the final floor.
 */
export function buildVault(scene: Scene, skin: SkinRuntime): BuiltLevel {
  const b = new Builder(scene, skin, new Color3(0.25, 0.55, 0.9));
  const R = 12;
  const full: [number, number] = [-R, R];

  b.slab('y', -R - T, -R, full, full, b.floor);
  b.slab('y', R, R + T, full, full, b.wall);
  b.slab('z', R, R + T, full, full, b.wall);
  b.slab('x', -R - T, -R, full, full, b.wall);
  b.slab('z', -R - T, -R, full, full, b.wall, { u: [-2, 2], v: [-R, -R + 3] });
  b.slab('x', R, R + T, full, full, b.wall, { u: [-2.5, 2.5], v: [-2.5, 2.5] });

  b.tube(V(-2, -R, -R - 9), V(2, -R + 3, -R - T), ['+z'], b.alcove);
  // Sill under the doorway: the wall's hole runs to the floor, so nothing else covers this strip.
  b.box(V(-2, -R - T, -R - T), V(2, -R, -R), b.alcove);
  b.tube(V(R + T, -2.5, -2.5), V(R + 9, 2.5, 2.5), ['-x'], b.exit);

  b.addSwitch(V(0, -R + 1.5, R - 0.3), V(0, 0, -1), '+Z');
  b.addSwitch(V(R - 0.3, 0, R - 1.5), V(-1, 0, 0), '+X');

  return b.finish({
    name: 'I · THE VAULT',
    hint: 'Levers turn the cube until the arrow\'s wall faces the planet. That wall is your floor now.',
    spawnPosition: V(0, -R + 0.5, -R - 5),
    entranceAxis: '-Y',
    exitAxis: '+X',
    exitCenter: V(R + 7, 0, 0),
    exitRadius: 2.5,
  });
}
