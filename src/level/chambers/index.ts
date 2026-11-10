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
 * The chambers in play order. `id` is the stable key saved progress is stored under: never change or reuse one. Each lives in its own file in this folder. `name` must match the name the chamber
 * passes to `finish()`; it lets the chamber select list chambers without building them.
 */
export const CHAMBERS: { id: string; name: string; build: LevelFactory }[] = [
  { id: 'vault', name: 'I · THE VAULT', build: buildVault },
  { id: 'shaft', name: 'II · THE SHAFT', build: buildShaft },
  { id: 'divide', name: 'III · THE DIVIDE', build: buildDivide },
  { id: 'spiral', name: 'IV · THE SPIRAL', build: buildSpiral },
  { id: 'chimney', name: 'V · THE CHIMNEY', build: buildChimney },
  { id: 'staircase', name: 'VI · THE STAIRCASE', build: buildStaircase },
  { id: 'atrium', name: 'VII · THE ATRIUM', build: buildAtrium },
  { id: 'ballast', name: 'VIII · THE BALLAST', build: buildBallast },
  { id: 'counterweight', name: 'IX · THE COUNTERWEIGHT', build: buildCounterweight },
  { id: 'turnstile', name: 'X · THE TURNSTILE', build: buildTurnstile },
  { id: 'lockout', name: 'XI · THE LOCKOUT', build: buildLockout },
  { id: 'grate', name: 'XII · THE GRATE', build: buildGrate },
  { id: 'tide', name: 'XIII · THE TIDE', build: buildTide },
  { id: 'orrery', name: 'XIV · THE ORRERY', build: buildOrrery },
];

export const LEVELS: LevelFactory[] = CHAMBERS.map((c) => c.build);
