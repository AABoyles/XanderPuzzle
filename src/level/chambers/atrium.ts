import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Scene } from '@babylonjs/core/scene';
import { SkinRuntime } from '../../skins/Skin';
import { Builder, BuiltLevel, T, V } from '../Builder';

/**
 * Level 7 - a single cube with a side room behind a doorway in four of its faces (+X, -X, +Z, +Y). A
 * doorway is only a door while its wall is the floor, so each room can only be entered under that
 * gravity. Rooms A (+X), B (-X) and C (+Z) each hold levers; D (+Y) is the exit. Every lever's colour
 * shows where it sends gravity, so the route can be planned backwards from the exit: D needs +Y, the only
 * +Y lever is in C, and C is only a door under +Z.
 *
 * Long route: -Y -> +X -> -Z -> -X -> +Z -> +Y (five shifts).
 *  1. Start lever on the +X wall (-Y -> +X): fall onto the +X wall, walk into room A.
 *  2. A: lever -> -Z. Walk out and drop onto the -Z wall.
 *  3. The lever on the -X wall (-Z -> -X): fall onto the -X wall, walk into room B.
 *  4. B: lever -> +Z. Walk out and drop onto the +Z wall.
 *  5. C: lever -> +Y. Walk out and drop onto the +Y wall, then into the exit room D.
 *
 * Short route: -Y -> +X -> +Z -> +Y (three shifts). Room A holds a third lever, -> +Z. Throw it instead of the
 * -Z lever beside it: you land on room A's side wall, walk out and drop onto the +Z wall, walk into room C and
 * throw its +Y lever. The three levers in A are the chamber's one real choice, and only a player who works back
 * from the exit sees why +Z is the one that matters.
 *
 * Decoys, none of which can trap you: A and B each have a second lever (-> -Y): back to the start floor.
 *
 * Also in the +X +Y +Z corner: a sealed glass cage holding one free crate, with no job. It slides to a new
 * side of the cage on every shift. It shows a crate moving under gravity before The Ballast needs one.
 */
export function buildAtrium(scene: Scene, skin: SkinRuntime): BuiltLevel {
  const b = new Builder(scene, skin, new Color3(0.85, 0.3, 0.7));
  const R = 7; // half-size of the central cube
  const H = 2; // half-size of each doorway and side room
  const D = 7; // depth of each side room
  const full: [number, number] = [-R - T, R + T];
  const inner: [number, number] = [-R, R];
  const hole = { u: [-H, H] as [number, number], v: [-H, H] as [number, number] };

  // The cube. X slabs own the corner columns, then Y slabs, then Z slabs, so the shell is sealed.
  b.slab('x', R, R + T, full, full, b.wall, hole);
  b.slab('x', -R - T, -R, full, full, b.wall, hole);
  b.slab('y', R, R + T, inner, full, b.wall, hole);
  b.slab('y', -R - T, -R, inner, full, b.floor);
  b.slab('z', R, R + T, inner, inner, b.wall, hole);
  b.slab('z', -R - T, -R, inner, inner, b.wall);

  // Side rooms, flush with their doorways so there is no lip to step over.
  b.tube(V(R + T, -H, -H), V(R + T + D, H, H), ['-x'], b.alcove); // A
  b.tube(V(-R - T - D, -H, -H), V(-R - T, H, H), ['+x'], b.alcove); // B
  b.tube(V(-H, -H, R + T), V(H, H, R + T + D), ['-z'], b.alcove); // C
  b.tube(V(-H, R + T, -H), V(H, R + T + D, H), ['-y'], b.exit); // D, the exit

  const wall = R - 0.3; // lever centre, just off a cube wall
  const rd = R + T + D - 1.5; // lever depth in a room: 1.5 above its floor
  const rw = H - 0.3; // lever centre, just off a room's side wall

  // Cube levers. Each sits on a wall along its own target's axis, so it is dead on that wall as a floor.
  b.addSwitch(V(wall, -R + 1.5, 0), V(-1, 0, 0), '+X'); // start floor: to room A
  b.addSwitch(V(-wall, 0, -R + 1.5), V(1, 0, 0), '-X'); // -Z floor: to room B
  // Room levers.
  // Room A, the fork: -Z is the long way round, +Z goes straight to room C, -Y goes back to the start.
  b.addSwitch(V(rd, 0, rw), V(0, 0, -1), '+Z');
  b.addSwitch(V(rd, 0, -rw), V(0, 0, 1), '-Z');
  b.addSwitch(V(rd, -rw, 0), V(0, 1, 0), '-Y');
  b.addSwitch(V(-rd, 0, rw), V(0, 0, -1), '+Z'); // B
  b.addSwitch(V(-rd, -rw, 0), V(0, 1, 0), '-Y');
  b.addSwitch(V(0, rw, rd), V(0, -1, 0), '+Y'); // C

  // The crate in its cage, in the +X +Y +Z corner: the cube's own walls are three sides, glass the other three.
  // Inside it is 4 across. It clears every doorway (they are within 2 of the centre of a face) and the levers.
  const g = 0.2;
  const C0 = R - 4; // inner face of the glass
  b.glass(V(C0 - g, C0 - g, C0 - g), V(C0, R, R));
  b.glass(V(C0 - g, C0 - g, C0 - g), V(R, C0, R));
  b.glass(V(C0 - g, C0 - g, C0 - g), V(R, R, C0));
  b.addCrate(V(5, C0 + 0.75, 5), 1.5, { stamp: 'BALLAST MASS\nBM-2207' });
  // On the +Z wall just below the cage.
  b.placard(V(5, 1.2, R), V(0, 0, -1), '-Y', 'MASS UNDER OBSERVATION\nNO ACTION REQUIRED', { width: 3.6 });

  b.placard(V(0, -R + 2.5, R), V(0, 0, -1), '-Y', 'CUBE 0119', { width: 2.6 });
  // Each doorway's label is on the face it is cut in, upright only under the gravity that makes it the floor.
  b.placard(V(R, 0, -3.2), V(-1, 0, 0), '+X', 'ROOM A', { width: 2.4, top: V(0, 0, 1) });
  b.placard(V(-R, 0, 3.2), V(1, 0, 0), '-X', 'ROOM B', { width: 2.4, top: V(0, 0, -1) });
  b.placard(V(-3.2, 0, R), V(0, 0, -1), '+Z', 'ROOM C', { width: 2.4, top: V(1, 0, 0) });
  b.placard(V(0, R, -3.2), V(0, -1, 0), '+Y', 'EXIT', { width: 2.4, top: V(0, 0, 1) });
  // Room B's side wall, upright under -X.
  b.note(V(-12, 0, -H), V(0, 0, 1), '-X', 'I have been here before.\nThis cube was the same\nlast time.', {
    width: 3.8,
  });

  return b.finish({
    name: 'VII · THE ATRIUM',
    hint: 'A doorway is only a door when its wall is the floor. Work backwards from the exit.',
    spawnPosition: V(0, -R + 0.5, 0),
    entranceAxis: '-Y',
    exitAxis: '+Y',
    exitCenter: V(0, R + T + D - 1, 0),
    exitRadius: 2,
  });
}

export default buildAtrium;
