import { LevelFactory } from '../Builder';
import { buildAtrium } from './atrium';
import { buildBallast } from './ballast';
import { buildChimney } from './chimney';
import { buildCounterweight } from './counterweight';
import { buildDeadman } from './deadman';
import { buildDescent } from './descent';
import { buildDivide } from './divide';
import { buildFooting } from './footing';
import { buildGrate } from './grate';
import { buildLockout } from './lockout';
import { buildOrrery } from './orrery';
import { buildPendulum } from './pendulum';
import { buildShaft } from './shaft';
import { buildSieve } from './sieve';
import { buildSpiral } from './spiral';
import { buildStaircase } from './staircase';
import { buildStopper } from './stopper';
import { buildSurplus } from './surplus';
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
  { id: 'footing', cube: '0122', name: 'IX · THE FOOTING', build: buildFooting },
  { id: 'stopper', cube: '0123', name: 'X · THE STOPPER', build: buildStopper },
  { id: 'counterweight', cube: '0124', name: 'XI · THE COUNTERWEIGHT', build: buildCounterweight },
  { id: 'deadman', cube: '0125', name: 'XII · THE DEADMAN', build: buildDeadman },
  { id: 'turnstile', cube: '0127', name: 'XIII · THE TURNSTILE', build: buildTurnstile },
  { id: 'lockout', cube: '0129', name: 'XIV · THE LOCKOUT', build: buildLockout },
  { id: 'grate', cube: '0130', name: 'XV · THE GRATE', build: buildGrate },
  { id: 'sieve', cube: '0131', name: 'XVI · THE SIEVE', build: buildSieve },
  { id: 'surplus', cube: '0132', name: 'XVII · THE SURPLUS', build: buildSurplus },
  { id: 'tide', cube: '0134', name: 'XVIII · THE TIDE', build: buildTide },
  { id: 'pendulum', cube: '0137', name: 'XIX · THE PENDULUM', build: buildPendulum },
  { id: 'orrery', cube: '0140', name: 'XX · THE ORRERY', build: buildOrrery },
  { id: 'descent', cube: '0147', name: 'XXI · THE DESCENT', build: buildDescent },
];

export const LEVELS: LevelFactory[] = CHAMBERS.map((c) => c.build);
