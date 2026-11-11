import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Scene } from '@babylonjs/core/scene';
import { SkinRuntime } from '../../skins/Skin';
import { Builder, BuiltLevel, T, V } from '../Builder';

/**
 * Level 10 - relative levers. Every lever here turns gravity a quarter turn clockwise as seen by
 * someone facing the wall it is mounted on, so what a lever does depends on which floor you are on.
 * Route: -Y -> +X -> +Y -> +Z. The lever in the start corner (S) is thrown twice: from -Y it gives +X,
 * from +X it gives +Y. Cross the ceiling to the lever on the far wall (V), which turns +Y into +Z and
 * drops you 30 units down the tunnel and through a hole in the end partition. The floor lever W is the
 * wrong turn from +X (-Z) and there is no way back from it.
 *
 * Trap hole: a 1.2 x 4 opening in the start wall, in the corner of the +X wall (x 2.8-4). Throw W while standing
 * on +X and gravity becomes -Z: you fall straight down the +X wall into that opening and out of the chamber. It is
 * a black gap in the wall W's arrow points at, in view from W.
 */
export function buildTurnstile(scene: Scene, skin: SkinRuntime): BuiltLevel {
  const b = new Builder(scene, skin, new Color3(0.2, 0.85, 0.75));
  const W = 4; // tunnel half-width (x and y)
  const L = 30; // tunnel length along +z
  const w: [number, number] = [-W, W];
  const len: [number, number] = [0, L + T];

  b.slab('y', -W - T, -W, w, len, b.floor);
  b.slab('y', W, W + T, w, len, b.wall);
  b.slab('x', -W - T, -W, w, len, b.wall);
  b.slab('x', W, W + T, w, len, b.wall);
  // Start wall, with a doorway to the entrance alcove. Beside it, a trap hole in the +X corner where a -Z fall
  // from the +X wall lands (x 2.8-4, y -4..0: the fall line is x 3.5, y -3.5..-1.5). A 0.8 web of wall separates
  // it from the doorway. Nothing lies beyond it.
  b.slab('z', -T, 0, [-W, 2.8], w, b.wall, { u: [-2, 2], v: [-W, -1] });
  b.box(V(2.8, 0, -T), V(W, W, 0), b.wall);
  // End partition: the only way through is a hole you can reach by falling +Z, not by walking. Its
  // edges are at least 2 from every tunnel wall, so it is too high to jump into from any floor.
  const hole = { u: [-2, 1] as [number, number], v: [-1, 2] as [number, number] };
  b.slab('z', L, L + T, w, w, b.wall, hole);

  b.tube(V(-2, -W, -9), V(2, -1, -T), ['+z'], b.alcove);
  // Sill under the doorway: the wall's hole runs to the floor, so nothing else covers this strip.
  b.box(V(-2, -W - T, -T), V(2, -W, 0), b.alcove);
  b.tube(V(hole.u[0], hole.v[0], L + T), V(hole.u[1], hole.v[1], L + T + 9), ['-z'], b.exit);

  // S: start wall, low east corner. Reachable from the -Y floor and the +X floor.
  b.addRelativeSwitch(V(2.5, -2.5, 0.3), V(0, 0, 1));
  // W: decoy on the floor. Does nothing from -Y; from +X it turns you to -Z (back toward the start wall).
  b.addRelativeSwitch(V(2.5, -W + 0.3, 6), V(0, 1, 0));
  // V: high on the west wall. From +Y (the ceiling) it turns gravity to +Z.
  b.addRelativeSwitch(V(-W + 0.3, 2.5, 2), V(1, 0, 0));

  b.placard(V(-2, -W + 1.6, -3), V(1, 0, 0), '-Y', 'CUBE 0127', { width: 2.6 });
  // Above the doorway on the start wall, beside lever S.
  b.placard(V(0, 1, 0), V(0, 0, 1), '-Y', 'ROTATIONAL LEVER\nTURNS CLOCKWISE AS FACED', { width: 6 });
  // On the +X wall beside W, read under +X before the throw.
  b.note(V(W, -0.5, 6), V(-1, 0, 0), '+X', 'More of them are dark every time I fall.', { width: 6.5, top: V(0, 0, 1) });

  return b.finish({
    name: 'XIII · THE TURNSTILE',
    hint: 'A white lever turns gravity clockwise, as you face it. Same lever, different floor, different turn.',
    spawnPosition: V(0, -W + 0.5, -5),
    entranceAxis: '-Y',
    exitAxis: '+Z',
    exitCenter: V(-0.5, 0.5, L + T + 7.5),
    exitRadius: 2.5,
  });
}
