import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Scene } from '@babylonjs/core/scene';
import { SkinRuntime } from '../../skins/Skin';
import { Builder, BuiltLevel, T, V } from '../Builder';

/**
 * Level 13 - a timed gravity field. One lever starts gravity cycling -Y -> +X -> +Z -> -Y every 5 seconds
 * (route: -Y -> +X -> +Z -> -Y -> +X). The room is a big box; you cross it by being in the right place
 * when each change comes:
 *   -Y: walk to the pillar's lane (z 12-15) so that +X drops you onto the pillar's west face,
 *   +X: climb that face to the height of the tall wall (y 6-10) so that +Z drops you onto its south face,
 *   +Z: climb and slide along that wall until you are over the high ledge so that -Y drops you onto it,
 *   -Y: stand on the ledge; the next +X carries you through the doorway at the same height into the exit.
 * The exit doorway is framed so it cannot be reached by walking up the east wall during a +X phase.
 * Most mistakes just drop you onto a shell wall; the cycle keeps running and brings you back to the
 * floor within a couple of phases to try again.
 *
 * Trap hole: one opening in the north wall (x 12-17, y 3.1-6). Be on the pillar's west face too low (below the
 * tall wall, above y 3.6) when +Z comes and you fall under the wall, through it and out of the chamber.
 */
export function buildTide(scene: Scene, skin: SkinRuntime): BuiltLevel {
  const b = new Builder(scene, skin, new Color3(0.15, 0.85, 0.72));
  const X = 24; // room extent: x 0..X, y 0..Y, z 0..Z
  const Y = 16;
  const Z = 24;
  const door = { x: [8, 12] as [number, number], y: [0, 3.5] as [number, number] }; // entrance, south wall
  const exit = { y: [12, 15] as [number, number], z: [16, 20] as [number, number] }; // exit, east wall

  b.slab('y', -T, 0, [-T, X + T], [-T, Z + T], b.floor);
  b.slab('y', Y, Y + T, [-T, X + T], [-T, Z + T], b.wall);
  b.slab('x', -T, 0, [0, Y], [-T, Z + T], b.wall);
  b.slab('x', X, X + T, [0, Y], [-T, Z + T], b.wall, { u: exit.y, v: exit.z });
  b.slab('z', -T, 0, [0, X], [0, Y], b.wall, { u: door.x, v: door.y });
  // Trap hole open to space, where the one costly mistake lands: on the pillar's west face (x 14-15) below the
  // tall wall's underside (y 6) when +Z comes, you fall north past the wall's end to here. Its bottom edge is 3.1
  // up so nobody on the floor can jump into it; it ends at the wall's underside. The east wall (x 23.5) and the
  // route (tall wall's south face, z 19.5) never reach it.
  b.slab('z', Z, Z + T, [0, X], [0, Y], b.wall, { u: [12, 17], v: [3.1, 6] });

  // The pillar: +X lands you on its west face (x = 15), which reaches up to y = 10.
  b.box(V(15, 0, 12), V(17, 10, 15));
  // The tall wall: +Z lands you on its south face (z = 20), between y = 6 and y = 15.
  b.box(V(3, 6, 20), V(17, 15, 22));
  // The high ledge, jutting out of the wall's face: -Y lands you on top of it (y = 12).
  b.box(V(3, 11, 16), V(8, 12, 20), b.exit);

  // Entrance alcove in the south wall.
  b.tube(V(door.x[0], 0, -9), V(door.x[1], door.y[1], -T), ['+z'], b.alcove);
  // A deep frame around the exit doorway. Under +X the east wall is a floor and the doorway a hole in
  // it; the frame stands 3 proud of that floor, too tall to climb, so the only way in is to fall east
  // from ledge height.
  const F = 3;
  b.box(V(X - F, exit.y[0] - 1, exit.z[0] - 1), V(X, exit.y[0], exit.z[1] + 1), b.exit);
  b.box(V(X - F, exit.y[1], exit.z[0] - 1), V(X, Y, exit.z[1] + 1), b.exit);
  b.box(V(X - F, exit.y[0], exit.z[0] - 1), V(X, exit.y[1], exit.z[0]), b.exit);
  b.box(V(X - F, exit.y[0], exit.z[1]), V(X, exit.y[1], exit.z[1] + 1), b.exit);
  // Exit corridor in the east wall, its floor level with the ledge top.
  b.tube(V(X + T, exit.y[0], exit.z[0]), V(X + 10, exit.y[1], exit.z[1]), ['-x'], b.exit);

  b.addSequenceSwitch(V(6, 1.5, 0.3), V(0, 0, 1), ['-Y', '+X', '+Z'], 5);

  b.placard(V(door.x[0], 1.7, -3), V(1, 0, 0), '-Y', 'CUBE 0134', { width: 2.6 });
  b.placard(V(4, 4, 0), V(0, 0, 1), '-Y', 'AUTOMATIC TRIM ENGAGED\nATTENDANT PRESENCE OPTIONAL', { width: 7 });
  // On the high ledge, read while waiting for the last shift.
  b.note(V(5.5, 12, 18), V(0, 1, 0), '-Y', 'It doesn\'t need us any more.\nI don\'t think it ever did.', {
    width: 4.8,
    top: V(0, 0, 1),
  });

  return b.finish({
    name: 'XVIII · THE TIDE',
    hint: 'The cube turns itself now. Be where the next shift needs you.',
    spawnPosition: V(10, 0.5, -5),
    entranceAxis: '-Y',
    exitAxis: '+X',
    exitCenter: V(X + 6, 13.5, 18),
    exitRadius: 2.5,
  });
}

export default buildTide;
