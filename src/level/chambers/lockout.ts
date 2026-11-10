import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Scene } from '@babylonjs/core/scene';
import { SkinRuntime } from '../../skins/Skin';
import { Builder, BuiltLevel, T, V } from '../Builder';

/**
 * Level 11 - a cube room with two levers (-Y -> -X -> +Y). The white relative lever in the +Z wall is
 * one-shot and the obvious thing to throw: under -Y it turns gravity to -X, and then it is burnt out
 * with nothing else in reach, so restart with R. The real route first uses the hidden fixed lever in a
 * pocket behind a screen (-Y -> -X), walks along the -X wall to the same relative lever, and throws it
 * from there (-X -> +Y) to fall up through a hole in the middle of the ceiling.
 *
 * Trap hole: a 4x4 opening in the -X wall (the floor under -X), above the walk between the two levers. It
 * opens onto space; wander into it while stranded on -X and you fall out of the chamber.
 */
export function buildLockout(scene: Scene, skin: SkinRuntime): BuiltLevel {
  const b = new Builder(scene, skin, new Color3(0.9, 0.25, 0.55));
  const R = 8;
  const w: [number, number] = [-R, R];
  const full: [number, number] = [-R - T, R + T]; // slabs that close the corner seams
  // Exit hole in the middle of the ceiling, well away from every wall.
  const hole = { u: [-2, 2] as [number, number], v: [-2, 2] as [number, number] };

  b.slab('y', -R - T, -R, w, w, b.floor);
  b.slab('y', R, R + T, w, w, b.wall, hole);
  // Trap hole open to space: -X wall at y [-3, 1], z [-1, 3]; nothing lies beyond it.
  b.slab('x', -R - T, -R, full, full, b.wall, { u: [-3, 1], v: [-1, 3] });
  b.slab('x', R, R + T, full, full, b.wall);
  b.slab('z', -R - T, -R, w, full, b.wall, { u: [-2, 2], v: [-R, -R + 3] });
  b.slab('z', R, R + T, w, full, b.wall);

  // Screen hiding the pocket on the -X side, where the hidden lever lives.
  b.box(V(-4, -R, -R), V(-3, 2, -3.5));

  b.tube(V(-2, -R, -R - 9), V(2, -R + 3, -R - T), ['+z'], b.alcove);
  b.box(V(-2, -R - T, -R - T), V(2, -R, -R), b.alcove);
  b.tube(V(hole.u[0], R + T, hole.v[0]), V(hole.u[1], R + T + 5, hole.v[1]), ['-y'], b.exit);

  // The obvious one-shot lever, near the -X end of the +Z wall. It is reachable from the -Y floor and
  // from the -X floor; throwing it from -Y burns it and leaves you on -X with nothing to throw.
  b.addRelativeSwitch(V(-6, -R + 1.5, R - 0.3), V(0, 0, -1), { once: true });
  // The hidden lever, in the pocket on the -X wall: -Y -> -X without spending the one-shot.
  b.addSwitch(V(-R + 0.3, -R + 1.5, -5), V(1, 0, 0), '-X');

  return b.finish({
    name: 'XI · THE LOCKOUT',
    hint: 'Levers burn out after one use. Someone threw this one first.',
    spawnPosition: V(0, -R + 0.5, -R - 6),
    entranceAxis: '-Y',
    exitAxis: '+Y',
    exitCenter: V(0, R + T + 4.5, 0),
    exitRadius: 2,
  });
}
