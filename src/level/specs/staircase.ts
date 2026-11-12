import type { ChamberSpec } from '../spec.ts';

/**
 * Level 6 - a staircase of three 3-high risers, climbed east. Gravity route: -Y -> +X -> -Y -> +X -> -Y
 * -> +X (the first -Y is the entrance; the last +X is the exit, you fall straight out of it).
 *
 * A divider wall splits the room into a north and a south lane. In each cell one lane is open to the
 * sky (its riser can be climbed under +X: walk up the wall, step off the top, fall east) and the other
 * lane has a solid block overhead that seals the riser's top. In the first two cells the climb drops you
 * into the sealed lane of the next cell, where you can only throw a lever back to -Y, walk through the
 * divider's doorway (too far west to reach while pinned to the riser) into the open lane, and go again.
 * The last cell swaps the lanes: the climb lands you in the lane that is already open, and the exit is
 * at the end of it, so you fall straight out. The habit of crossing the divider would take you into the
 * sealed lane, a dead end with nothing in it that you simply walk back out of (the doorway is at floor
 * level under -Y), so nothing can strand you.
 *
 * The cells are written out one by one (four of them, 8 units long, 3 units apart in height). Cell k
 * starts at x = 8k and floor height 3k; the north lane is z in [-6, -0.5] and the south lane z in [0.5, 6].
 */
export const STAIRCASE: ChamberSpec = {
  accent: [0.65, 0.9, 0.25],
  parts: [
    // Shell.
    { kind: 'slab', axis: 'y', lo: -1, hi: 0, u: [-1, 33], v: [-7, 7], role: 'shell' },
    { kind: 'slab', axis: 'y', lo: 17, hi: 18, u: [-1, 33], v: [-7, 7], role: 'shell' },
    { kind: 'slab', axis: 'z', lo: -7, hi: -6, u: [-1, 33], v: [-1, 18], role: 'shell' },
    { kind: 'slab', axis: 'z', lo: 6, hi: 7, u: [-1, 33], v: [-1, 18], role: 'shell' },
    { kind: 'slab', axis: 'x', lo: -1, hi: 0, u: [0, 17], v: [-6, 6], role: 'shell' },
    {
      kind: 'slab',
      axis: 'x',
      lo: 32,
      hi: 33,
      u: [0, 17],
      v: [-6, 6],
      role: 'shell',
      hole: { u: [9, 12], v: [1, 5] },
    },

    // Cell 0 (x 0..8, floor 0). Sealed lane: north, a block from y 3.4 to the ceiling.
    { kind: 'box', min: [0, 3.4, -6], max: [8, 17, -0.5] },
    // Divider with a 2.2-wide doorway at floor level.
    { kind: 'box', min: [0, 0, -0.5], max: [3, 17, 0.5] },
    { kind: 'box', min: [5.2, 0, -0.5], max: [8, 17, 0.5] },
    { kind: 'box', min: [3, 3, -0.5], max: [5.2, 17, 0.5] },

    // Cell 1 (x 8..16, floor 3).
    { kind: 'box', min: [8, 0, -6], max: [16, 3, 6] },
    // Sealed lane: south.
    { kind: 'box', min: [8, 6.4, 0.5], max: [16, 17, 6] },
    { kind: 'box', min: [8, 3, -0.5], max: [11, 17, 0.5] },
    { kind: 'box', min: [13.2, 3, -0.5], max: [16, 17, 0.5] },
    { kind: 'box', min: [11, 6, -0.5], max: [13.2, 17, 0.5] },

    // Cell 2 (x 16..24, floor 6). Sealed lane: north.
    { kind: 'box', min: [16, 0, -6], max: [24, 6, 6] },
    { kind: 'box', min: [16, 9.4, -6], max: [24, 17, -0.5] },
    { kind: 'box', min: [16, 6, -0.5], max: [19, 17, 0.5] },
    { kind: 'box', min: [21.2, 6, -0.5], max: [24, 17, 0.5] },
    { kind: 'box', min: [19, 9, -0.5], max: [21.2, 17, 0.5] },

    // Cell 3 (x 24..32, floor 9). The last cell swaps the pattern: sealed lane north again, open lane south.
    { kind: 'box', min: [24, 0, -6], max: [32, 9, 6] },
    { kind: 'box', min: [24, 12.4, -6], max: [32, 17, -0.5] },
    { kind: 'box', min: [24, 9, -0.5], max: [27, 17, 0.5] },
    { kind: 'box', min: [29.2, 9, -0.5], max: [32, 17, 0.5] },
    { kind: 'box', min: [27, 12, -0.5], max: [29.2, 17, 0.5] },

    // Exit doorway in the south lane of the top cell: the lane the last climb lands you in, under +X it is a hole.
    { kind: 'box', min: [32, 8, 1], max: [33, 9, 5], role: 'exit' },
    { kind: 'tube', min: [33, 9, 1], max: [42, 12, 5], open: ['-x'], role: 'exit' },
  ],
  levers: [
    // Cell 0: the open lane is south.
    { at: [6.2, 1.5, 5.7], normal: [0, 0, -1], target: '+X' },
    // Cell 1: the open lane is north; the -Y lever sits in the sealed south lane.
    { at: [14.2, 4.5, -5.7], normal: [0, 0, 1], target: '+X' },
    { at: [14.5, 4.5, 5.7], normal: [0, 0, -1], target: '-Y' },
    // Cell 2: the open lane is south; the -Y lever sits in the sealed north lane.
    { at: [22.2, 7.5, 5.7], normal: [0, 0, -1], target: '+X' },
    { at: [22.5, 7.5, -5.7], normal: [0, 0, 1], target: '-Y' },
  ],
  placards: [
    { at: [1.5, 2, -0.5], normal: [0, 0, -1], readAs: '-Y', text: 'CUBE 0118', width: 2.6 },
    // The first riser, in the open lane.
    {
      at: [8, 1.6, 3.2],
      normal: [-1, 0, 0],
      readAs: '-Y',
      text: ['RISER MAINTENANCE', '3 CLIMBS SCHEDULED', 'SCHEDULE UNCHANGED', 'SINCE CYCLE 1'].join('\n'),
      width: 5,
      lineHeight: 0.5,
    },
    // High on the next cell's sealed block, upright under +X: seen by looking up from the first climb.
    {
      at: [8, 10, 3.25],
      normal: [-1, 0, 0],
      readAs: '+X',
      text: 'Same stairs every time.\nI counted.',
      voice: 'margin',
      top: [0, 1, 0],
    },
  ],
  name: 'VI · THE STAIRCASE',
  hint: 'Climb, step off, turn the cube back, walk round. Look where you land.',
  spawn: [2, 0.5, -3],
  entranceAxis: '-Y',
  exitAxis: '+X',
  exitCenter: [37, 10, 3],
  exitRadius: 2,
};
