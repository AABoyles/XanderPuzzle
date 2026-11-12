import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Scene } from '@babylonjs/core/scene';
import { SkinRuntime } from '../../skins/Skin';
import { Builder, BuiltLevel, T, V } from '../Builder';

/**
 * Not a chamber: a test room for crates, plates and doors, loaded with `?sandbox` in the URL.
 * Throw the lever to drop the crate onto the wall plate, which opens the red door; the second
 * lever puts you back on the floor to walk through it.
 */
export function buildSandbox(scene: Scene, skin: SkinRuntime): BuiltLevel {
  const b = new Builder(scene, skin, new Color3(0.6, 0.6, 0.65));
  const R = 8;
  const full: [number, number] = [-R, R];

  b.slab('y', -R - T, -R, full, full, b.floor);
  b.slab('y', R, R + T, full, full, b.wall);
  b.slab('x', -R - T, -R, full, full, b.wall);
  b.slab('x', R, R + T, full, full, b.wall);
  b.slab('z', -R - T, -R, full, full, b.wall, { u: [-2, 2], v: [-R, -R + 3] });
  b.slab('z', R, R + T, full, full, b.wall, { u: [-2, 2], v: [-R, -R + 3] });

  b.tube(V(-2, -R, -R - 9), V(2, -R + 3, -R - T), ['+z'], b.alcove);
  // Sill under the doorway: the wall's hole runs to the floor, so nothing else covers this strip.
  b.box(V(-2, -R - T, -R - T), V(2, -R, -R), b.alcove);
  b.tube(V(-2, -R, R + T), V(2, -R + 3, R + 9), ['-z'], b.exit);

  b.addCrate(V(-3, -R + 0.75, 4));
  b.addCrate(V(-3, -R + 2.25, 4)); // stacked on the first
  const plate = b.addPlate(V(R, -R + 0.75, 4), V(-1, 0, 0), 2.5, true);
  b.addDoor(V(-2, -R, R), V(2, -R + 3, R + T), [plate]);
  b.box(V(-2, -R - T, R), V(2, -R, R + T), b.exit);

  b.addSwitch(V(R - 0.3, -R + 1.5, -4), V(-1, 0, 0), '+X');
  b.addSwitch(V(R - 1.5, -R + 0.3, -4), V(0, 1, 0), '-Y');

  return b.finish({
    name: 'SANDBOX · CRATES, PLATES, DOORS',
    hint: 'Crates fall with gravity. The wall plate opens the red door.',
    spawnPosition: V(0, -R + 0.5, -R - 5),
    entranceAxis: '-Y',
    exitAxis: '-Y',
    exitCenter: V(0, -R + 0.5, R + 7),
    exitRadius: 2,
  });
}

export default buildSandbox;
