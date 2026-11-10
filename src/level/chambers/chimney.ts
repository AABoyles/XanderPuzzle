import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Scene } from '@babylonjs/core/scene';
import { SkinRuntime } from '../../skins/Skin';
import { Builder, BuiltLevel, T, V } from '../Builder';

/**
 * Level 5 - a long horizontal tunnel that one lever turns into a 60-unit pit (-Y -> +Z). The exit
 * is a doorway in the side wall partway down, above a narrow ledge you must steer onto mid-fall.
 * A wide decoy ledge catches anyone who drops straight down from the lever; miss the real one and
 * a lever at the bottom puts gravity back so you can walk up and try again.
 */
export function buildChimney(scene: Scene, skin: SkinRuntime): BuiltLevel {
  const b = new Builder(scene, skin, new Color3(0.95, 0.5, 0.2));
  const W = 5; // tunnel half-width (x and y)
  const L = 60; // tunnel length along +z
  const w: [number, number] = [-W, W];
  const len: [number, number] = [0, L];
  // Exit doorway in the +X wall, at depth [36, 40] once +Z is down; the ledge is its sill.
  const door = { y: [-2, 2] as [number, number], z: [36, 40] as [number, number] };

  b.slab('y', -W - T, -W, w, len, b.floor);
  b.slab('y', W, W + T, w, len, b.wall);
  b.slab('x', -W - T, -W, w, len, b.wall);
  b.slab('x', W, W + T, w, len, b.wall, { u: door.y, v: door.z });
  b.slab('z', -T, 0, w, w, b.wall, { u: [-2, 2], v: [-W, -W + 3] });
  b.slab('z', L, L + T, w, w, b.wall);

  // Decoy ledge under the lever: drop straight down and you land here, 16 units short.
  b.box(V(-W, -W, 20), V(-1.5, W, 21));
  // The real ledge: the sill of the exit door, glowing so it can be found while falling.
  b.box(V(1.5, -2.5, door.z[1]), V(W, 2.5, door.z[1] + T), b.exit);

  b.tube(V(-2, -W, -9), V(2, -W + 3, -T), ['+z'], b.alcove);
  // Sill under the doorway: the wall's hole runs to the floor, so nothing else covers this strip.
  b.box(V(-2, -W - T, -T), V(2, -W, 0), b.alcove);
  b.tube(V(W + T, door.y[0], door.z[0]), V(W + 9, door.y[1], door.z[1]), ['-x'], b.exit);

  b.addSwitch(V(-W + 0.3, -W + 1.5, 4), V(1, 0, 0), '+Z');
  // At the bottom: back to the tunnel floor for the long walk up.
  b.addSwitch(V(-W + 0.3, 0, L - 1.5), V(1, 0, 0), '-Y');

  return b.finish({
    name: 'V · THE CHIMNEY',
    hint: 'Falling is just walking, faster. Steer.',
    spawnPosition: V(0, -W + 0.5, -5),
    entranceAxis: '-Y',
    exitAxis: '+Z',
    exitCenter: V(W + 7, 0, door.z[1] - 0.5),
    exitRadius: 2.5,
  });
}
