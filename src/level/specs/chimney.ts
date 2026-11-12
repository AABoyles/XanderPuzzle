import { WALL_T as T, type ChamberSpec } from '../spec.ts';

const W = 5; // tunnel half-width (x and y)
const L = 60; // tunnel length along +z
const w: [number, number] = [-W, W];
const len: [number, number] = [0, L];
// Exit doorway in the +X wall, at depth [36, 40] once +Z is down; the ledge is its sill.
const door = { y: [-2, 2] as [number, number], z: [36, 40] as [number, number] };

/**
 * Level 5 - a long horizontal tunnel that one lever turns into a 60-unit pit (-Y -> +Z). The exit
 * is a doorway in the side wall partway down, above a narrow ledge you must steer onto mid-fall.
 * A wide decoy ledge catches anyone who drops straight down from the lever (and from it the real ledge
 * is still reachable: 19 units of fall is 1.3 s, 8 units of steering). The far end of the tunnel has no
 * wall: miss both ledges and you fall out of the cube towards the planet, which shows through the open
 * end once +Z is down. Before the lever the open end is a black square at the end of the tunnel.
 * Route -Y -> +Z. Fair numbers: from the lever (x -4.7, z 4) to the real ledge (x >= 1.5, z 40) is
 * 6.2 units across in a 1.8 s fall.
 */
export const CHIMNEY: ChamberSpec = {
  accent: [0.95, 0.5, 0.2],
  parts: [
    { kind: 'slab', axis: 'y', lo: -W - T, hi: -W, u: w, v: len, role: 'shell' },
    { kind: 'slab', axis: 'y', lo: W, hi: W + T, u: w, v: len, role: 'shell' },
    { kind: 'slab', axis: 'x', lo: -W - T, hi: -W, u: w, v: len, role: 'shell' },
    { kind: 'slab', axis: 'x', lo: W, hi: W + T, u: w, v: len, role: 'shell', hole: { u: door.y, v: door.z } },
    { kind: 'slab', axis: 'z', lo: -T, hi: 0, u: w, v: w, role: 'shell', hole: { u: [-2, 2], v: [-W, -W + 3] } },
    // No end wall at z = L: the pit is open to space. Bounds still end at L (the side slabs).
    // Decoy ledge under the lever: drop straight down and you land here, 16 units short.
    { kind: 'box', min: [-W, -W, 20], max: [-1.5, W, 21] },
    // The real ledge: the sill of the exit door, glowing so it can be found while falling.
    { kind: 'box', min: [1.5, -2.5, door.z[1]], max: [W, 2.5, door.z[1] + T], role: 'exit' },
    { kind: 'tube', min: [-2, -W, -9], max: [2, -W + 3, -T], open: ['+z'], role: 'alcove' },
    // Sill under the doorway: the wall's hole runs to the floor, so nothing else covers this strip.
    { kind: 'box', min: [-2, -W - T, -T], max: [2, -W, 0], role: 'alcove' },
    {
      kind: 'tube',
      min: [W + T, door.y[0], door.z[0]],
      max: [W + 9, door.y[1], door.z[1]],
      open: ['-x'],
      role: 'exit',
    },
  ],
  levers: [{ at: [-W + 0.3, -W + 1.5, 4], normal: [1, 0, 0], target: '+Z' }],
  placards: [
    { at: [-2, -W + 1.6, -3], normal: [1, 0, 0], readAs: '-Y', text: 'CUBE 0116', width: 2.6 },
    {
      at: [-W, -1.5, 7],
      normal: [1, 0, 0],
      readAs: '-Y',
      text: 'DESCENT CORRIDOR · KEEP TO THE LEDGE',
      width: 8.5,
    },
    // On the decoy ledge, where anyone who drops straight down lands.
    {
      at: [-3.25, 0, 20],
      normal: [0, 0, -1],
      readAs: '+Z',
      text: 'Missed it too.\nSteer earlier.',
      voice: 'margin',
      width: 3.2,
      top: [0, 1, 0],
    },
  ],
  name: 'V · THE CHIMNEY',
  hint: 'Falling is just walking, faster. Steer.',
  spawn: [0, -W + 0.5, -5],
  entranceAxis: '-Y',
  exitAxis: '+Z',
  exitCenter: [W + 7, 0, door.z[1] - 0.5],
  exitRadius: 2.5,
};
