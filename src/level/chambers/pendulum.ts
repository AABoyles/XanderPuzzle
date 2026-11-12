import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Scene } from '@babylonjs/core/scene';
import { SkinRuntime } from '../../skins/Skin';
import { Builder, BuiltLevel, T, V } from '../Builder';

/**
 * Level 19 - a timed field that swings a crate as well as you. One lever starts gravity cycling
 * -Y -> +X -> -Y -> -X every 5 seconds (route: -Y -> +X -> -Y -> -X -> -Y -> +X -> -Y).
 * A crate lies in a sealed glass lane along the south wall, the whole length of the room. Under +X it slides to the
 * east end and presses a plate that opens the exit door; under -X it slides back to the west end and the door shuts.
 * So the door is open for a +X phase and the -Y phase after it.
 * A partition (x = 0, 3 high) splits the room. It is too tall to jump (a jump is under 2), and the lane runs through it
 * behind a grate (the crate passes, you do not). The lever is on the east half's side of the lane, so the first +X
 * carries you east and you watch the crate swing, the door open out of reach and shut again.
 * The rule to find: when +X comes, anything higher than the top of the partition (y 3) is carried east over it.
 * Anything at or below y 3 is caught by the partition's west face and stays west.
 * The exit is a doorway in the north wall of the WEST half, raised to y 3.5..6.5. In front of it is a dais (x -9..-5,
 * top 3.5, against the north wall), climbed from the south by two steps (tops 1.2 and 2.4). Each step is a rise of
 * 1.2 or 1.1, so you jump each one; the jump is under 2, so that is fine.
 * To win: be on the west side below y 3 when +X comes (the west floor, or any of the three steps, whose tops are 0,
 * 1.2, 2.4), so the +X stops you on the partition's west face. Then in the -Y phase after it (5 s, door open) you drop
 * to the west floor, walk to the steps (about 4 units, under 1 s at 6.5 units/s), jump up them and across the dais,
 * and walk through the door onto the reclaimer. By the sums that is about 3 s of walking and jumping in a 5 s phase:
 * enough, not generous. Not yet checked by play.
 * Being on the dais early is not a win: the door is shut until +X, and +X carries you off it. A mistake costs a
 * cycle: the cycle never stops, and nothing is a trap.
 * Leaks considered: the exit is in the north wall, a z face, which no axis of this cycle makes a floor, so you cannot
 * fall into the doorway, only walk into it from the dais, whose top is level with its sill. During -X you can fall
 * west off the partition's top and land on the dais's east face, which is no win: the door is still shut and the next
 * phase is -Y. A jump from the partition's top across the 4.5-unit gap to the dais top is not checked by play; if it
 * works, it is still before the +X, so it is no win either. The crate and plate are sealed in glass and the roof is
 * too high to jump onto, so you cannot jam the crate. The door is a slab filling its doorway exactly, and the dais and
 * steps stand against the wall with no floor gap under the doorway.
 */
export function buildPendulum(scene: Scene, skin: SkinRuntime): BuiltLevel {
  const b = new Builder(scene, skin, new Color3(0.9, 0.7, 0.25));
  const X0 = -14; // room extent: x -14..14, y 0..8, z 0..16
  const X1 = 14;
  const Y = 8;
  const Z = 16;
  const exitHole = { u: [-9, -5] as [number, number], v: [3.5, 6.5] as [number, number] }; // north wall, west half
  const entryHole = { u: [5, 9] as [number, number], v: [0, 3] as [number, number] }; // north wall, east half

  b.slab('y', -T, 0, [X0 - T, X1 + T], [-T, Z + T], b.floor);
  b.slab('y', Y, Y + T, [X0 - T, X1 + T], [-T, Z + T], b.wall);
  b.slab('x', X0 - T, X0, [0, Y], [-T, Z + T], b.wall);
  b.slab('x', X1, X1 + T, [0, Y], [-T, Z + T], b.wall);
  b.slab('z', -T, 0, [X0, X1], [0, Y], b.wall);
  // The north wall, one half per doorway (a slab takes one hole): exit in the west half, entrance in the east.
  b.slab('z', Z, Z + T, [X0, 0], [0, Y], b.wall, exitHole);
  b.slab('z', Z, Z + T, [0, X1], [0, Y], b.wall, entryHole);

  // The partition: x -0.5..0.5, 3 high, from the lane's front wall to the north wall.
  b.box(V(-0.5, 0, 2.2), V(0.5, 3, Z), b.exit);
  // Above the lane it continues (the lane's own roof is glass at y 2..2.2).
  b.box(V(-0.5, 2.2, 0), V(0.5, 3, 2.2), b.exit);
  // The lane through the partition: a grate stops you, the crate slides through.
  b.grate(V(-0.5, 0, 0), V(0.5, 2, 2));

  // The dais under the raised exit doorway, and the two steps up to it from the south (tops 2.4 and 1.2).
  b.box(V(-9, 0, 12), V(-5, 3.5, Z), b.exit);
  b.box(V(-9, 0, 10.5), V(-5, 2.4, 12), b.exit);
  b.box(V(-9, 0, 9), V(-5, 1.2, 10.5), b.exit);

  // The crate lane: glass front wall and roof, 2 wide inside and 2 high, along the south wall. Sealed, so you can
  // neither jump in nor stand in the crate's way; you watch it through the glass.
  b.glass(V(X0, 0, 2), V(X1, 2.2, 2.2));
  b.glass(V(X0, 2, 0), V(X1, 2.2, 2));
  b.addCrate(V(X0 + 0.75, 0.75, 1), 1.5, { stamp: 'BALLAST MASS\nBM-2352' });
  const plate = b.addPlate(V(X1, 0.75, 1), V(-1, 0, 0), 1, true);

  // The exit door fills its raised doorway exactly. Beyond it a corridor runs north, its floor level with the sill;
  // the player wins just past the door.
  b.addDoor(V(exitHole.u[0], exitHole.v[0], Z), V(exitHole.u[1], exitHole.v[1], Z + T), [plate]);
  b.tube(V(exitHole.u[0], exitHole.v[0], Z + T), V(exitHole.u[1], exitHole.v[1], Z + 10), ['-z'], b.exit);
  // Entrance alcove.
  b.tube(V(entryHole.u[0], 0, Z + T), V(entryHole.u[1], entryHole.v[1], Z + 10), ['-z'], b.alcove);

  // The lever sits on the lane's glass, east of the partition: facing it you see the whole lane and the plate.
  b.addSequenceSwitch(V(9, 1.4, 2.2), V(0, 0, 1), ['-Y', '+X', '-Y', '-X'], 5);

  b.placard(V(entryHole.u[0], 1.7, Z + 5), V(1, 0, 0), '-Y', 'CUBE 0137', { width: 2.6 });
  // On the north wall beside the raised exit door, west of the dais, read from the west floor while waiting.
  b.placard(V(-11.5, 4.5, Z), V(0, 0, -1), '-Y', 'DOOR HOLDS BALLAST POSITION\nNOT OPERATOR POSITION', { width: 4.6 });
  // On the partition's west face, read while it is the floor of the +X phase.
  b.note(V(-0.5, 1.5, 9), V(-1, 0, 0), '-Y', 'They didn\'t fall. They left.\nA dark cube prints no one back.', { width: 5.4 });

  return b.finish({
    name: 'XIX · THE PENDULUM',
    hint: 'Watch the crate. The door keeps its time, not yours.',
    spawnPosition: V(7, 0.5, Z + 5),
    entranceAxis: '-Y',
    exitAxis: '-Y',
    exitCenter: V(-7, 5, Z + 3.5),
    exitRadius: 2.5,
  });
}

export default buildPendulum;
