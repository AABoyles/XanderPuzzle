import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Scene } from '@babylonjs/core/scene';
import { SkinRuntime } from '../../skins/Skin';
import { Builder, BuiltLevel, T, V } from '../Builder';

/**
 * Level 3 - a room split by a partition that stops short of the ceiling.
 * -Y -> +X (walk up and over the partition) -> +Z (the far wall, with the exit pit).
 *
 * Trap hole: a 4x4 opening in the +X wall behind the partition (the floor under +X). It opens onto space;
 * walk down the far side of the partition and you fall out of the chamber.
 */
export function buildDivide(scene: Scene, skin: SkinRuntime): BuiltLevel {
  const b = new Builder(scene, skin, new Color3(0.3, 0.85, 0.75));
  const R = 8;
  const full: [number, number] = [-R, R];

  b.slab('y', -R - T, -R, full, full, b.floor);
  b.slab('y', R, R + T, full, full, b.wall);
  b.slab('x', -R - T, -R, full, full, b.wall);
  // Trap hole open to space: +X wall at y [-6, -2], z [2.5, 6.5]; nothing lies beyond it.
  b.slab('x', R, R + T, full, full, b.wall, { u: [-6, -2], v: [2.5, 6.5] });
  b.slab('z', -R - T, -R, full, full, b.wall, { u: [-2, 2], v: [-R, -R + 3] });
  b.slab('z', R, R + T, full, full, b.wall, { u: [-6, -2], v: [-6, -2] });

  // The partition: full width, 12 of the room's 16 units tall.
  b.box(V(-R, -R, 0), V(R, 4, 1));

  b.tube(V(-2, -R, -R - 9), V(2, -R + 3, -R - T), ['+z'], b.alcove);
  // Sill under the doorway: the wall's hole runs to the floor, so nothing else covers this strip.
  b.box(V(-2, -R - T, -R - T), V(2, -R, -R), b.alcove);
  b.tube(V(-6, -6, R + T), V(-2, -2, R + 9), ['-z'], b.exit);

  b.addSwitch(V(R - 0.3, -R + 1.5, -4), V(-1, 0, 0), '+X');
  b.addSwitch(V(R - 1.5, 6, R - 0.3), V(0, 0, -1), '+Z');

  b.placard(V(-2, -R + 1.6, -R - 3), V(1, 0, 0), '-Y', 'CUBE 0114', { width: 2.6 });
  b.placard(V(0, -5, 0), V(0, 0, -1), '-Y', 'PARTITION · DO NOT CLIMB', { width: 6 });
  // On the partition's far face, upright once you are walking the +X wall.
  b.note(V(6, 0, 1), V(0, 0, 1), '+X', "It says don't climb.\nIt doesn't say anything about walking.", { width: 6 });

  return b.finish({
    name: 'III · THE DIVIDE',
    hint: 'Too tall to jump. But is it too tall to walk around?',
    spawnPosition: V(0, -R + 0.5, -R - 5),
    entranceAxis: '-Y',
    exitAxis: '+Z',
    exitCenter: V(-4, -4, R + 7),
    exitRadius: 2.5,
  });
}

export default buildDivide;
