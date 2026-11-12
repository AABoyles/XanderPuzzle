import { WALL_T as T, type ChamberSpec } from '../spec.ts';

const R = 8;
const full: [number, number] = [-R, R];

/**
 * Level 3 - a room split by a partition that stops short of the ceiling.
 * -Y -> +X (walk up and over the partition) -> +Z (the far wall, with the exit pit).
 *
 * Trap hole: a 4x4 opening in the +X wall behind the partition (the floor under +X). It opens onto space;
 * walk down the far side of the partition and you fall out of the chamber.
 */
export const DIVIDE: ChamberSpec = {
  accent: [0.3, 0.85, 0.75],
  parts: [
    { kind: 'slab', axis: 'y', lo: -R - T, hi: -R, u: full, v: full, role: 'shell' },
    { kind: 'slab', axis: 'y', lo: R, hi: R + T, u: full, v: full, role: 'shell' },
    { kind: 'slab', axis: 'x', lo: -R - T, hi: -R, u: full, v: full, role: 'shell' },
    // Trap hole open to space: +X wall at y [-6, -2], z [2.5, 6.5]; nothing lies beyond it.
    {
      kind: 'slab',
      axis: 'x',
      lo: R,
      hi: R + T,
      u: full,
      v: full,
      role: 'shell',
      hole: { u: [-6, -2], v: [2.5, 6.5] },
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
    { kind: 'slab', axis: 'z', lo: R, hi: R + T, u: full, v: full, role: 'shell', hole: { u: [-6, -2], v: [-6, -2] } },
    // The partition: full width, 12 of the room's 16 units tall.
    { kind: 'box', min: [-R, -R, 0], max: [R, 4, 1] },
    { kind: 'tube', min: [-2, -R, -R - 9], max: [2, -R + 3, -R - T], open: ['+z'], role: 'alcove' },
    // Sill under the doorway: the wall's hole runs to the floor, so nothing else covers this strip.
    { kind: 'box', min: [-2, -R - T, -R - T], max: [2, -R, -R], role: 'alcove' },
    { kind: 'tube', min: [-6, -6, R + T], max: [-2, -2, R + 9], open: ['-z'], role: 'exit' },
  ],
  levers: [
    { at: [R - 0.3, -R + 1.5, -4], normal: [-1, 0, 0], target: '+X' },
    { at: [R - 1.5, 6, R - 0.3], normal: [0, 0, -1], target: '+Z' },
  ],
  placards: [
    { at: [-2, -R + 1.6, -R - 3], normal: [1, 0, 0], readAs: '-Y', text: 'CUBE 0114', width: 2.6 },
    { at: [0, -5, 0], normal: [0, 0, -1], readAs: '-Y', text: 'PARTITION · DO NOT CLIMB', width: 6 },
    // On the partition's far face, upright once you are walking the +X wall.
    {
      at: [6, 0, 1],
      normal: [0, 0, 1],
      readAs: '+X',
      text: "It says don't climb.\nIt doesn't say anything about walking.",
      voice: 'margin',
      width: 6,
    },
  ],
  name: 'III · THE DIVIDE',
  hint: 'Too tall to jump. But is it too tall to walk around?',
  spawn: [0, -R + 0.5, -R - 5],
  entranceAxis: '-Y',
  exitAxis: '+Z',
  exitCenter: [-4, -4, R + 7],
  exitRadius: 2.5,
};
