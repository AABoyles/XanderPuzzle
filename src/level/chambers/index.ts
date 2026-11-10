import { LevelFactory } from '../Builder';
import { buildAtrium } from './atrium';
import { buildBallast } from './ballast';
import { buildChimney } from './chimney';
import { buildCounterweight } from './counterweight';
import { buildDescent } from './descent';
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
 * passes to `finish()`; it lets the chamber select list chambers without building them. `cube` is the facility's serial
 * for the chamber (see NARRATIVE.md): display text only, so unlike `id` it may change. The gaps are cubes that went dark.
 */
export const CHAMBERS: { id: string; cube: string; name: string; build: LevelFactory }[] = [
  { id: 'vault', cube: '0112', name: 'I · THE VAULT', build: buildVault },
  { id: 'shaft', cube: '0113', name: 'II · THE SHAFT', build: buildShaft },
  { id: 'divide', cube: '0114', name: 'III · THE DIVIDE', build: buildDivide },
  { id: 'spiral', cube: '0115', name: 'IV · THE SPIRAL', build: buildSpiral },
  { id: 'chimney', cube: '0116', name: 'V · THE CHIMNEY', build: buildChimney },
  { id: 'staircase', cube: '0118', name: 'VI · THE STAIRCASE', build: buildStaircase },
  { id: 'atrium', cube: '0119', name: 'VII · THE ATRIUM', build: buildAtrium },
  { id: 'ballast', cube: '0121', name: 'VIII · THE BALLAST', build: buildBallast },
  { id: 'counterweight', cube: '0122', name: 'IX · THE COUNTERWEIGHT', build: buildCounterweight },
  { id: 'turnstile', cube: '0125', name: 'X · THE TURNSTILE', build: buildTurnstile },
  { id: 'lockout', cube: '0129', name: 'XI · THE LOCKOUT', build: buildLockout },
  { id: 'grate', cube: '0130', name: 'XII · THE GRATE', build: buildGrate },
  { id: 'tide', cube: '0134', name: 'XIII · THE TIDE', build: buildTide },
  { id: 'orrery', cube: '0140', name: 'XIV · THE ORRERY', build: buildOrrery },
  { id: 'descent', cube: '0147', name: 'XV · THE DESCENT', build: buildDescent },
];

export const LEVELS: LevelFactory[] = CHAMBERS.map((c) => c.build);
