import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Scene } from '@babylonjs/core/scene';
import { SkinRuntime } from '../../skins/Skin';
import { Builder, BuiltLevel, T, V } from '../Builder';

/**
 * Level 1 - a hollow cube. -Y -> +Z -> +X, then drop through the hole in the final floor.
 *
 * It is also the induction (NARRATIVE.md): the entrance corridor names the printer you start in and holds the
 * Margin's first note, signed, with the facility's notice about such markings opposite; the placard over the first
 * lever says what the cubes are for; and a glass skylight fills most of the ceiling, with the Crown straight overhead.
 */
export function buildVault(scene: Scene, skin: SkinRuntime): BuiltLevel {
  const b = new Builder(scene, skin, new Color3(0.25, 0.55, 0.9));
  const R = 12;
  const full: [number, number] = [-R, R];

  b.slab('y', -R - T, -R, full, full, b.floor);
  // The ceiling is mostly skylight: glass is as solid as wall, so nothing about the route changes.
  const sky: [number, number] = [-8, 8];
  b.slab('y', R, R + T, full, full, b.wall, { u: sky, v: sky });
  b.glass(V(sky[0], R, sky[0]), V(sky[1], R + T, sky[1]));
  b.slab('z', R, R + T, full, full, b.wall);
  b.slab('x', -R - T, -R, full, full, b.wall);
  b.slab('z', -R - T, -R, full, full, b.wall, { u: [-2, 2], v: [-R, -R + 3] });
  b.slab('x', R, R + T, full, full, b.wall, { u: [-2.5, 2.5], v: [-2.5, 2.5] });

  b.tube(V(-2, -R, -R - 9), V(2, -R + 3, -R - T), ['+z'], b.alcove);
  // Sill under the doorway: the wall's hole runs to the floor, so nothing else covers this strip.
  b.box(V(-2, -R - T, -R - T), V(2, -R, -R), b.alcove);
  b.tube(V(R + T, -2.5, -2.5), V(R + 9, 2.5, 2.5), ['-x'], b.exit);

  // The facility's induction placard, facing the entrance above the first lever.
  b.placard(V(0, -6, R), V(0, 0, -1), '-Y', [
    'CUBE 0112 · ATTENDANT INDUCTION',
    'THE CROWN SHIELDS THE PLANET FROM THE STAR.',
    'THE FIELD HOLDS UP THE CROWN.',
    'EACH CUBE IS A COUNTERWEIGHT.',
    'LEVERS TURN THE CUBE.',
    'THE ARROW\'S WALL WILL FACE THE PLANET.',
  ].join('\n'), {
    width: 12,
  });

  b.addSwitch(V(0, -R + 1.5, R - 0.3), V(0, 0, -1), '+Z');
  b.addSwitch(V(R - 0.3, 0, R - 1.5), V(-1, 0, 0), '+X');

  b.placard(V(2, -R + 1.6, -R - 7.5), V(-1, 0, 0), '-Y', 'CUBE 0112', { width: 2.6 });
  // On the corridor floor just ahead of the print bed, read walking out of it.
  b.placard(V(0, -R, -R - 2.6), V(0, 1, 0), '-Y', 'ATTENDANT PRINTER 0112\nKEEP THE BED CLEAR', {
    width: 3.6,
    top: V(0, 0, 1),
  });
  // The Margin's first note, on the corridor wall to the left of the bed (in Axis the wall its red
  // pencil shows up on): addressed, and signed.
  b.note(V(-2, -R + 1.6, -R - 3.6), V(1, 0, 0), '-Y', [
    'To whoever they print next:',
    'read the walls. I wrote on them.',
    '\u2014 416',
  ].join('\n'), {
    width: 4.6,
  });
  // Opposite it, the facility's answer. It has not been cleaned.
  b.placard(V(2, -R + 1.6, -R - 3.3), V(-1, 0, 0), '-Y', 'UNAUTHORISED MARKINGS\nWILL BE REMOVED\nAT NEXT CLEANING', {
    width: 4.4,
  });
  // On the +X wall, between the second lever's landing and the hole that is the way out: what the lit corridor is.
  b.placard(V(R, 0, 5.5), V(-1, 0, 0), '+X', 'ATTENDANT RECLAIMER\nSTAND ON THE PLATE.\nYOU WILL BE REPRINTED\nAT THE NEXT CUBE.', {
    width: 6,
    top: V(0, 0, -1),
  });
  // Named on the ceiling beside the skylight, read looking up from the doorway.
  b.placard(V(0, R, -10), V(0, -1, 0), '-Y', 'VIEWPORT · THE CROWN', { width: 6, top: V(0, 0, -1) });
  // The Margin, low on the exit wall: only upright while standing on the +Z wall.
  b.note(V(R, -6, 10), V(-1, 0, 0), '+Z', 'You\'ll get used to it.\nThe turning, I mean.');

  return b.finish({
    name: 'I · THE VAULT',
    hint: 'Levers turn the cube until the arrow\'s wall faces the planet. That wall is your floor now.',
    spawnPosition: V(0, -R + 0.5, -R - 5),
    entranceAxis: '-Y',
    exitAxis: '+X',
    exitCenter: V(R + 7, 0, 0),
    exitRadius: 2.5,
    vista: true,
  });
}
