import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Scene } from '@babylonjs/core/scene';
import { SkinRuntime } from '../../skins/Skin';
import { Builder, BuiltLevel, T, V } from '../Builder';

/**
 * Level 7 - a single cube with a side room behind a doorway in four of its faces (+X, -X, +Z, +Y). A
 * doorway is only a door while its wall is the floor, so each room can only be entered under that
 * gravity. Rooms A (+X), B (-X) and C (+Z) each hold levers; D (+Y) is the exit. Every lever's colour
 * shows where it sends gravity, so the route can be planned backwards from the exit.
 *
 * Route: -Y -> +X -> -Z -> -X -> +Z -> +Y (five shifts).
 *  1. Start lever on the +X wall (-Y -> +X): fall onto the +X wall, walk into room A.
 *  2. A: lever -> -Z. Walk out and drop onto the -Z wall.
 *  3. The lever on the -X wall (-Z -> -X): fall onto the -X wall, walk into room B.
 *  4. B: lever -> +Z. Walk out and drop onto the +Z wall.
 *  5. C: lever -> +Y. Walk out and drop onto the +Y wall, then into the exit room D.
 *
 * Decoys, none of which can trap you:
 *  - A has a second lever (+X -> -Y), B a second lever (-X -> -Y): back to the start floor.
 *  - C has a second lever (+Z -> +X): back to the +X wall and room A.
 *  - On the -Z wall a lever beside where room A drops you (-Z -> +X) sits next to the real one's far wall.
 *  - On the +Y wall a lever (+Y -> -Z) lets you leave without entering D.
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
  b.addSwitch(V(wall, 0, -R + 1.5), V(-1, 0, 0), '+X'); // -Z floor: decoy, right where A drops you
  b.addSwitch(V(3, R - 1.5, -wall), V(0, 0, 1), '-Z'); // +Y floor: a way back out

  // Room levers.
  b.addSwitch(V(rd, 0, -rw), V(0, 0, 1), '-Z'); // A
  b.addSwitch(V(rd, -rw, 0), V(0, 1, 0), '-Y');
  b.addSwitch(V(-rd, 0, rw), V(0, 0, -1), '+Z'); // B
  b.addSwitch(V(-rd, -rw, 0), V(0, 1, 0), '-Y');
  b.addSwitch(V(0, rw, rd), V(0, -1, 0), '+Y'); // C
  b.addSwitch(V(rw, 0, rd), V(-1, 0, 0), '+X');

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
