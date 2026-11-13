import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Scene } from '@babylonjs/core/scene';
import { SkinRuntime } from '../../skins/Skin';
import { Builder, BuiltLevel, T, V } from '../Builder';

/**
 * Level 16 - the mirror of The Grate. A glass partition stands across the middle of the room with a doorway in
 * it, in your lane (z -4..1, 3 high): a crate is never in that lane, so it cannot use the doorway. The first lever
 * sends the crate east along the floor and it stops dead at the glass while you fall through the doorway to the east
 * wall: that is the lesson, seen from both sides. The crate has to go over the top (the partition stops 3.5 short of
 * the ceiling): up the partition's west face to the
 * ceiling, east along the ceiling through the gap, down the east wall onto a crates-only plate that opens the
 * exit. Route: -Y -> +X -> +Y -> +X -> -Y.
 *
 * Layout: the crate lives in the lane z = 3.25..4.75; every lever, landing and the doorway is at z <= 1, so the
 * player is never in its way. Lever 0 is on the doorway's jamb, so you throw it standing in the doorway's lane. Under +X and +Y you stand on the east wall / ceiling, so the levers for those
 * moves sit on the surfaces you can walk to from there (floor and ceiling edges of the east wall).
 * Wrong order: -Y again from the east wall straight after the first throw only drops the crate back to the
 * floor at the partition's foot (it is already there); you go round again from the doorway lever.
 */
export function buildSieve(scene: Scene, skin: SkinRuntime): BuiltLevel {
  const b = new Builder(scene, skin, new Color3(0.95, 0.6, 0.25));
  const R = 8; // half-width in x and z
  const F = -6; // floor
  const C = 6; // ceiling
  const x: [number, number] = [-R, R];
  const z: [number, number] = [-R, R];
  const doorZ: [number, number] = [-6, -2];
  const door = { y: [F, F + 3] as [number, number] };

  // Shell: entrance in the west wall, exit in the east wall, both just above the floor on the player's side.
  b.slab('y', F - T, F, x, z, b.floor);
  b.slab('y', C, C + T, x, z, b.wall);
  b.slab('z', -R - T, -R, x, [F, C], b.wall);
  b.slab('z', R, R + T, x, [F, C], b.wall);
  b.slab('x', -R - T, -R, [F, C], z, b.wall, { u: door.y, v: doorZ });
  b.slab('x', R, R + T, [F, C], z, b.wall, { u: door.y, v: doorZ });
  // Sills under the doorways, level with the floor.
  b.box(V(-R - T, F - 0.5, doorZ[0]), V(-R, F, doorZ[1]), b.alcove);
  b.box(V(R, F - 0.5, doorZ[0]), V(R + T, F, doorZ[1]), b.exit);

  b.tube(V(-R - T - 9, F, doorZ[0]), V(-R - T, F + 3, doorZ[1]), ['+x'], b.alcove);
  b.tube(V(R + T, F, doorZ[0]), V(R + T + 9, F + 3, doorZ[1]), ['-x'], b.exit);

  // The partition: the plane x = 0, the full depth of the room (it meets both side walls, floor to 3.5 under the
  // ceiling), so the crate cannot slip round the ends. The gap above it is 3.5 high for a 1.5 crate. The doorway
  // (z -4..1, 3 high, in your lane) is open; glass fills the partition above it.
  const gate: [number, number] = [-4, 1];
  b.glass(V(-0.25, F, -R), V(0.25, C - 3.5, gate[0]));
  b.glass(V(-0.25, F, gate[1]), V(0.25, C - 3.5, R));
  b.glass(V(-0.25, F + 3, gate[0]), V(0.25, C - 3.5, gate[1]));

  // The plate where the crate actually comes down: the east wall's foot, in the crate's lane.
  const plate = b.addPlate(V(R - 0.75, F, 4), V(0, 1, 0), 2.5, true);
  b.addDoor(V(R, door.y[0], doorZ[0]), V(R + T, door.y[1], doorZ[1]), [plate]);
  b.addCrate(V(-3, F + 0.75, 4), 1.5, { stamp: 'BALLAST MASS\nBM-2311' });

  // 0: on the doorway's jamb, thrown from inside the doorway's lane so the shift east carries you through: +X.
  b.addSwitch(V(0, F + 1.5, gate[1]), V(0, 0, -1), '+X');
  // 1: on the floor by the east wall, at your feet when you land there: +Y lifts the crate up the partition.
  b.addSwitch(V(R - 1.2, F, -0.5), V(0, 1, 0), '+Y');
  // 2: on the east wall by the ceiling, beside you when you land on the ceiling: +X slides the crate across.
  b.addSwitch(V(R - 0.3, C - 1.5, 0), V(-1, 0, 0), '+X');
  // 3: on the ceiling above the east wall's top: -Y drops the crate down the east wall onto the plate.
  b.addSwitch(V(R - 1.2, C, -0.5), V(0, -1, 0), '-Y');

  b.placard(V(-13, F + 1.6, doorZ[0]), V(0, 0, 1), '-Y', 'CUBE 0131', { width: 2.6 });
  b.placard(V(-4, F + 3.5, R), V(0, 0, -1), '-Y', 'ATTENDANT DOOR\nMASS WILL NOT PASS', { width: 5 });
  // On the east wall, where the first shift east puts you.
  b.note(V(R, F + 6, -4.5), V(-1, 0, 0), '+X', 'There are lights down there now.\nOne for every cube gone dark.', {
    width: 5.2,
    top: V(0, 0, 1),
  });

  return b.finish({
    name: 'XVI · THE SIEVE',
    hint: 'You can go through there. The crate cannot. It can go over.',
    spawnPosition: V(-R - T - 5, F + 0.5, -4),
    entranceAxis: '-Y',
    exitAxis: '-Y',
    exitCenter: V(R + T + 7, F + 0.5, -4),
    exitRadius: 2,
  });
}

export default buildSieve;
