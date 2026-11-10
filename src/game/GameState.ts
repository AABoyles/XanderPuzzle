/**
 * The game's flow as an explicit state machine, free of Babylon so Node can test it directly.
 *
 * `transition(state, event)` is the whole rulebook: it returns the next state, or null when the event does not apply
 * in that state (so stray key presses and late browser events are simply ignored). `GameState` holds the current state
 * and reports each change to one `onChange` handler, which is where main.ts shows and hides overlays and moves the
 * pointer lock. The queries below (`simulates`, `viewOf`, ...) are what the render loop asks instead of combining flags.
 *
 * To add a state: add its kind to `Kind`, its rows to `transition`, and its answers to `simulates`/`isFrozen`/
 * `viewOf`/`showsTouchControls`. main.ts needs a change only where the new state has a visible effect.
 */

export type Kind = 'title' | 'playing' | 'falling' | 'paused' | 'chamberSelect' | 'won';

export interface State {
  readonly kind: Kind;
  /** True once play has begun this session; after that, losing control shows the pause menu, not the title. */
  readonly begun: boolean;
  /** Where `paused`, `chamberSelect` and `won` go back to; null for the other states. */
  readonly back: State | null;
}

export type GameEvent =
  /** Leave the title and start playing without pointer lock (touch tap, gamepad A/Start). */
  | { type: 'begin' }
  /** The browser granted pointer lock. */
  | { type: 'locked' }
  /** Control was lost without the player asking (Esc released the pointer, touch mode switched on, a lock was refused). */
  | { type: 'controlLost' }
  | { type: 'pause' }
  /** Close the pause menu and carry on. */
  | { type: 'resume' }
  | { type: 'openChambers' }
  /** `resume`: there is no pointer lock to wait for (touch, gamepad, or already locked), so go straight back to play. */
  | { type: 'closeChambers'; resume: boolean }
  /** A chamber was chosen. `immediate`: begin at once rather than waiting for pointer lock. */
  | { type: 'pick'; immediate: boolean }
  | { type: 'fell' }
  | { type: 'recovered' }
  | { type: 'respawn' }
  | { type: 'restart' }
  | { type: 'win' }
  | { type: 'advance' };

const make = (kind: Kind, begun: boolean, back: State | null = null): State => ({ kind, begun, back });

export const INITIAL_STATE: State = make('title', false);

const live = (s: State) => s.kind === 'playing' || s.kind === 'falling';

/** `s` after pointer lock arrived: play has begun, and a title waiting behind a menu or win screen is gone. */
function markBegun(s: State): State {
  if (s.kind === 'title') return make('playing', true);
  return make(s.kind, true, s.back);
}

/** The next state, or null if `event` is ignored in `s`. */
export function transition(s: State, event: GameEvent): State | null {
  switch (event.type) {
    case 'begin':
      return s.kind === 'title' ? make('playing', true) : null;
    case 'locked':
      if (s.kind === 'paused') return markBegun(s.back as State);
      if (s.kind === 'chamberSelect' || s.kind === 'won') return make(s.kind, true, markBegun(s.back as State));
      return markBegun(s);
    case 'controlLost':
      if (!live(s)) return null;
      return s.begun ? make('paused', true, s) : make('title', false);
    case 'pause':
      return live(s) ? make('paused', s.begun, s) : null;
    case 'resume':
      return s.kind === 'paused' ? (s.back as State) : null;
    case 'openChambers':
      return s.kind === 'chamberSelect' ? null : make('chamberSelect', s.begun, s);
    case 'closeChambers': {
      if (s.kind !== 'chamberSelect') return null;
      const b = s.back as State;
      if (b.kind === 'title') return event.resume ? make('playing', false) : b;
      if (live(b)) {
        if (event.resume) return b;
        return s.begun ? make('paused', true, b) : make('title', false);
      }
      return b; // paused or won: back where it was
    }
    case 'pick':
      return s.kind === 'chamberSelect' ? make('playing', event.immediate || s.begun) : null;
    case 'fell':
      return s.kind === 'playing' ? make('falling', s.begun) : null;
    case 'recovered':
    case 'respawn':
      return s.kind === 'falling' ? make('playing', s.begun) : null;
    case 'restart':
      if (s.kind === 'title') return s;
      if (live(s)) return make('playing', s.begun);
      // Restarting from the pause menu clears any fall in progress, so resuming goes back to plain play.
      if (s.kind === 'paused') return make('paused', s.begun, make('playing', (s.back as State).begun));
      return null;
    case 'win':
      return s.kind === 'title' || live(s) ? make('won', s.begun, s) : null;
    case 'advance': {
      if (s.kind !== 'won') return null;
      const b = s.back as State;
      return b.kind === 'title' ? b : make('playing', s.begun);
    }
  }
}

/** Does the world (player, timer, levers, crates, falling) advance in state `s` on this input device? */
export function simulates(s: State, device: string): boolean {
  return !isFrozen(s, device) && s.kind !== 'won';
}

/**
 * Menus freeze everything. So does the title for touch and gamepad; on desktop with a keyboard the player can already
 * move there, before pointer lock. The win screen is not frozen: the backdrop keeps animating behind it.
 */
export function isFrozen(s: State, device: string): boolean {
  return s.kind === 'paused' || s.kind === 'chamberSelect' || (s.kind === 'title' && device !== 'keyboard');
}

/** The on-screen touch controls show only during live play. */
export function showsTouchControls(s: State): boolean {
  return live(s);
}

/** Esc with no pointer lock to release opens the pause menu, but only once play has begun. */
export function escapePauses(s: State): boolean {
  return live(s) && s.begun;
}

export interface View {
  readonly title: boolean;
  readonly pause: boolean;
  readonly select: boolean;
  readonly win: boolean;
}

/** Which overlays are up in state `s`. */
export function viewOf(s: State): View {
  const none = { title: false, pause: false, select: false, win: false };
  switch (s.kind) {
    case 'title':
      return { ...none, title: true };
    case 'paused':
      return { ...none, pause: true };
    case 'chamberSelect':
      return { ...none, select: true, win: (s.back as State).kind === 'won' };
    case 'won':
      return { ...none, win: true, title: (s.back as State).kind === 'title' };
    default:
      return none;
  }
}

/** Holds the current state and tells `onChange` about every accepted event. */
export class GameState {
  private current: State = INITIAL_STATE;
  /** Called after the state changed. It must not call `send`. */
  public onChange: ((prev: State, next: State, event: GameEvent) => void) | undefined;

  public get state(): State {
    return this.current;
  }

  public get kind(): Kind {
    return this.current.kind;
  }

  /** Applies `event`; returns false (and changes nothing) if the current state ignores it. */
  public send(event: GameEvent): boolean {
    const next = transition(this.current, event);
    if (!next) return false;
    const prev = this.current;
    this.current = next;
    this.onChange?.(prev, next, event);
    return true;
  }
}
