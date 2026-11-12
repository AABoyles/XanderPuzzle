import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Scene } from '@babylonjs/core/scene';
import { SkinRuntime } from '../../skins/Skin';
import { Builder, BuiltLevel, T, V } from '../Builder';

/**
 * Level 10 - a crate is in the way (-Y -> -Z -> +X -> +Z). The way out is a square shaft in the north wall (+Z), set
 * 5.5 up so nobody can walk into it, and a 2.5 crate plugs its mouth. Behind the plug the shaft narrows to a neck the
 * crate cannot enter, so the plug is pinned by the shaft walls sideways and rests on the shoulder under +Z; only -Z
 * takes it out. Under +Z the north wall is the floor and the unplugged shaft is a pit in it: drop through the neck.
 *
 * Getting the crate out is the easy part (the lever beside the mouth, thrown with the plug in view). The trap is the
 * way back: from the south wall the obvious lever is -Y (back to the floor). A bracket on the south wall catches the
 * crate at exactly the mouth's height, so -Y then +Z slides it straight back into the shaft. The way that works moves
 * it off the shaft's line first: +X (it slides east into the south-east corner), then +Z (it slides north into the
 * north-east corner, clear of the mouth), then walk to the pit. Decoys: -Y -> +X -> +Z without ever throwing -Z leaves
 * the plug pinned; -Y -> -Z -> -Y -> +Z re-plugs it. A -Y lever on the north wall puts anyone who re-plugged it back on
 * the floor, and the south and east walls offer no -Y lever, so nobody can walk in under -Y with the plug out.
 * (-Z -> +Z is a half turn, so there is no direct lever for it.)
 */
export function buildStopper(scene: Scene, skin: SkinRuntime): BuiltLevel {
  const b = new Builder(scene, skin, new Color3(0.9, 0.6, 0.25));
  const R = 8;
  const full: [number, number] = [-R, R];
  // The mouth: 2.6 across in x and y, floor 5.5 above the room floor; the crate (2.5) sits in it with 0.05 to spare.
  const MX: [number, number] = [-1.3, 1.3];
  const MY: [number, number] = [-2.5, 0.1];
  // The neck: 1.8 across, so the player (1.0) falls through and the crate cannot go in. The shoulder is z = 10.
  const NX: [number, number] = [-0.9, 0.9];
  const NY: [number, number] = [-2.5, -0.7];
  const doorway = { u: [-R, -R + 3] as [number, number], v: [-2, 2] as [number, number] };

  b.slab('y', -R - T, -R, full, full, b.floor);
  b.slab('y', R, R + T, full, full, b.wall);
  b.slab('x', -R - T, -R, full, full, b.wall, doorway);
  b.slab('x', R, R + T, full, full, b.wall);
  b.slab('z', -R - T, -R, full, full, b.wall);
  b.slab('z', R, R + T, full, full, b.wall, { u: MX, v: MY });

  b.tube(V(-R - 9, -R, -2), V(-R - T, -R + 3, 2), ['+x'], b.alcove);
  // Sill under the doorway: the wall's hole runs to the floor.
  b.box(V(-R - T, -R - T, -2), V(-R, -R, 2), b.alcove);

  // The shaft past the wall (z 9 to 10), 2.6 across like the mouth: four blocks around the cavity.
  b.box(V(-3.3, -3.5, 9), V(MX[0], 1.1, 10), b.exit);
  b.box(V(MX[1], -3.5, 9), V(3.3, 1.1, 10), b.exit);
  b.box(V(MX[0], -3.5, 9), V(MX[1], MY[0], 10), b.exit);
  b.box(V(MX[0], MY[1], 9), V(MX[1], 1.1, 10), b.exit);
  // The neck (z 10 to 15), 1.8 across: its face at z = 10 is the shoulder the plug rests on under +Z. The cap at
  // z = 15 is the bottom of the pit.
  b.box(V(-3.3, -3.5, 10), V(NX[0], 1.1, 15), b.exit);
  b.box(V(NX[1], -3.5, 10), V(3.3, 1.1, 15), b.exit);
  b.box(V(NX[0], -3.5, 10), V(NX[1], NY[0], 15), b.exit);
  b.box(V(NX[0], NY[1], 10), V(NX[1], 1.1, 15), b.exit);
  b.box(V(-3.3, -3.5, 15), V(3.3, 1.1, 16), b.exit);

  // The bracket: catches the crate at the mouth's height when the player goes back to -Y, so +Z then slides it home.
  // It is a shelf, not a column, so the player can still cross the south wall under +X beneath it.
  b.box(V(-0.9, -3.5, -R), V(0.9, MY[0], -6));

  b.addCrate(V(0, MY[0] + 1.25, 8.75), 2.5, { stamp: 'BALLAST MASS\nBM-2236' });

  // Beside the mouth, thrown from the floor with the plug overhead: -Z takes the plug out.
  b.addSwitch(V(-2.8, -5.8, R - 0.3), V(0, 0, -1), '-Z');
  // On the south wall, where -Z lands you: back to the floor (the trap), or east (the way).
  b.addSwitch(V(-4.2, -6.2, -R + 0.3), V(0, 0, 1), '-Y');
  b.addSwitch(V(-1.4, -6.2, -R + 0.3), V(0, 0, 1), '+X');
  // On the east wall: north, clear of the mouth.
  b.addSwitch(V(R - 0.3, -6.5, -6), V(-1, 0, 0), '+Z');
  // On the north wall, for anyone who put the plug back: down to the floor to start again.
  b.addSwitch(V(5.5, -6, R - 0.3), V(0, 0, -1), '-Y');

  b.placard(V(-R - 4, -R + 1.6, 2), V(0, 0, -1), '-Y', 'CUBE 0123', { width: 2.6 });
  // Above the mouth.
  b.placard(V(0, 3.5, R), V(0, 0, -1), '-Y', 'AUXILIARY EXIT\nBALLAST MASS SEATED\nDO NOT UNSEAT', { width: 6 });
  // On the south wall, beside the levers; read under -Z, which is where the plug has just taken you.
  b.note(V(3.5, -5, -R), V(0, 0, 1), '-Z', 'It comes out easily.\nI put it back where I found it.\nTwice.', {
    width: 6,
    lineHeight: 0.45,
    top: V(0, 1, 0),
  });

  return b.finish({
    name: 'X · THE STOPPER',
    hint: 'Out is easy. Mind the way back.',
    spawnPosition: V(-R - 8, -R + 0.5, 0),
    entranceAxis: '-Y',
    exitAxis: '+Z',
    exitCenter: V(0, -1.6, 14.2),
    exitRadius: 1,
  });
}

export default buildStopper;
