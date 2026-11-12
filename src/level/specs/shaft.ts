import { WALL_T as T, type ChamberSpec } from '../spec.ts';

const W = 5;
const y0 = -5;
const y1 = 35;
const w: [number, number] = [-W, W];
const h: [number, number] = [y0, y1];

/**
 * Level 2 - a 40-unit vertical shaft. The exit door is at the very top, upside down.
 * -Y -> +X (walk up the wall) -> +Y (stand on the ceiling).
 *
 * Trap gap: a 1-unit slot across the whole +X wall at height 12..13, straight ahead of where the first lever
 * lands you. Under +X it is a gap in the floor (the planet shows through it) with no way round: walk straight
 * up and you fall out of the chamber, so it has to be jumped. A placard just before it says what recovery is:
 * a replacement, printed at the entrance.
 */
export const SHAFT: ChamberSpec = {
  accent: [0.9, 0.35, 0.55],
  parts: [
    { kind: 'slab', axis: 'y', lo: y0 - T, hi: y0, u: w, v: w, role: 'shell' },
    { kind: 'slab', axis: 'y', lo: y1, hi: y1 + T, u: w, v: w, role: 'shell' },
    // Trap gap open to space, in the climb: +X wall at y [12, 13], the full width (z [-5, 5]): it must be jumped.
    {
      kind: 'slab',
      axis: 'x',
      lo: W,
      hi: W + T,
      u: h,
      v: w,
      role: 'shell',
      hole: { u: [12, 13], v: [-W, W] },
    },
    { kind: 'slab', axis: 'z', lo: W, hi: W + T, u: w, v: h, role: 'shell' },
    { kind: 'slab', axis: 'z', lo: -W - T, hi: -W, u: w, v: h, role: 'shell', hole: { u: [-2, 2], v: [y0, y0 + 3] } },
    { kind: 'slab', axis: 'x', lo: -W - T, hi: -W, u: h, v: w, role: 'shell', hole: { u: [y1 - 3, y1], v: [-2, 2] } },
    { kind: 'tube', min: [-2, y0, -W - 9], max: [2, y0 + 3, -W - T], open: ['+z'], role: 'alcove' },
    // Sill under the doorway: the wall's hole runs to the floor, so nothing else covers this strip.
    { kind: 'box', min: [-2, y0 - T, -W - T], max: [2, y0, -W], role: 'alcove' },
    { kind: 'tube', min: [-W - 9, y1 - 3, -2], max: [-W - T, y1, 2], open: ['+x'], role: 'exit' },
    // Sill above the exit doorway, which is its floor once +Y is down.
    { kind: 'box', min: [-W - T, y1, -2], max: [-W, y1 + T, 2], role: 'exit' },
  ],
  levers: [
    { at: [W - 0.3, y0 + 1.5, 0], normal: [-1, 0, 0], target: '+X' },
    { at: [W - 1.5, y1 - 0.3, 0], normal: [0, -1, 0], target: '+Y' },
  ],
  placards: [
    // The Margin, on the face overhead during the climb under +X: only seen by looking up on the way.
    {
      at: [-W, 20, 0],
      normal: [1, 0, 0],
      readAs: '+X',
      text: 'It is a long way up.\nIt is a longer way down.\nI checked. It printed me back.',
      voice: 'margin',
      top: [0, 1, 0],
      width: 5,
    },
    { at: [-2, y0 + 1.6, -W - 3], normal: [1, 0, 0], readAs: '-Y', text: 'CUBE 0113', width: 2.6 },
    // On the +X wall just before the hole, read while walking up under +X (text top towards +Y).
    {
      at: [W, 8.5, 2.6],
      normal: [-1, 0, 0],
      readAs: '+X',
      text: 'OPEN APERTURE\nLOST ATTENDANTS\nARE REPRINTED\nAT THE ENTRANCE',
      width: 4,
      top: [0, 1, 0],
    },
  ],
  name: 'II · THE SHAFT',
  hint: 'The way out is a long way up. Walls are just floors you have not met yet.',
  spawn: [0, y0 + 0.5, -W - 5],
  entranceAxis: '-Y',
  exitAxis: '+Y',
  exitCenter: [-W - 7, y1 - 1, 0],
  exitRadius: 2,
};
