import { WALL_T as T, type ChamberSpec } from '../spec.ts';

const R = 8;
const w: [number, number] = [-R, R];
const full: [number, number] = [-R - T, R + T]; // slabs that close the corner seams

/**
 * Level 15 - the Descent, the epilogue (NARRATIVE.md). A cube with no door: the only way out is a hole in the middle
 * of the ceiling, and leaving through it ends the game in a long fall to the planet.
 * Route: -Y -> +X -> +Y. The first lever, low on the +X wall, puts you on that wall; walk up it to the second, on the
 * ceiling beside the +X wall, which puts you on the ceiling; walk to the hole and fall out.
 *
 * Both levers are one-shot and nothing puts gravity back: every throw is final, and the facility objects to each one
 * (`descentAlarm` in narrative.ts). The route only runs forward, so nothing can strand you.
 */
export const DESCENT: ChamberSpec = {
  accent: [0.9, 0.3, 0.22],
  parts: [
    { kind: 'slab', axis: 'y', lo: -R - T, hi: -R, u: w, v: w, role: 'shell' },
    // The way out: a hole in the middle of the ceiling, onto open space.
    { kind: 'slab', axis: 'y', lo: R, hi: R + T, u: w, v: w, role: 'shell', hole: { u: [-2, 2], v: [-2, 2] } },
    { kind: 'slab', axis: 'x', lo: -R - T, hi: -R, u: full, v: full, role: 'shell' },
    { kind: 'slab', axis: 'x', lo: R, hi: R + T, u: full, v: full, role: 'shell' },
    {
      kind: 'slab',
      axis: 'z',
      lo: -R - T,
      hi: -R,
      u: w,
      v: full,
      role: 'shell',
      hole: { u: [-2, 2], v: [-R, -R + 3] },
    },
    { kind: 'slab', axis: 'z', lo: R, hi: R + T, u: w, v: full, role: 'shell' },
    { kind: 'tube', min: [-2, -R, -R - 9], max: [2, -R + 3, -R - T], open: ['+z'], role: 'alcove' },
    // Sill under the doorway: the wall's hole runs to the floor, so nothing else covers this strip.
    { kind: 'box', min: [-2, -R - T, -R - T], max: [2, -R, -R], role: 'alcove' },
  ],
  levers: [
    { at: [R - 0.3, -R + 1.5, -4], normal: [-1, 0, 0], target: '+X', once: true },
    { at: [R - 1.5, R - 0.3, 4], normal: [0, -1, 0], target: '+Y', once: true },
  ],
  placards: [
    { at: [-2, -R + 1.6, -R - 3], normal: [1, 0, 0], readAs: '-Y', text: 'CUBE 0147', width: 2.6 },
    {
      at: [0, -4, R],
      normal: [0, 0, -1],
      readAs: '-Y',
      text: 'CUBE 0147 · BALANCE ACCESS\nAUTHORISED SHIFTS ONLY',
      width: 10,
    },
    // Above the first lever: the rule the whole chamber turns on, in the facility's own words.
    {
      at: [R, -R + 4.3, -4],
      normal: [-1, 0, 0],
      readAs: '-Y',
      text: 'A CUBE OUT OF TRIM\nLEAVES THE SCHEDULE.\nITS PRINTER WILL NOT RUN.',
      width: 6.5,
    },
    // Under the Stencil, facing the entrance: why the notes exist, and why their writer is not here.
    {
      at: [0, -6.3, R],
      normal: [0, 0, -1],
      readAs: '-Y',
      text: "I got this far once.\nI went back to write it all down.\nDon't go back.\n— 416",
      voice: 'margin',
      width: 5.6,
    },
    // The Margin's last word, on the lip of the hole: upright only once the ceiling is the floor.
    {
      at: [3.2, R, 0],
      normal: [0, -1, 0],
      readAs: '+Y',
      text: 'Steer.',
      voice: 'margin',
      width: 2.6,
      lineHeight: 0.9,
      top: [-1, 0, 0],
    },
  ],
  name: 'XXI · THE DESCENT',
  hint: 'The way out is down. All the way down.',
  spawn: [0, -R + 0.5, -R - 5],
  entranceAxis: '-Y',
  exitAxis: '+Y',
  exitCenter: [0, R + T, 0],
  exitRadius: 2,
  ending: true,
  // The hole in the ceiling shows the Crown on the way in, and the planet once the ceiling is the floor.
  vista: true,
};
