import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Scene } from '@babylonjs/core/scene';
import { SkinRuntime } from '../../skins/Skin';
import { Builder, BuiltLevel, T, V } from '../Builder';

/**
 * Level 2 - a 40-unit vertical shaft. The exit door is at the very top, upside down.
 * -Y -> +X (walk up the wall) -> +Y (stand on the ceiling).
 *
 * Trap hole: a 3x3 opening in the floor, off to the -X side away from the walk to the first lever. It opens
 * onto space; step into it and you fall out of the chamber.
 */
export function buildShaft(scene: Scene, skin: SkinRuntime): BuiltLevel {
  const b = new Builder(scene, skin, new Color3(0.9, 0.35, 0.55));
  const W = 5;
  const y0 = -5;
  const y1 = 35;
  const w: [number, number] = [-W, W];
  const h: [number, number] = [y0, y1];

  // Trap hole open to space: floor (-Y) at x [-4.5, -1.5], z [1.5, 4.5]; nothing lies beneath it.
  b.slab('y', y0 - T, y0, w, w, b.floor, { u: [-4.5, -1.5], v: [1.5, 4.5] });
  b.slab('y', y1, y1 + T, w, w, b.wall);
  b.slab('x', W, W + T, h, w, b.wall);
  b.slab('z', W, W + T, w, h, b.wall);
  b.slab('z', -W - T, -W, w, h, b.wall, { u: [-2, 2], v: [y0, y0 + 3] });
  b.slab('x', -W - T, -W, h, w, b.wall, { u: [y1 - 3, y1], v: [-2, 2] });

  b.tube(V(-2, y0, -W - 9), V(2, y0 + 3, -W - T), ['+z'], b.alcove);
  // Sill under the doorway: the wall's hole runs to the floor, so nothing else covers this strip.
  b.box(V(-2, y0 - T, -W - T), V(2, y0, -W), b.alcove);
  b.tube(V(-W - 9, y1 - 3, -2), V(-W - T, y1, 2), ['+x'], b.exit);
  // Sill above the exit doorway, which is its floor once +Y is down.
  b.box(V(-W - T, y1, -2), V(-W, y1 + T, 2), b.exit);

  b.addSwitch(V(W - 0.3, y0 + 1.5, 0), V(-1, 0, 0), '+X');
  b.addSwitch(V(W - 1.5, y1 - 0.3, 0), V(0, -1, 0), '+Y');

  return b.finish({
    name: 'II · THE SHAFT',
    hint: 'The way out is a long way up. Walls are just floors you have not met yet.',
    spawnPosition: V(0, y0 + 0.5, -W - 5),
    entranceAxis: '-Y',
    exitAxis: '+Y',
    exitCenter: V(-W - 7, y1 - 1, 0),
    exitRadius: 2,
  });
}
