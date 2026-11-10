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
  { name: 'VI · THE STAIRCASE', build: buildStaircase },
  { name: 'VII · THE ATRIUM', build: buildAtrium },
  { name: 'VIII · THE BALLAST', build: buildBallast },
  { name: 'IX · THE COUNTERWEIGHT', build: buildCounterweight },
  { name: 'X · THE TURNSTILE', build: buildTurnstile },
  { name: 'XI · THE LOCKOUT', build: buildLockout },
  { name: 'XII · THE GRATE', build: buildGrate },
  { name: 'XIII · THE TIDE', build: buildTide },
  { name: 'XIV · THE ORRERY', build: buildOrrery },
];

export const LEVELS: LevelFactory[] = CHAMBERS.map((c) => c.build);
