import { LevelFactory } from '../Builder';
import { buildChimney } from './chimney';
import { buildDivide } from './divide';
import { buildShaft } from './shaft';
import { buildSpiral } from './spiral';
import { buildVault } from './vault';

export { buildSandbox } from './sandbox';

/** The chambers in play order. Each lives in its own file in this folder. */
export const LEVELS: LevelFactory[] = [buildVault, buildShaft, buildDivide, buildSpiral, buildChimney];
