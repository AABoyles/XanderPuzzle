import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Scene } from '@babylonjs/core/scene';
import { SkinRuntime } from '../../skins/Skin';
import { Builder, BuiltLevel, T, V } from '../Builder';

/**
 * Level 14 - the finale. A 24-unit cubic hall with an "orrery" floating in the middle: a model of the ballast field
 * (NARRATIVE.md). A square ring at the top is the Crown, a broad plinth on the floor is the planet, and the 13 small
 * cubes between them are the field: 5 lit, 8 dark, the 38% the placard reports. Ring and planet are labelled.
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
 *
 * The trap (a fork at step 4): from the ceiling a second lever, on the ceiling itself, sends gravity straight to -Z,
 * which looks like the quick way to the south wall. It slides the crate south along the ceiling's east edge into the
 * corner by the south wall, where a block on the ceiling stops it under -X. From the south wall the only levers in
 * reach are the corridor's +Y and the dead -Z, so gravity only cycles -Z, +Y, -X and the crate never leaves. The +Y
 * lever that got you to the ceiling is already spent, so there is no way round: restart (as in the Lockout, with a
 * crate). The fork lever is more than 4 from every wall, so it cannot be thrown early from the east or north wall.
 * (A crate-only way round exists on paper, -Z, -Y, -X, +Y, but no lever gives -Y from there.)
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

  // The orrery: a model of the ballast field, floating clear of every wall (all of it within 5 of the hall's centre
  // line, so 7 clear of the walls the route walks on). The Crown is a square ring at the top.
  b.box(V(-5, 6, -5), V(5, 7, -3));
  b.box(V(-5, 6, 3), V(5, 7, 5));
  b.box(V(-5, 6, -3), V(-3, 7, 3));
  b.box(V(3, 6, -3), V(5, 7, 3));
  // The planet, a broad plinth on the floor under it all: low enough to see the field and the Crown over it from the
  // doorway, and clear of the crate (which leaves along z = 6) and of the walk to the first lever.
  b.box(V(-3, -H, -3), V(3, -H + 1.5, 3));
  // The field between them: 13 cubes, 5 still lit (38%, the figure on the north wall's placard).
  const lit = [V(-3, -3, 2), V(2, -1, -3), V(4, 1, 1), V(-1, 2, 4), V(-4, 3, -2)];
  const dark = [
    V(1, -4, 0),
    V(-2, -1, -1),
    V(4, -2, -4),
    V(0, 0, 2),
    V(-4, 0, 3),
    V(2, 3, -1),
    V(-1, 4, -4),
    V(3, 4, 4),
  ];
  // The star, above the Crown: the Crown stands between it and the planet. Clear of anyone walking the ceiling.
  b.modelCube(V(0, 9.5, 0), 1.4, true);
  b.placard(V(0, 9.5, -0.7), V(0, 0, -1), '-Y', 'STAR', { width: 1.3, lineHeight: 0.4 });
  lit.forEach((c) => b.modelCube(c, 1, true));
  dark.forEach((c) => b.modelCube(c, 1, false));
  // Labelled on the side that faces the entrance.
  b.placard(V(0, 6.5, -5), V(0, 0, -1), '-Y', 'CROWN', { width: 3, lineHeight: 0.5 });
  b.placard(V(0, -H + 0.75, -3), V(0, 0, -1), '-Y', 'PLANET', { width: 3 });

  // The pocket: the -Z lever slides the crate down the east wall's top edge into the corner where the south wall
  // begins. This block, on the ceiling beside that corner, then stops it under -X, the only shift that could
  // carry it west to the plate. From the south wall the levers within reach (the corridor's +Y, the dead -Z)
  // never leave the {-Z, +Y, -X} cycle, so the crate stays here. Clear of the walk to the white lever at x = 4.
  b.box(V(8.5, 9, -H), V(10.5, H, -9));

  const crate = V(0, -H + 0.75, 6);
  b.addCrate(crate, 1.5, { stamp: 'BALLAST MASS\nBM-2390' });
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
  // 7. The fork (+Y -> -Z), on the ceiling beside the walk from the one-shot lever's landing to the relative lever,
  // with the crate's corner (NE) and the pocket (SE) in view beyond it. Far enough from the east and north walls
  // (4.5 and 8.5) that it can only be thrown from the ceiling. Last in the list so the route keeps its indexes.
  b.addSwitch(V(7, H - 0.3, 3), V(0, -1, 0), '-Z');

  b.placard(V(-2, -H + 1.6, -18.5), V(1, 0, 0), '-Y', 'CUBE 0140', { width: 2.6 });
  // On the north wall, upright once it is the floor.
  b.placard(
    V(4, -4, H),
    V(0, 0, -1),
    '+Z',
    [
      'FIELD ALIGNMENT: 38% OF CUBES RESPONDING',
      'CROWN SHIELD HOLDING AT 38%',
      'ATTENDANT SUPPLY INCREASED TO COMPENSATE',
    ].join('\n'),
    {
      width: 10,
      top: V(0, 1, 0),
    },
  );
  // The reveal (NARRATIVE.md): a fixed crate on the ceiling beside the walk to the relative lever, clear of the
  // live crate's path along the hall's edges.
  b.addFixedCrate(V(-5, H - 0.75, -2), 1.5, { stamp: 'BALLAST MASS\nAT-0416' });
  b.placard(V(-3.2, H, -2), V(0, -1, 0), '+Y', 'THANK YOU FOR YOUR\nCONTINUED ALIGNMENT.', {
    width: 5.5,
    top: V(-1, 0, 0),
  });
  // The Margin's last note, far from the route on the west wall.
  b.note(
    V(-H, -4, 6),
    V(1, 0, 0),
    '-X',
    [
      "If you're reading this, I didn't",
      'get back to cube 0147.',
      'There is a hole in its ceiling.',
      '\u2014 416',
    ].join('\n'),
    {
      width: 5,
      top: V(0, 1, 0),
    },
  );

  return b.finish({
    name: 'XX · THE ORRERY',
    hint: 'Everything you have learned, in one room. The way out is the way you came in.',
    spawnPosition: V(0, -H + 0.5, -21),
    entranceAxis: '-Y',
    exitAxis: '+Y',
    exitCenter: V(0, -3.5, -18),
    exitRadius: 2,
  });
}

export default buildOrrery;
