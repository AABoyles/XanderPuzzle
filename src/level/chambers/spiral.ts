import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Scene } from '@babylonjs/core/scene';
import { SkinRuntime } from '../../skins/Skin';
import { Builder, BuiltLevel, T, V } from '../Builder';

/**
 * Level 4 - three shifts around the room: -Y -> -X -> +Y -> +X, each lever only reachable
 * from the surface the previous one puts you on.
 *
 * Trap: a decoy lever on the -X wall beside the walk (target +Z) makes the +Z wall the floor; a 6 x 7 hole in
 * it lies directly below anyone within lever reach, a 16-unit fall with no steering needed, out of the
 * chamber. The old +Z/-Y dead-end pair and the old -X hole are gone; the +Z decoy is converted into this.
 * The Margin's warning is beside the lever.
 */
export function buildSpiral(scene: Scene, skin: SkinRuntime): BuiltLevel {
  const b = new Builder(scene, skin, new Color3(0.95, 0.8, 0.3));
  const R = 8;
  const full: [number, number] = [-R, R];

  b.slab('y', -R - T, -R, full, full, b.floor);
  b.slab('y', R, R + T, full, full, b.wall);
  b.slab('x', -R - T, -R, full, full, b.wall);
  // Trap hole open to space: +Z wall at x [-8, -2], y [-5.5, 1.5], below the decoy lever's standpoint on -X.
  b.slab('z', R, R + T, full, full, b.wall, { u: [-8, -2], v: [-5.5, 1.5] });
  b.slab('z', -R - T, -R, full, full, b.wall, { u: [-2, 2], v: [-R, -R + 3] });
  b.slab('x', R, R + T, full, full, b.wall, { u: [-6, -2], v: [-6, -2] });

  b.tube(V(-2, -R, -R - 9), V(2, -R + 3, -R - T), ['+z'], b.alcove);
  // Sill under the doorway: the wall's hole runs to the floor, so nothing else covers this strip.
  b.box(V(-2, -R - T, -R - T), V(2, -R, -R), b.alcove);
  b.tube(V(R + T, -6, -6), V(R + 9, -2, -2), ['-x'], b.exit);

  b.addSwitch(V(-R + 0.3, -R + 1.5, 0), V(1, 0, 0), '-X');
  b.addSwitch(V(-R + 1.5, R - 0.3, 0), V(0, -1, 0), '+Y');
  b.addSwitch(V(R - 0.3, R - 1.5, 0), V(-1, 0, 0), '+X');
  // Decoy: from the -X wall, +Z turns the hole wall into the floor beneath you.
  b.addSwitch(V(-R + 0.3, -2, -2), V(1, 0, 0), '+Z');

  b.placard(V(-2, -R + 1.6, -R - 3), V(1, 0, 0), '-Y', 'CUBE 0115', { width: 2.6 });
  // On the ceiling, read while crossing it under +Y towards the +X lever.
  b.placard(V(0, R, -3), V(0, -1, 0), '+Y', 'TRIM SEQUENCE: -Y · -X · +Y · +X', { width: 7, top: V(1, 0, 0) });
  // Beside the decoy lever on the -X wall, read before the throw.
  b.note(V(-R, -3, 3), V(1, 0, 0), '-X', 'Not every lever leads somewhere.\nThis one led me here.', {
    width: 5,
    top: V(0, 1, 0),
  });

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

export default buildSpiral;
