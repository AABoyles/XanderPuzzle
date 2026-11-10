import { emptyFrame, lookStick, mergeFrames, radialDeadzone } from './InputSource.ts';
import type { InputDevice, InputFrame, InputSource } from './InputSource.ts';

/** Radians per second of look at full stick tilt. */
export const LOOK_SPEED = 3.0;
export const STICK_DEADZONE = 0.15;
const MENU_STICK = 0.6;
const TRIGGER_THRESHOLD = 0.5;

/** Standard-mapping button indices. */
const BTN = { A: 0, B: 1, X: 2, Y: 3, LT: 6, SELECT: 8, START: 9, L3: 10, UP: 12, DOWN: 13 } as const;

/** Edge-triggered chamber-select actions from the latest `read()`. */
export interface GamepadMenuActions {
  up: boolean;
  down: boolean;
  confirm: boolean;
  back: boolean;
  select: boolean;
}

/** The pad fields we use; a subset of the DOM `Gamepad` so tests can fake it. */
export interface PadLike {
  index: number;
  axes: ArrayLike<number>;
  buttons: ArrayLike<{ pressed: boolean; value?: number }>;
}

const domPads = (): ArrayLike<PadLike | null> => {
  try {
    return typeof navigator !== 'undefined' && typeof navigator.getGamepads === 'function' ? navigator.getGamepads() : [];
  } catch {
    return [];
  }
};

/** Standard-mapping gamepads, all connected pads combined. Needs no pointer lock. */
export class GamepadInput implements InputSource {
  public readonly device: InputDevice = 'gamepad';
  /** Flip the right stick's vertical axis. */
  public invertY = false;
  /** Menu edges from the most recent `read()`. */
  public menu: GamepadMenuActions = { up: false, down: false, confirm: false, back: false, select: false };

  /** Pressed buttons (`index:name`) at the last poll, for edge detection. */
  private held = new Set<string>();
  /** Pads seen at the last poll; a newly seen pad's held buttons don't count as presses. */
  private known = new Set<number>();

  private readonly onDisconnect = (e: Event) => {
    const index = (e as GamepadEvent).gamepad?.index;
    if (index === undefined) return;
    this.known.delete(index);
    for (const k of [...this.held]) if (k.startsWith(`${index}:`)) this.held.delete(k);
  };

  private readonly getPads: () => ArrayLike<PadLike | null>;

  constructor(getPads: () => ArrayLike<PadLike | null> = domPads) {
    this.getPads = getPads;
    if (typeof window !== 'undefined') window.addEventListener('gamepaddisconnected', this.onDisconnect);
  }

  public read(dt: number): InputFrame {
    const nowHeld = new Set<string>();
    const nowKnown = new Set<number>();
    const menu: GamepadMenuActions = { up: false, down: false, confirm: false, back: false, select: false };
    const frames: InputFrame[] = [];
    const pads = this.getPads();
    for (let n = 0; n < pads.length; n++) {
      const pad = pads[n];
      if (!pad) continue;
      nowKnown.add(pad.index);
      const fresh = !this.known.has(pad.index);
      const down = (b: number) => pad.buttons[b]?.pressed ?? false;
      const stick = (a: number) => pad.axes[a] ?? 0;
      const edge = (name: string, pressed: boolean) => {
        const key = `${pad.index}:${name}`;
        if (pressed) nowHeld.add(key);
        return pressed && !fresh && !this.held.has(key);
      };

      const move = radialDeadzone(stick(0), stick(1), STICK_DEADZONE);
      const look = lookStick(stick(2), stick(3), STICK_DEADZONE);
      const f = emptyFrame();
      f.moveX = move.x;
      f.moveZ = -move.y; // the API's stick y is down-positive
      f.lookX = look.x * LOOK_SPEED * dt;
      f.lookY = look.y * LOOK_SPEED * dt * (this.invertY ? -1 : 1);
      f.sprint = (pad.buttons[BTN.LT]?.value ?? 0) > TRIGGER_THRESHOLD || down(BTN.LT) || down(BTN.L3);
      f.jump = edge('a', down(BTN.A));
      f.interact = edge('x', down(BTN.X));
      f.restart = edge('y', down(BTN.Y));
      f.pause = edge('start', down(BTN.START));

      const up = edge('up', down(BTN.UP) || stick(1) < -MENU_STICK);
      const downDir = edge('down', down(BTN.DOWN) || stick(1) > MENU_STICK);
      const back = edge('b', down(BTN.B));
      const select = edge('select', down(BTN.SELECT));
      menu.up ||= up;
      menu.down ||= downDir;
      menu.confirm ||= f.jump;
      menu.back ||= back;
      menu.select ||= select;
      f.activity = up || downDir || back || select;
      frames.push(f);
    }
    this.held = nowHeld;
    this.known = nowKnown;
    this.menu = menu;
    return mergeFrames(frames);
  }

  public dispose(): void {
    if (typeof window !== 'undefined') window.removeEventListener('gamepaddisconnected', this.onDisconnect);
  }
}
