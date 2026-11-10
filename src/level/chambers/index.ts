import { LevelFactory } from '../Builder';
import { buildAtrium } from './atrium';
import { buildBallast } from './ballast';
import { buildChimney } from './chimney';
import { buildCounterweight } from './counterweight';
import { buildDivide } from './divide';
import { buildGrate } from './grate';
import { buildLockout } from './lockout';
import { buildOrrery } from './orrery';
import { buildShaft } from './shaft';
import { buildSpiral } from './spiral';
import { buildStaircase } from './staircase';
import { buildTide } from './tide';
import { buildTurnstile } from './turnstile';
import { buildVault } from './vault';

export { buildSandbox } from './sandbox';

/** The chambers in play order. Each lives in its own file in this folder. */
export const LEVELS: LevelFactory[] = [
  buildVault, buildShaft, buildDivide, buildSpiral, buildChimney,
  buildStaircase, buildAtrium, buildBallast, buildCounterweight, buildTurnstile,
  buildLockout, buildGrate, buildTide, buildOrrery,
];
