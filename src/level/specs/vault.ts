import { WALL_T as T, type ChamberSpec } from '../spec.ts';

const R = 12;
const full: [number, number] = [-R, R];
// The ceiling is mostly skylight: glass is as solid as wall, so nothing about the route changes.
const sky: [number, number] = [-8, 8];

/**
 * Level 1 - a hollow cube. -Y -> +Z -> +X, then drop through the hole in the final floor.
 *
 * It is also the induction (NARRATIVE.md): the entrance corridor names the printer you start in and holds the
 * Margin's first note, signed, with the facility's notice about such markings opposite; the placard over the first
 * lever says what the cubes are for; and a glass skylight fills most of the ceiling, with the Crown straight overhead.
 */
export const VAULT: ChamberSpec = {
  accent: [0.25, 0.55, 0.9],
  parts: [
    { kind: 'slab', axis: 'y', lo: -R - T, hi: -R, u: full, v: full, role: 'shell' },
    { kind: 'slab', axis: 'y', lo: R, hi: R + T, u: full, v: full, role: 'shell', hole: { u: sky, v: sky } },
    { kind: 'glass', min: [sky[0], R, sky[0]], max: [sky[1], R + T, sky[1]] },
    { kind: 'slab', axis: 'z', lo: R, hi: R + T, u: full, v: full, role: 'shell' },
    { kind: 'slab', axis: 'x', lo: -R - T, hi: -R, u: full, v: full, role: 'shell' },
    {
      kind: 'slab',
      axis: 'z',
      lo: -R - T,
      hi: -R,
      u: full,
      v: full,
      role: 'shell',
      hole: { u: [-2, 2], v: [-R, -R + 3] },
    },
    {
      kind: 'slab',
      axis: 'x',
      lo: R,
      hi: R + T,
      u: full,
      v: full,
      role: 'shell',
      hole: { u: [-2.5, 2.5], v: [-2.5, 2.5] },
    },
    { kind: 'tube', min: [-2, -R, -R - 9], max: [2, -R + 3, -R - T], open: ['+z'], role: 'alcove' },
    // Sill under the doorway: the wall's hole runs to the floor, so nothing else covers this strip.
    { kind: 'box', min: [-2, -R - T, -R - T], max: [2, -R, -R], role: 'alcove' },
    { kind: 'tube', min: [R + T, -2.5, -2.5], max: [R + 9, 2.5, 2.5], open: ['-x'], role: 'exit' },
  ],
  levers: [
    { at: [0, -R + 1.5, R - 0.3], normal: [0, 0, -1], target: '+Z' },
    { at: [R - 0.3, 0, R - 1.5], normal: [-1, 0, 0], target: '+X' },
  ],
  placards: [
    // The facility's induction placard, facing the entrance above the first lever.
    {
      at: [0, -6, R],
      normal: [0, 0, -1],
      readAs: '-Y',
      text: [
        'CUBE 0112 · ATTENDANT INDUCTION',
        'THE CROWN SHIELDS THE PLANET FROM THE STAR.',
        'THE FIELD HOLDS UP THE CROWN.',
        'EACH CUBE IS A COUNTERWEIGHT.',
        'LEVERS TURN THE CUBE.',
        "THE ARROW'S WALL WILL FACE THE PLANET.",
      ].join('\n'),
      width: 12,
    },
    { at: [2, -R + 1.6, -R - 7.5], normal: [-1, 0, 0], readAs: '-Y', text: 'CUBE 0112', width: 2.6 },
    // On the corridor floor just ahead of the print bed, read walking out of it.
    {
      at: [0, -R, -R - 2.6],
      normal: [0, 1, 0],
      readAs: '-Y',
      text: 'ATTENDANT PRINTER 0112\nKEEP THE BED CLEAR',
      width: 3.6,
      top: [0, 0, 1],
    },
    // The Margin's first note, on the corridor wall to the left of the bed (in Axis the wall its red
    // pencil shows up on): addressed, and signed.
    {
      at: [-2, -R + 1.6, -R - 3.6],
      normal: [1, 0, 0],
      readAs: '-Y',
      text: ['To whoever they print next:', 'read the walls. I wrote on them.', '— 416'].join('\n'),
      voice: 'margin',
      width: 4.6,
    },
    // Opposite it, the facility's answer. It has not been cleaned.
    {
      at: [2, -R + 1.6, -R - 3.3],
      normal: [-1, 0, 0],
      readAs: '-Y',
      text: 'UNAUTHORISED MARKINGS\nWILL BE REMOVED\nAT NEXT CLEANING',
      width: 4.4,
    },
    // On the +X wall, between the second lever's landing and the hole that is the way out: what the lit corridor is.
    {
      at: [R, 0, 5.5],
      normal: [-1, 0, 0],
      readAs: '+X',
      text: 'ATTENDANT RECLAIMER\nSTAND ON THE PLATE.\nYOU WILL BE REPRINTED\nAT THE NEXT CUBE.',
      width: 6,
      top: [0, 0, -1],
    },
    // Named on the ceiling beside the skylight, read looking up from the doorway.
    { at: [0, R, -10], normal: [0, -1, 0], readAs: '-Y', text: 'VIEWPORT · THE CROWN', width: 6, top: [0, 0, -1] },
    // The Margin, low on the exit wall: only upright while standing on the +Z wall.
    {
      at: [R, -6, 10],
      normal: [-1, 0, 0],
      readAs: '+Z',
      text: "You'll get used to it.\nThe turning, I mean.",
      voice: 'margin',
    },
  ],
  name: 'I · THE VAULT',
  hint: "Levers turn the cube until the arrow's wall faces the planet. That wall is your floor now.",
  spawn: [0, -R + 0.5, -R - 5],
  entranceAxis: '-Y',
  exitAxis: '+X',
  exitCenter: [R + 7, 0, 0],
  exitRadius: 2.5,
  vista: true,
};
