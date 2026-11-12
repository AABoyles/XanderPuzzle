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
 * `par` is the fewest gravity shifts that clear the chamber: the shortest lever route from the entrance axis to the
 * exit axis, as the chamber's README route and doc comment give it. Omitted for a chamber on a timer, where the cycle
 * makes the shifts. A par can be more than the shortest lever route when crates force a longer one, never less:
 * `npm test` checks the lower bound.
 */
export const CHAMBERS: { id: string; cube: string; name: string; par?: number; build: LevelFactory }[] = [
  { id: 'vault', cube: '0112', name: 'I · THE VAULT', par: 2, build: buildVault },
  { id: 'shaft', cube: '0113', name: 'II · THE SHAFT', par: 2, build: buildShaft },
  { id: 'divide', cube: '0114', name: 'III · THE DIVIDE', par: 2, build: buildDivide },
  { id: 'spiral', cube: '0115', name: 'IV · THE SPIRAL', par: 3, build: buildSpiral },
  { id: 'chimney', cube: '0116', name: 'V · THE CHIMNEY', par: 1, build: buildChimney },
  { id: 'staircase', cube: '0118', name: 'VI · THE STAIRCASE', par: 5, build: buildStaircase },
  { id: 'atrium', cube: '0119', name: 'VII · THE ATRIUM', par: 3, build: buildAtrium },
  { id: 'ballast', cube: '0121', name: 'VIII · THE BALLAST', par: 2, build: buildBallast },
  { id: 'footing', cube: '0122', name: 'IX · THE FOOTING', par: 4, build: buildFooting },
  { id: 'stopper', cube: '0123', name: 'X · THE STOPPER', par: 3, build: buildStopper },
  { id: 'counterweight', cube: '0124', name: 'XI · THE COUNTERWEIGHT', par: 3, build: buildCounterweight },
  { id: 'deadman', cube: '0125', name: 'XII · THE DEADMAN', par: 2, build: buildDeadman },
  { id: 'turnstile', cube: '0127', name: 'XIII · THE TURNSTILE', par: 3, build: buildTurnstile },
  { id: 'lockout', cube: '0129', name: 'XIV · THE LOCKOUT', par: 2, build: buildLockout },
  { id: 'grate', cube: '0130', name: 'XV · THE GRATE', par: 2, build: buildGrate },
  { id: 'sieve', cube: '0131', name: 'XVI · THE SIEVE', par: 4, build: buildSieve },
  { id: 'surplus', cube: '0132', name: 'XVII · THE SURPLUS', par: 4, build: buildSurplus },
  { id: 'tide', cube: '0134', name: 'XVIII · THE TIDE', build: buildTide },
  { id: 'pendulum', cube: '0137', name: 'XIX · THE PENDULUM', build: buildPendulum },
  { id: 'orrery', cube: '0140', name: 'XX · THE ORRERY', par: 6, build: buildOrrery },
  { id: 'descent', cube: '0147', name: 'XXI · THE DESCENT', par: 2, build: buildDescent },
];

export const LEVELS: LevelFactory[] = CHAMBERS.map((c) => c.build);
