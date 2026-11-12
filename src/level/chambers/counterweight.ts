import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Scene } from '@babylonjs/core/scene';
import { SkinRuntime } from '../../skins/Skin';
import { Builder, BuiltLevel, T, V } from '../Builder';

/**
 * Level 9 - two crates, two plates, one door that needs both pressed. Route: -Y -> -X -> -Y -> +X.
 * One plate sits at the bottom of a shallow pit in the floor, the other on the +X wall. Seating the
 * wall plate (+X) drags the other crate along with it, so the order matters: first slide the pit
 * crate to the -X wall and let it drop into the pit (-X, -Y), where the pit's walls pin it against
 * every sideways gravity; only then send the second crate to the +X plate. The exit door is on the
 * +Z wall, reached by walking along the +X wall.
 */
export function buildCounterweight(scene: Scene, skin: SkinRuntime): BuiltLevel {
  const b = new Builder(scene, skin, new Color3(0.65, 0.4, 0.95));
  const R = 8;
  const full: [number, number] = [-R, R];
  const tall: [number, number] = [-R - 2, R]; // the shell reaches 2 below the floor, for the pit
  const side: [number, number] = [-R, R];
  const doorY: [number, number] = [-R, -R + 3];

  // Shell. The floor is a solid block with a 2x2 pit (1 deep) cut near the -X wall.
  b.slab('y', -R - 2, -R - 1, full, full, b.floor);
  b.box(V(-R, -R - 1, -R), V(-6, -R, -1), b.floor);
  b.box(V(-R, -R - 1, 1), V(-6, -R, R), b.floor);
  b.box(V(-6, -R - 1, -R), V(R, -R, R), b.floor);
  // A glass skylight in the ceiling, as solid as the wall it replaces: the Crown is straight overhead.
  const sky: [number, number] = [-6, 6];
  b.slab('y', R, R + T, full, full, b.wall, { u: sky, v: sky });
  b.glass(V(sky[0], R, sky[0]), V(sky[1], R + T, sky[1]));
  b.slab('x', -R - T, -R, tall, side, b.wall);
  b.slab('x', R, R + T, tall, side, b.wall);
  b.slab('z', -R - T, -R, full, [-R, R], b.wall, { u: [-2, 2], v: doorY });
  b.slab('z', R, R + T, full, [-R, R], b.wall, { u: [5, R], v: doorY });
  b.box(V(-R, -R - 2, -R - T), V(R, -R, -R), b.wall);
  b.box(V(-R, -R - 2, R), V(R, -R, R + T), b.wall);

  // Entrance (-Z) and exit (+Z).
  b.tube(V(-2, -R, -R - 9), V(2, -R + 3, -R - T), ['+z'], b.alcove);
  b.tube(V(5, -R, R + T), V(R, -R + 3, R + 9), ['-z'], b.exit);
  // Sill under the exit doorway: the hole runs to the +X wall, so nothing else covers the strip.
  b.box(V(R, doorY[0], R), V(R + T, doorY[1], R + T), b.exit);

  // Pit crate and wall crate; the pit sits under the -X end of the pit crate's row (z = 0).
  b.addCrate(V(-3, -R + 0.75, 0), 1.5, { stamp: 'BALLAST MASS\nBM-2232' });
  b.addCrate(V(3, -R + 0.75, -3), 1.5, { stamp: 'BALLAST MASS\nBM-2240' });
  const pitPlate = b.addPlate(V(-7, -R - 1, 0), V(0, 1, 0), 1.8, true);
  const wallPlate = b.addPlate(V(R, -R + 0.75, -3), V(-1, 0, 0), 2, true);
  b.addDoor(V(5, doorY[0], R), V(R, doorY[1], R + T), [pitPlate, wallPlate]);

  // Every lever sits on the south face of a low glass screen in the south strip (z -5.5..-4.5), clear of both crate
  // lanes (z 0 and z -3), so each is thrown facing north with the crates, the pit and the plates beyond it.
  // -Y -> -X: from the entrance side, the pit crate dead ahead and the pit to its left.
  b.glass(V(-4.75, -R, -5.5), V(-3.25, -R + 1.2, -4.5));
  b.addSwitch(V(-4, -R + 0.7, -5.8), V(0, 0, -1), '-X');
  // -X -> -Y: where the shift west lands you (west wall, same z); watch the pit crate drop into the pit.
  b.glass(V(-R + 0.1, -R, -5.5), V(-5.5, -R + 1.2, -4.5));
  b.addSwitch(V(-6.5, -R + 0.7, -5.8), V(0, 0, -1), '-Y');
  // -Y -> +X: far enough west that the pit and both crates are in one view; the wrong order is seen at once.
  b.glass(V(-2.25, -R, -5.5), V(-0.75, -R + 1.2, -4.5));
  b.addSwitch(V(-1.5, -R + 0.7, -5.8), V(0, 0, -1), '+X');
  // Undo for a wrong order: -Y from the +X wall, where the shift east lands you.
  b.glass(V(5.5, -R, -5.5), V(R - 0.1, -R + 1.2, -4.5));
  b.addSwitch(V(6.5, -R + 0.7, -5.8), V(0, 0, -1), '-Y');

  b.placard(V(-2, -R + 1.6, -R - 3), V(1, 0, 0), '-Y', 'CUBE 0124', { width: 2.6 });
  b.placard(V(0, -5.5, R), V(0, 0, -1), '-Y', 'TRIM REQUIRES 2 MASSES\nATTENDANTS ON THIS CYCLE: 1', { width: 6 });
  b.placard(V(0, R, -7), V(0, -1, 0), '-Y', 'VIEWPORT · THE CROWN', { width: 6, top: V(0, 0, -1) });
  // Facing the entrance, above the Stencil: what the Margin saw through the skylight.
  b.note(V(0, -2.5, R), V(0, 0, -1), '-Y', 'Look up. That is what we hold up.\nIt keeps the star off the ground.\nNobody is up there.', {
    width: 5.6,
  });
  // On the -X wall above the pit, upright once it is the floor.
  b.note(V(-R, -3, -4), V(1, 0, 0), '-X', 'I have never met another attendant.\nThe roster has room for hundreds.', {
    width: 6,
    top: V(0, 1, 0),
  });

  return b.finish({
    name: 'XI · THE COUNTERWEIGHT',
    hint: 'Pin one crate where gravity cannot move it, then seat the other.',
    spawnPosition: V(0, -R + 0.5, -R - 5),
    entranceAxis: '-Y',
    exitAxis: '+X',
    exitCenter: V(R - 0.5, -R + 1.5, R + 5),
    exitRadius: 2.2,
    vista: true,
  });
}

export default buildCounterweight;
