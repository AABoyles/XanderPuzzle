import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Scene } from '@babylonjs/core/scene';
import { SkinRuntime } from '../../skins/Skin';
import { Builder, BuiltLevel, T, V } from '../Builder';

/**
 * Level 12 - a dead man's switch (-Y -> +X -> -Y). A crate waits at the west end of a glass tunnel that runs along
 * the floor to the east wall, where its plate (crates only) opens the exit door. Halfway along, a gate shuts the
 * tunnel. The gate's plate is on the east wall, out in the room, and answers to the player's weight: it holds the
 * gate open only while you stand on it. The first lever turns gravity toward the east wall and the crate slides
 * up to the shut gate; you walk to the plate, the gate opens, and the crate carries on onto its own plate. Step
 * off early and the gate shuts on nothing: the crate waits against it until you step back on.
 *
 * The tunnel also cuts the floor in two (its glass is too tall to jump), and the exit is on the far side. So once
 * the crate is through, walk along the east wall past the tunnel's end to the second lever, which puts you down on
 * the north strip of floor beside the exit; the crate stays against its plate and the exit stays open. A third
 * lever on that strip (+X) is the way back for anyone who came down before the crate was through.
 *
 * Leaks: the tunnel is sealed in glass (no stepping in to block it, nothing can lift out under +Y), and only
 * -Y <-> +X levers exist, so the crate cannot go round the gate. No crate can reach the player's plate.
 */
export function buildDeadman(scene: Scene, skin: SkinRuntime): BuiltLevel {
  const b = new Builder(scene, skin, new Color3(0.9, 0.7, 0.3));
  const R = 8;
  const full: [number, number] = [-R, R];
  const doorway = { u: [-2, 2] as [number, number], v: [-R, -R + 3] as [number, number] };

  b.slab('y', -R - T, -R, full, full, b.floor);
  b.slab('y', R, R + T, full, full, b.wall);
  b.slab('x', -R - T, -R, full, full, b.wall);
  b.slab('x', R, R + T, full, full, b.wall);
  b.slab('z', -R - T, -R, full, full, b.wall, doorway);
  b.slab('z', R, R + T, full, full, b.wall, doorway);

  b.tube(V(-2, -R, -R - 9), V(2, -R + 3, -R - T), ['+z'], b.alcove);
  // Sill under each doorway: the wall's hole runs to the floor, so nothing else covers this strip.
  b.box(V(-2, -R - T, -R - T), V(2, -R, -R), b.alcove);
  b.tube(V(-2, -R, R + T), V(2, -R + 3, R + 9), ['-z'], b.exit);
  b.box(V(-2, -R - T, R), V(2, -R, R + T), b.exit);

  // The tunnel (inside 1.6 wide and high, for a 1.5 crate), glass all round so it can be watched from the whole
  // room and nobody can step in to stand in the crate's way. Its east end is the east wall itself.
  const lz = 4;
  b.glass(V(-R, -R, lz - 1.6), V(R, -R + 2.4, lz - 0.8));
  b.glass(V(-R, -R, lz + 0.8), V(R, -R + 2.4, lz + 1.6));
  b.glass(V(-R, -R + 1.6, lz - 1.6), V(R, -R + 2.4, lz + 1.6));
  b.addCrate(V(-6.5, -R + 0.75, lz), 1.5, { stamp: 'BALLAST MASS\nBM-2251' });

  // The crate's plate in the tunnel's east end; the exit door answers to it.
  const cratePlate = b.addPlate(V(R, -R + 0.75, lz), V(-1, 0, 0), 1.5, true);
  b.addDoor(V(-2, -R, R), V(2, -R + 3, R + T), [cratePlate]);

  // The gate, and the plate that holds it: on the east wall in the open room, for the player's weight.
  const gatePlate = b.addPlate(V(R, -3, -1), V(-1, 0, 0), 2, false);
  b.addDoor(V(0, -R, lz - 0.8), V(1, -R + 1.6, lz + 0.8), [gatePlate]);

  // First lever on the tunnel's south glass, so whoever throws it is looking through the glass at the crate, the
  // gate and the tunnel's east end. They then fall east along z = 1, clear of the gate plate (z -2..0, y -4..-2).
  b.addSwitch(V(-3, -R + 1.2, lz - 1.9), V(0, 0, -1), '+X');
  // Second lever on the east wall north of the tunnel: from the gate plate, walk the east wall round the tunnel's
  // end (it stands 2.4 proud of the floor's edge) to reach it, and it sets you down on the north strip by the exit.
  b.addSwitch(V(R - 0.3, -3, 6.8), V(-1, 0, 0), '-Y');
  // On the tunnel's north glass: back onto the east wall, for anyone on the north strip with the exit still shut.
  b.addSwitch(V(5, -R + 1.2, lz + 1.9), V(0, 0, 1), '+X');

  b.placard(V(-2, -R + 1.6, -R - 3), V(1, 0, 0), '-Y', 'CUBE 0125', { width: 2.6 });
  b.placard(V(R, -3, -5), V(-1, 0, 0), '+X', 'PLATE ACCEPTS ANY MASS\nATTENDANT MASS: ACCEPTED', {
    width: 5,
    top: V(0, 1, 0),
  });
  b.note(V(R, 0.8, -1), V(-1, 0, 0), '+X', 'It can\'t tell us\nfrom the crates.', {
    width: 4.4,
    lineHeight: 0.45,
    top: V(0, 1, 0),
  });

  return b.finish({
    name: 'XII · THE DEADMAN',
    hint: 'Something has to hold the gate for it. The crate can\'t be the one.',
    spawnPosition: V(0, -R + 0.5, -R - 5),
    entranceAxis: '-Y',
    exitAxis: '-Y',
    exitCenter: V(0, -R + 0.5, R + 7),
    exitRadius: 2,
  });
}
