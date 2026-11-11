import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Scene } from '@babylonjs/core/scene';
import { SkinRuntime } from '../../skins/Skin';
import { Builder, BuiltLevel, V } from '../Builder';

/**
 * Level 6 - a staircase of three 3-high risers, climbed east. Gravity route: -Y -> +X -> -Y -> +X -> -Y
 * -> +X (the first -Y is the entrance; the last +X is the exit, you fall straight out of it).
 *
 * A divider wall splits the room into a north and a south lane. In each cell one lane is open to the
 * sky (its riser can be climbed under +X: walk up the wall, step off the top, fall east) and the other
 * lane has a solid block overhead that seals the riser's top. In the first two cells the climb drops you
 * into the sealed lane of the next cell, where you can only throw a lever back to -Y, walk through the
 * divider's doorway (too far west to reach while pinned to the riser) into the open lane, and go again.
 * The last cell swaps the lanes: the climb lands you in the lane that is already open, and the exit is
 * at the end of it, so you fall straight out. The habit of crossing the divider would take you into the
 * sealed lane, a dead end with nothing in it that you simply walk back out of (the doorway is at floor
 * level under -Y), so nothing can strand you.
 */
export function buildStaircase(scene: Scene, skin: SkinRuntime): BuiltLevel {
  const b = new Builder(scene, skin, new Color3(0.65, 0.9, 0.25));
  const CELLS = 4;
  const L = 8; // cell length along x
  const H = 3; // riser height
  const TOP = 17; // ceiling height
  const XE = CELLS * L; // east wall
  const N: [number, number] = [-6, -0.5];
  const S: [number, number] = [0.5, 6];

  // Shell.
  b.slab('y', -1, 0, [-1, XE + 1], [-7, 7], b.floor);
  b.slab('y', TOP, TOP + 1, [-1, XE + 1], [-7, 7], b.wall);
  b.slab('z', -7, -6, [-1, XE + 1], [-1, TOP + 1], b.wall);
  b.slab('z', 6, 7, [-1, XE + 1], [-1, TOP + 1], b.wall);
  b.slab('x', -1, 0, [0, TOP], [-6, 6], b.wall);
  const fTop = H * (CELLS - 1);
  b.slab('x', XE, XE + 1, [0, TOP], [-6, 6], b.wall, { u: [fTop, fTop + 3], v: [1, 5] });

  for (let k = 0; k < CELLS; k++) {
    const x = k * L;
    const f = k * H;
    if (k > 0) b.box(V(x, 0, -6), V(x + L, f, 6));
    // Sealed lane: alternates, starting with the north lane in cell 0.
    const closed = k === CELLS - 1 || k % 2 === 0 ? N : S; // the last cell swaps the pattern
    b.box(V(x, f + 3.4, closed[0]), V(x + L, TOP, closed[1]));
    // Divider with a 2.2-wide doorway at floor level.
    b.box(V(x, f, -0.5), V(x + 3, TOP, 0.5));
    b.box(V(x + 5.2, f, -0.5), V(x + L, TOP, 0.5));
    b.box(V(x + 3, f + 3, -0.5), V(x + 5.2, TOP, 0.5));

    const zs = (lane: [number, number]) => (lane === S ? 5.7 : -5.7);
    const wallN = (lane: [number, number]) => (lane === S ? V(0, 0, -1) : V(0, 0, 1));
    // +X lever in the open lane, near the riser.
    if (k < CELLS - 1) {
      const open = closed === N ? S : N;
      b.addSwitch(V(x + 6.2, f + 1.5, zs(open)), wallN(open), '+X');
    }
    // -Y lever in the sealed lane, where the fall east leaves you (not in the last cell: you land open).
    if (k > 0 && k < CELLS - 1) b.addSwitch(V(x + 6.5, f + 1.5, zs(closed)), wallN(closed), '-Y');
  }

  // Exit doorway in the south lane of the top cell: the lane the last climb lands you in, under +X it is a hole.
  b.box(V(XE, fTop - 1, 1), V(XE + 1, fTop, 5), b.exit);
  b.tube(V(XE + 1, fTop, 1), V(XE + 10, fTop + 3, 5), ['-x'], b.exit);

  b.placard(V(1.5, 2, -0.5), V(0, 0, -1), '-Y', 'CUBE 0118', { width: 2.6 });
  // The first riser, in the open lane.
  b.placard(V(L, 1.6, 3.2), V(-1, 0, 0), '-Y', [
    'RISER MAINTENANCE',
    '3 CLIMBS SCHEDULED',
    'SCHEDULE UNCHANGED',
    'SINCE CYCLE 1',
  ].join('\n'), {
    width: 5,
    lineHeight: 0.5,
  });
  // High on the next cell's sealed block, upright under +X: seen by looking up from the first climb.
  b.note(V(L, 10, 3.25), V(-1, 0, 0), '+X', 'Same stairs every time.\nI counted.', { top: V(0, 1, 0) });

  return b.finish({
    name: 'VI · THE STAIRCASE',
    hint: 'Climb, step off, turn the cube back, walk round. Look where you land.',
    spawnPosition: V(2, 0.5, -3),
    entranceAxis: '-Y',
    exitAxis: '+X',
    exitCenter: V(XE + 5, fTop + 1, 3),
    exitRadius: 2,
  });
}
