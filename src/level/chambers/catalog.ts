import type { LevelFactory } from '../Builder';

/** A chamber's module: every file in this folder default-exports its factory, so they all load the same way. */
export interface ChamberModule {
  default: LevelFactory;
}

/** One chamber's entry in the catalog: what the game needs to know about it without loading its code. */
export interface Chamber {
  /** The stable key saved progress is stored under: never change or reuse one. */
  id: string;
  /** The facility's serial for the chamber (see NARRATIVE.md): display text only, so unlike `id` it may change. */
  cube: string;
  /** Must match the name the chamber passes to `finish()`; it lets the chamber select list chambers unbuilt. */
  name: string;
  /**
   * The fewest gravity shifts that clear the chamber: the shortest lever route from the entrance axis to the exit
   * axis, as the chamber's README route and doc comment give it. Omitted for a chamber on a timer, where the cycle
   * makes the shifts. A par can be more than the shortest lever route when crates force a longer one, never less:
   * `npm test` checks the lower bound.
   */
  par?: number;
  /**
   * Fetches the chamber's own module. Each chamber is a separate chunk of the build, loaded the first time it is
   * needed (see `ChamberLoader`), so the page does not wait on chambers the player has not reached. The path must be
   * a literal for the bundler to split on.
   */
  load: () => Promise<ChamberModule>;
}

/**
 * The chambers in play order. Each lives in its own file in this folder and is imported only by its `load`, so this
 * module is Babylon-free: Node can read the catalog without building anything. The gaps in `cube` are cubes that went
 * dark.
 */
export const CHAMBERS: Chamber[] = [
  { id: 'vault', cube: '0112', name: 'I · THE VAULT', par: 2, load: () => import('./vault') },
  { id: 'shaft', cube: '0113', name: 'II · THE SHAFT', par: 2, load: () => import('./shaft') },
  { id: 'divide', cube: '0114', name: 'III · THE DIVIDE', par: 2, load: () => import('./divide') },
  { id: 'spiral', cube: '0115', name: 'IV · THE SPIRAL', par: 3, load: () => import('./spiral') },
  { id: 'chimney', cube: '0116', name: 'V · THE CHIMNEY', par: 1, load: () => import('./chimney') },
  { id: 'staircase', cube: '0118', name: 'VI · THE STAIRCASE', par: 5, load: () => import('./staircase') },
  { id: 'atrium', cube: '0119', name: 'VII · THE ATRIUM', par: 3, load: () => import('./atrium') },
  { id: 'ballast', cube: '0121', name: 'VIII · THE BALLAST', par: 2, load: () => import('./ballast') },
  { id: 'footing', cube: '0122', name: 'IX · THE FOOTING', par: 4, load: () => import('./footing') },
  { id: 'stopper', cube: '0123', name: 'X · THE STOPPER', par: 3, load: () => import('./stopper') },
  { id: 'counterweight', cube: '0124', name: 'XI · THE COUNTERWEIGHT', par: 3, load: () => import('./counterweight') },
  { id: 'deadman', cube: '0125', name: 'XII · THE DEADMAN', par: 2, load: () => import('./deadman') },
  { id: 'turnstile', cube: '0127', name: 'XIII · THE TURNSTILE', par: 3, load: () => import('./turnstile') },
  { id: 'lockout', cube: '0129', name: 'XIV · THE LOCKOUT', par: 2, load: () => import('./lockout') },
  { id: 'grate', cube: '0130', name: 'XV · THE GRATE', par: 2, load: () => import('./grate') },
  { id: 'sieve', cube: '0131', name: 'XVI · THE SIEVE', par: 4, load: () => import('./sieve') },
  { id: 'surplus', cube: '0132', name: 'XVII · THE SURPLUS', par: 4, load: () => import('./surplus') },
  { id: 'tide', cube: '0134', name: 'XVIII · THE TIDE', load: () => import('./tide') },
  { id: 'pendulum', cube: '0137', name: 'XIX · THE PENDULUM', load: () => import('./pendulum') },
  { id: 'orrery', cube: '0140', name: 'XX · THE ORRERY', par: 6, load: () => import('./orrery') },
  { id: 'descent', cube: '0147', name: 'XXI · THE DESCENT', par: 2, load: () => import('./descent') },
];

/** The physics test room (`?sandbox`), loaded the same way. */
export const SANDBOX: Pick<Chamber, 'load'> = { load: () => import('./sandbox') };
