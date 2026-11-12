/** Babylon-free jump assist: coyote time and jump buffering. Tested by Node (tests/jumpAssist.test.ts). */

/** Seconds after leaving the ground during which a jump still fires. */
export const COYOTE_TIME = 0.12;
/** Seconds a jump press is remembered before landing. */
export const JUMP_BUFFER = 0.12;

/**
 * Decides when a jump starts. A press is remembered for JUMP_BUFFER seconds; standing on the ground refreshes a
 * coyote timer to COYOTE_TIME, which then counts down in the air. A jump fires when a remembered press meets a live
 * coyote timer, and firing clears both, so one press gives one jump. The coyote timer is not refreshed while rising,
 * so the upward motion of a jump cannot grant a second one.
 */
export class JumpAssist {
  private buffer = 0;
  private coyote = 0;

  /** Advances one frame. Returns true on the frame a jump should start. */
  step(dt: number, grounded: boolean, pressed: boolean, rising: boolean): boolean {
    this.buffer = pressed ? JUMP_BUFFER : Math.max(0, this.buffer - dt);
    if (grounded && !rising) this.coyote = COYOTE_TIME;
    else this.coyote = Math.max(0, this.coyote - dt);

    if (this.buffer > 0 && this.coyote > 0) {
      this.buffer = 0;
      this.coyote = 0;
      return true;
    }
    return false;
  }

  reset(): void {
    this.buffer = 0;
    this.coyote = 0;
  }
}
