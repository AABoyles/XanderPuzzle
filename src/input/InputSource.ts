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
}

export interface InputSource {
  /** Returns the current frame and consumes pending look deltas and button edges. */
  read(): InputFrame;
  dispose(): void;
}

export function emptyFrame(): InputFrame {
  return { moveX: 0, moveZ: 0, lookX: 0, lookY: 0, sprint: false, jump: false, interact: false };
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
