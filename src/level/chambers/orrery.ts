import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Scene } from '@babylonjs/core/scene';
import { SkinRuntime } from '../../skins/Skin';
import { Builder, BuiltLevel, T, V } from '../Builder';

/**
 * Level 14 - the finale. A 24-unit cubic hall with a small "orrery" of blocks floating in the middle.
 * Gravity route: -Y -> +X -> +Z -> +Y -> -X -> -Z -> +Y, which visits all six orientations and ends
 * with you leaving through the corridor you came in by, upside down.
 *
 * One crate starts on the floor and rides every gravity change along the edges of the hall. The
 * exit is a hole in the entrance corridor's ceiling, closed by a door that opens while the crate sits
 * on a plate in the top-west corner of the south wall (the one with the corridor doorway).
 *
 * Intended solution (the crate does the rest):
 *   1. -Y: walk into the hall, throw the east-wall lever (+X). The crate slides to the east wall.
 *   2. +X: walk up/north along the east wall to the lever on the north wall (+Z). The crate slides north.
 *   3. +Z: on the north wall, walk to the lever on the floor (+Y, one-shot). The crate slides up the
 *      north-east edge to the ceiling.
 *   4. +Y: walk the ceiling to the south wall and throw the white relative lever (clockwise about the
 *      south wall: +Y -> -X). The crate slides west along the ceiling.
 *   5. -X: on the west wall, throw the lever on the south wall (-Z). The crate drops onto the plate.
 *   6. -Z: walk across the south wall to the doorway and fall down the corridor to its far end.
 *   7. Throw the corridor lever (+Y); you land on the corridor ceiling. The crate keeps the door open,
 *      so walk into the hole and fall up into the exit.
 * The +Y lever in step 3 is one-shot: throw it at the wrong time and you need R.
 */
export function buildOrrery(scene: Scene, skin: SkinRuntime): BuiltLevel {
  const b = new Builder(scene, skin, new Color3(0.72, 0.4, 1));
  const H = 12; // hall half-size
  const r: [number, number] = [-H, H];
  const door = { x: [-2, 2] as [number, number], y: [-12, -8] as [number, number] };

  // Hall shell. The south wall has the corridor doorway (it runs to the floor, hence the sill below).
  b.slab('y', -H - T, -H, r, r, b.floor);
  b.slab('y', H, H + T, r, r, b.wall);
  b.slab('x', -H - T, -H, r, r, b.wall);
  b.slab('x', H, H + T, r, r, b.wall);
  b.slab('z', H, H + T, r, r, b.wall);
  b.slab('z', -H - T, -H, r, r, b.wall, { u: door.x, v: door.y });

  // Entrance corridor (south of the hall). Its ceiling has a hole over z in [-20, -16], closed by a door.
  b.tube(V(-2, -12, -22), V(2, -8, -13), ['+z', '+y'], b.alcove);
  b.slab('y', -8, -7, [-2, 2], [-22, -13], b.alcove, { u: [-2, 2], v: [-20, -16] });
  b.box(V(-2, -H - T, -H - T), V(2, -H, -H), b.alcove);
  // The exit tube above the hole.
  b.tube(V(-2, -7, -20), V(2, -3, -16), ['-y'], b.exit);

  // The orrery: a core and six satellites, floating clear of every wall.
  b.box(V(-2, -2, -2), V(2, 2, 2));
  for (const s of [-7, 7]) {
    b.box(V(s - 1, -1, -1), V(s + 1, 1, 1));
    b.box(V(-1, s - 1, -1), V(1, s + 1, 1));
    b.box(V(-1, -1, s - 1), V(1, 1, s + 1));
  }

  const crate = V(0, -H + 0.75, 6);
  b.addCrate(crate);
  const plate = b.addPlate(V(-H + 0.75, H - 0.75, -H), V(0, 0, 1), 2.5, true);
  b.addDoor(V(-2, -8, -20), V(2, -7, -16), [plate]);

  // 1. -Y -> +X, on the east wall near the floor.
  b.addSwitch(V(H - 0.3, -10.5, -6), V(-1, 0, 0), '+X');
  // 2. +X -> +Z, on the north wall, 1.5 above the east wall.
  b.addSwitch(V(10.5, -6, H - 0.3), V(0, 0, -1), '+Z');
  // 3. +Z -> +Y (one-shot), on the floor, 1.5 above the north wall.
  b.addSwitch(V(6, -H + 0.3, 10.5), V(0, 1, 0), '+Y', { once: true });
  // 4. +Y -> -X, relative: on the south wall, 1.5 below the ceiling.
  b.addRelativeSwitch(V(4, 10.5, -H + 0.3), V(0, 0, 1));
  // 5. -X -> -Z, on the south wall, 1.5 above the west wall.
  b.addSwitch(V(-10.5, 5, -H + 0.3), V(0, 0, 1), '-Z');
  // 6. -Z -> +Y, in the corridor, 1.5 above its far end wall.
  b.addSwitch(V(1.7, -10, -20.5), V(-1, 0, 0), '+Y');

  return b.finish({
    name: 'XIV · THE ORRERY',
    hint: 'Everything you have learned, in one room. The way out is the way you came in.',
    spawnPosition: V(0, -H + 0.5, -21),
    entranceAxis: '-Y',
    exitAxis: '+Y',
    exitCenter: V(0, -3.5, -18),
    exitRadius: 2,
  });
}
