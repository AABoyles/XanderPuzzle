/** The kinds of device a frame can come from; the HUD words its prompts per device. */
export type InputDevice = 'keyboard' | 'touch' | 'gamepad';

/** One frame of player intent, produced by any input device. Babylon-free so Node can test it. */
export interface InputFrame {
  /** Strafe, -1 (left) to 1 (right). Analogue; the vector (moveX, moveZ) has magnitude <= 1. */
  moveX: number;
  /** Forward, -1 (back) to 1 (forward). */
  moveZ: number;
  /** Yaw to add this frame, radians. */
  lookX: number;
  /** Pitch to add this frame, radians (positive looks down). */
  lookY: number;
  sprint: boolean;
  /** Edge-triggered: true once per press. */
  jump: boolean;
  /** Edge-triggered: true once per press. */
  interact: boolean;
  /** Edge-triggered: restart the chamber. */
  restart: boolean;
  /** Edge-triggered: undo the last gravity shift. */
  undo: boolean;
  /** Edge-triggered: pause / resume. */
  pause: boolean;
  /** Set when the device was touched in some way the fields above don't show (e.g. a menu button). */
  activity: boolean;
}

export interface InputSource {
  readonly device: InputDevice;
  /** Returns the current frame and consumes pending look deltas and button edges. `dt` is seconds since the last read. */
  read(dt: number): InputFrame;
  dispose(): void;
}

export function emptyFrame(): InputFrame {
  return { moveX: 0, moveZ: 0, lookX: 0, lookY: 0, sprint: false, jump: false, interact: false,
    restart: false, undo: false, pause: false, activity: false };
}

/** Combines several sources: movement is summed then limited to unit length, look is summed, buttons are ORed. */
export function mergeFrames(frames: InputFrame[]): InputFrame {
  const out = emptyFrame();
  for (const f of frames) {
    out.moveX += f.moveX;
    out.moveZ += f.moveZ;
    out.lookX += f.lookX;
    out.lookY += f.lookY;
    out.sprint = out.sprint || f.sprint;
    out.jump = out.jump || f.jump;
    out.interact = out.interact || f.interact;
    out.restart = out.restart || f.restart;
    out.undo = out.undo || f.undo;
    out.pause = out.pause || f.pause;
    out.activity = out.activity || f.activity;
  }
  const len = Math.hypot(out.moveX, out.moveZ);
  if (len > 1) {
    out.moveX /= len;
    out.moveZ /= len;
  }
  return out;
}

/**
 * Turns a screen-space drag (dx right, dy down, in pixels) into a stick vector in [-1, 1] with y up-positive.
 * Drags shorter than `deadzone` (a fraction of `radius`) give zero; the rest is rescaled so the stick ramps up
 * from 0 at the deadzone edge to 1 at `radius`, and the result is clamped to unit length.
 */
export function stickVector(dx: number, dy: number, radius: number, deadzone: number): { x: number; y: number } {
  const len = Math.hypot(dx, dy);
  if (radius <= 0 || len === 0) return { x: 0, y: 0 };
  const norm = Math.min(len / radius, 1);
  if (norm <= deadzone) return { x: 0, y: 0 };
  const scaled = deadzone >= 1 ? 0 : (norm - deadzone) / (1 - deadzone);
  return { x: (dx / len) * scaled, y: (-dy / len) * scaled };
}

/**
 * Whether a frame shows the player using the device: any movement, look or button. Sprint alone doesn't count,
 * because touch RUN is a toggle that stays on long after the thumb has left.
 */
export function frameHasInput(f: InputFrame): boolean {
  return f.moveX !== 0 || f.moveZ !== 0 || f.lookX !== 0 || f.lookY !== 0
    || f.jump || f.interact || f.restart || f.undo || f.pause || f.activity;
}

/**
 * Radial deadzone for an analogue stick: vectors shorter than `deadzone` give zero, the rest is rescaled so the
 * output ramps from 0 at the deadzone edge to 1 at full tilt (clamped to unit length). Direction is preserved.
 */
export function radialDeadzone(x: number, y: number, deadzone: number): { x: number; y: number } {
  const len = Math.hypot(x, y);
  if (len === 0 || len <= deadzone || deadzone >= 1) return { x: 0, y: 0 };
  const m = Math.min((len - deadzone) / (1 - deadzone), 1);
  return { x: (x / len) * m, y: (y / len) * m };
}

/** Deadzone plus a power response curve on the magnitude, for look sticks: fine aim near centre, fast at the edge. */
export function lookStick(x: number, y: number, deadzone: number, exponent = 2): { x: number; y: number } {
  const v = radialDeadzone(x, y, deadzone);
  const m = Math.hypot(v.x, v.y);
  if (m === 0) return v;
  const k = Math.pow(m, exponent) / m;
  return { x: v.x * k, y: v.y * k };
}
