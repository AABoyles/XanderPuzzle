import type { InputDevice } from '../input/InputSource';

/** The on-screen wording that names a key or button, so it has to follow the device in use. */
export interface Prompts {
  void: string;
  cycle: string;
  next: string;
  again: string;
  select: string;
  title: string;
  stuck: string;
}

/** Keep these in step with the real bindings (and with the pause menu's controls reference). Babylon-free. */
export const PROMPTS: Record<InputDevice, Prompts> = {
  keyboard: {
    void: 'Outside the cube · press [R] to be reprinted',
    cycle: 'Press [E] to start the cycle',
    next: 'Click or press Enter for the next chamber',
    again: 'Click or press Enter to play again',
    select: '\nL for chamber select',
    title: 'Click or press Enter to return to the title',
    stuck: '[Z] takes back the last lever · [R] reprints you at the entrance',
  },
  touch: {
    void: 'Outside the cube · tap ↻ to be reprinted',
    cycle: 'Tap [USE] to start the cycle',
    next: 'Tap for the next chamber',
    again: 'Tap to play again',
    select: '\nTap ☰ for chamber select',
    title: 'Tap to return to the title',
    stuck: '↶ takes back the last lever · ↻ reprints you at the entrance',
  },
  gamepad: {
    void: 'Outside the cube · press [Y] to be reprinted',
    cycle: 'Press [X] to start the cycle',
    next: 'Press [A] for the next chamber',
    again: 'Press [A] to play again',
    select: '\nBack for chamber select',
    title: 'Press [A] to return to the title',
    stuck: 'Press [B] to take back the last lever · [Y] reprints you at the entrance',
  },
};
