import { WALL_T as T, type ChamberSpec } from '../spec.ts';

const R = 8;
const full: [number, number] = [-R, R];

/**
 * Level 4 - three shifts around the room: -Y -> -X -> +Y -> +X, each lever only reachable
 * from the surface the previous one puts you on.
 *
 * Trap: a decoy lever on the -X wall beside the walk (target +Z) makes the +Z wall the floor; a 6 x 7 hole in
 * it lies directly below anyone within lever reach, a 16-unit fall with no steering needed, out of the
 * chamber. The old +Z/-Y dead-end pair and the old -X hole are gone; the +Z decoy is converted into this.
 * The Margin's warning is beside the lever.
 */
export const SPIRAL: ChamberSpec = {
  accent: [0.95, 0.8, 0.3],
  parts: [
    { kind: 'slab', axis: 'y', lo: -R - T, hi: -R, u: full, v: full, role: 'shell' },
    { kind: 'slab', axis: 'y', lo: R, hi: R + T, u: full, v: full, role: 'shell' },
    { kind: 'slab', axis: 'x', lo: -R - T, hi: -R, u: full, v: full, role: 'shell' },
    // Trap hole open to space: +Z wall at x [-8, -2], y [-5.5, 1.5], below the decoy lever's standpoint on -X.
    {
      kind: 'slab',
      axis: 'z',
      lo: R,
      hi: R + T,
      u: full,
      v: full,
      role: 'shell',
      hole: { u: [-8, -2], v: [-5.5, 1.5] },
    },
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
    { kind: 'slab', axis: 'x', lo: R, hi: R + T, u: full, v: full, role: 'shell', hole: { u: [-6, -2], v: [-6, -2] } },
    { kind: 'tube', min: [-2, -R, -R - 9], max: [2, -R + 3, -R - T], open: ['+z'], role: 'alcove' },
    // Sill under the doorway: the wall's hole runs to the floor, so nothing else covers this strip.
    { kind: 'box', min: [-2, -R - T, -R - T], max: [2, -R, -R], role: 'alcove' },
    { kind: 'tube', min: [R + T, -6, -6], max: [R + 9, -2, -2], open: ['-x'], role: 'exit' },
  ],
  levers: [
    { at: [-R + 0.3, -R + 1.5, 0], normal: [1, 0, 0], target: '-X' },
    { at: [-R + 1.5, R - 0.3, 0], normal: [0, -1, 0], target: '+Y' },
    { at: [R - 0.3, R - 1.5, 0], normal: [-1, 0, 0], target: '+X' },
    // Decoy: from the -X wall, +Z turns the hole wall into the floor beneath you.
    { at: [-R + 0.3, -2, -2], normal: [1, 0, 0], target: '+Z' },
  ],
  placards: [
    { at: [-2, -R + 1.6, -R - 3], normal: [1, 0, 0], readAs: '-Y', text: 'CUBE 0115', width: 2.6 },
    // On the ceiling, read while crossing it under +Y towards the +X lever.
    {
      at: [0, R, -3],
      normal: [0, -1, 0],
      readAs: '+Y',
      text: 'TRIM SEQUENCE: -Y · -X · +Y · +X',
      width: 7,
      top: [1, 0, 0],
    },
    // Beside the decoy lever on the -X wall, read before the throw.
    {
      at: [-R, -3, 3],
      normal: [1, 0, 0],
      readAs: '-X',
      text: 'Not every lever leads somewhere.\nThis one led me here.',
      voice: 'margin',
      width: 5,
      top: [0, 1, 0],
    },
  ],
  name: 'IV · THE SPIRAL',
  hint: 'One lever leads to the next. Not every lever leads somewhere.',
  spawn: [0, -R + 0.5, -R - 5],
  entranceAxis: '-Y',
  exitAxis: '+X',
  exitCenter: [R + 7, -4, -4],
  exitRadius: 2.5,
};
