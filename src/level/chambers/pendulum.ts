import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Scene } from '@babylonjs/core/scene';
import { SkinRuntime } from '../../skins/Skin';
import { Builder, BuiltLevel, T, V } from '../Builder';

/**
 * Level 19 - a timed field that swings a crate as well as you. One lever starts gravity cycling
 * -Y -> +X -> -Y -> -X every 5 seconds (route: -Y -> +X -> -Y -> -X -> -Y -> +X -> -Y).
 * A crate lies in a sealed glass lane along the south wall, the whole length of the room. Under +X it slides to the
 * east end and presses a plate that opens the exit door; under -X it slides back to the west end and the door shuts.
 * So the door is open for a +X phase and the -Y phase after it, and you need that -Y phase: the doorway is at floor
 * level in the north wall of the WEST half.
 * A partition (x = 0) splits the room, too tall to jump, stopping 2 short of the ceiling. The lane runs through it
 * behind a grate (the crate passes, you do not). The lever is on the east half's side of the lane, so the first +X
 * carries you east and you watch the crate swing, the door open out of reach and shut again. To win, use the
 * -X phase: you land on the partition's east face, walk up it and over its top, and drop to the west wall; -Y sets
 * you on the west floor. At the next +X you fall onto the partition's west face (your floor for that phase), the door
 * opens, and the -Y after it sets you down on the west floor with the door open and a few steps to walk.
 * A mistake costs a cycle: the cycle never stops, and nothing is a trap (stand on the east side at +X and you are
 * simply on the wrong side for the -Y that follows; over the partition's top at +X you end up east).
 * Leaks considered: the exit is in the north wall, never the floor under any axis in this cycle, so no hole;
 * the crate and plate are sealed in glass and the roof is too high to jump onto, so you cannot jam the crate;
 * the door is a slab filling its doorway exactly.
 */
export function buildPendulum(scene: Scene, skin: SkinRuntime): BuiltLevel {
  const b = new Builder(scene, skin, new Color3(0.9, 0.7, 0.25));
  const X0 = -14; // room extent: x -14..14, y 0..8, z 0..16
  const X1 = 14;
  const Y = 8;
  const Z = 16;
  const exitHole = { u: [-9, -5] as [number, number], v: [0, 3] as [number, number] }; // north wall, west half
  const entryHole = { u: [5, 9] as [number, number], v: [0, 3] as [number, number] }; // north wall, east half

  b.slab('y', -T, 0, [X0 - T, X1 + T], [-T, Z + T], b.floor);
  b.slab('y', Y, Y + T, [X0 - T, X1 + T], [-T, Z + T], b.wall);
  b.slab('x', X0 - T, X0, [0, Y], [-T, Z + T], b.wall);
  b.slab('x', X1, X1 + T, [0, Y], [-T, Z + T], b.wall);
  b.slab('z', -T, 0, [X0, X1], [0, Y], b.wall);
  // The north wall, one half per doorway (a slab takes one hole): exit in the west half, entrance in the east.
  b.slab('z', Z, Z + T, [X0, 0], [0, Y], b.wall, exitHole);
  b.slab('z', Z, Z + T, [0, X1], [0, Y], b.wall, entryHole);

  // The partition: x -0.5..0.5, 6 high (2 short of the ceiling), from the lane's front wall to the north wall.
  b.box(V(-0.5, 0, 2.2), V(0.5, 6, Z), b.exit);
  // Above the lane it continues (the lane's own roof is glass at y 2..2.2).
  b.box(V(-0.5, 2.2, 0), V(0.5, 6, 2.2), b.exit);
  // The lane through the partition: a grate stops you, the crate slides through.
  b.grate(V(-0.5, 0, 0), V(0.5, 2, 2));

  // The crate lane: glass front wall and roof, 2 wide inside and 2 high, along the south wall. Sealed, so you can
  // neither jump in nor stand in the crate's way; you watch it through the glass.
  b.glass(V(X0, 0, 2), V(X1, 2.2, 2.2));
  b.glass(V(X0, 2, 0), V(X1, 2.2, 2));
  b.addCrate(V(X0 + 0.75, 0.75, 1), 1.5, { stamp: 'BALLAST MASS\nBM-2352' });
  const plate = b.addPlate(V(X1, 0.75, 1), V(-1, 0, 0), 1, true);

  // The exit door fills its doorway exactly. Beyond it a corridor runs north; the player wins just past the door.
  b.addDoor(V(exitHole.u[0], exitHole.v[0], Z), V(exitHole.u[1], exitHole.v[1], Z + T), [plate]);
  b.tube(V(exitHole.u[0], 0, Z + T), V(exitHole.u[1], exitHole.v[1], Z + 10), ['-z'], b.exit);
  // Entrance alcove.
  b.tube(V(entryHole.u[0], 0, Z + T), V(entryHole.u[1], entryHole.v[1], Z + 10), ['-z'], b.alcove);

  // The lever sits on the lane's glass, east of the partition: facing it you see the whole lane and the plate.
  b.addSequenceSwitch(V(9, 1.4, 2.2), V(0, 0, 1), ['-Y', '+X', '-Y', '-X'], 5);

  b.placard(V(entryHole.u[0], 1.7, Z + 5), V(1, 0, 0), '-Y', 'CUBE 0137', { width: 2.6 });
  // On the north wall above the exit door, read from the west floor while waiting.
  b.placard(V(-7, 5, Z), V(0, 0, -1), '-Y', 'DOOR HOLDS BALLAST POSITION\nNOT OPERATOR POSITION', { width: 7 });
  // On the partition's west face, read while it is the floor of the +X phase.
  b.note(V(-0.5, 3, 9), V(-1, 0, 0), '-Y', 'They didn\'t fall. They left.\nA dark cube prints no one back.', { width: 5.4 });

  return b.finish({
    name: 'XIX · THE PENDULUM',
    hint: 'Watch the crate. The door keeps its time, not yours.',
    spawnPosition: V(7, 0.5, Z + 5),
    entranceAxis: '-Y',
    exitAxis: '-Y',
    exitCenter: V(-7, 1.5, Z + 3.5),
    exitRadius: 2.5,
  });
}
