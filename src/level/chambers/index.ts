import { LevelFactory } from '../Builder';
import { buildChimney } from './chimney';
import { buildDivide } from './divide';
import { buildShaft } from './shaft';
import { buildSpiral } from './spiral';
import { buildVault } from './vault';

export { buildSandbox } from './sandbox';

/**
 * The chambers in play order. Each lives in its own file in this folder. `name` must match the name the chamber
 * passes to `finish()`; it lets the chamber select list chambers without building them.
 */
export const CHAMBERS: { name: string; build: LevelFactory }[] = [
  { name: 'I · THE VAULT', build: buildVault },
  { name: 'II · THE SHAFT', build: buildShaft },
  { name: 'III · THE DIVIDE', build: buildDivide },
  { name: 'IV · THE SPIRAL', build: buildSpiral },
  { name: 'V · THE CHIMNEY', build: buildChimney },
];

export const LEVELS: LevelFactory[] = CHAMBERS.map((c) => c.build);
