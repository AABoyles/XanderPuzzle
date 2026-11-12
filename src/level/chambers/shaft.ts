import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Scene } from '@babylonjs/core/scene';
import { SkinRuntime } from '../../skins/Skin';
import { Builder, BuiltLevel, T, V } from '../Builder';

/**
 * Level 2 - a 40-unit vertical shaft. The exit door is at the very top, upside down.
 * -Y -> +X (walk up the wall) -> +Y (stand on the ceiling).
 *
 * Trap hole: a 4 x 4.5 opening in the +X wall at height 12..16, straight ahead of where the first lever
 * lands you. Under +X it is a hole in the floor (the planet shows through it): walk straight up and you
 * walk into it and fall out of the chamber. A 4-wide strip on the +Z side passes it. A placard just
 * before it says what recovery is: a replacement, printed at the entrance.
 */
export function buildShaft(scene: Scene, skin: SkinRuntime): BuiltLevel {
  const b = new Builder(scene, skin, new Color3(0.9, 0.35, 0.55));
  const W = 5;
  const y0 = -5;
  const y1 = 35;
  const w: [number, number] = [-W, W];
  const h: [number, number] = [y0, y1];

  b.slab('y', y0 - T, y0, w, w, b.floor);
  b.slab('y', y1, y1 + T, w, w, b.wall);
  // Trap hole open to space, in the climb: +X wall at y [12, 16], z [-3.5, 1]; strip z [1, 5] stays walkable.
  b.slab('x', W, W + T, h, w, b.wall, { u: [12, 16], v: [-3.5, 1] });
  b.slab('z', W, W + T, w, h, b.wall);
  b.slab('z', -W - T, -W, w, h, b.wall, { u: [-2, 2], v: [y0, y0 + 3] });
  b.slab('x', -W - T, -W, h, w, b.wall, { u: [y1 - 3, y1], v: [-2, 2] });

  b.tube(V(-2, y0, -W - 9), V(2, y0 + 3, -W - T), ['+z'], b.alcove);
  // Sill under the doorway: the wall's hole runs to the floor, so nothing else covers this strip.
  b.box(V(-2, y0 - T, -W - T), V(2, y0, -W), b.alcove);
  b.tube(V(-W - 9, y1 - 3, -2), V(-W - T, y1, 2), ['+x'], b.exit);
  // Sill above the exit doorway, which is its floor once +Y is down.
  b.box(V(-W - T, y1, -2), V(-W, y1 + T, 2), b.exit);

  // The Margin, on the face overhead during the climb under +X: only seen by looking up on the way.
  b.note(V(-W, 20, 0), V(1, 0, 0), '+X', 'It is a long way up.\nIt is a longer way down.\nI checked. It printed me back.', {
    top: V(0, 1, 0),
    width: 5,
  });

  b.addSwitch(V(W - 0.3, y0 + 1.5, 0), V(-1, 0, 0), '+X');
  b.addSwitch(V(W - 1.5, y1 - 0.3, 0), V(0, -1, 0), '+Y');

  b.placard(V(-2, y0 + 1.6, -W - 3), V(1, 0, 0), '-Y', 'CUBE 0113', { width: 2.6 });
  // On the +X wall just before the hole, read while walking up under +X (text top towards +Y).
  b.placard(V(W, 8.5, 2.6), V(-1, 0, 0), '+X', 'OPEN APERTURE\nLOST ATTENDANTS\nARE REPRINTED\nAT THE ENTRANCE', {
    width: 4,
    top: V(0, 1, 0),
  });

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

export default buildShaft;
