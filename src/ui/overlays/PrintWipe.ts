import { AdvancedDynamicTexture } from '@babylonjs/gui/2D/advancedDynamicTexture';
import { Control } from '@babylonjs/gui/2D/controls/control';
import { Rectangle } from '@babylonjs/gui/2D/controls/rectangle';
import { printInDuration } from '../printTiming';

/**
 * The print wipe: a pale fog over the view that a bright line sweeps across, opening the view (`printIn`) or closing it
 * behind the attendant (`printOut`). It sits under every overlay added to the texture after it.
 */
export class PrintWipe {
  private readonly fog: Rectangle;
  private readonly bar: Rectangle;
  private timer: ReturnType<typeof setInterval> | undefined;

  constructor(ui: AdvancedDynamicTexture) {
    this.fog = new Rectangle('printFog');
    this.fog.width = 1;
    this.fog.thickness = 0;
    this.fog.background = 'rgb(196,240,255)';
    this.fog.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    this.fog.isHitTestVisible = false;
    this.fog.isVisible = false;
    ui.addControl(this.fog);
    this.bar = new Rectangle('printBar');
    this.bar.width = 1;
    this.bar.height = '5px';
    this.bar.thickness = 0;
    this.bar.background = 'white';
    this.bar.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    this.bar.isHitTestVisible = false;
    this.bar.isVisible = false;
    ui.addControl(this.bar);
  }

  /**
   * The attendant is printed (NARRATIVE.md): the view starts as a pale blank and the print head's line sweeps up it,
   * leaving the chamber behind, as if the eyes were the last thing made. Under a second. With `reduced` motion it is a
   * plain fade. `repeats` counts the starts of the same chamber in a row before this one; a repeat is quicker (see
   * `printInDuration`).
   */
  public printIn(reduced = false, repeats = 0): void {
    clearInterval(this.timer);
    const duration = printInDuration(reduced, repeats);
    const start = performance.now();
    this.fog.isVisible = true;
    this.bar.isVisible = !reduced;
    const step = () => {
      const p = Math.min(1, (performance.now() - start) / 1000 / duration);
      if (reduced) {
        this.fog.height = 1;
        this.fog.alpha = 0.7 * (1 - p);
      } else {
        // The line eases upwards; everything above it is still unprinted.
        const done = p * p * (3 - 2 * p);
        const left = 1 - done;
        this.fog.height = `${(left * 100).toFixed(2)}%`;
        this.fog.alpha = 0.55 + 0.35 * left;
        this.bar.top = `${(left * 100).toFixed(2)}%`;
      }
      if (p >= 1) {
        clearInterval(this.timer);
        this.fog.isVisible = false;
        this.bar.isVisible = false;
      }
    };
    step();
    this.timer = setInterval(step, 16);
  }

  /**
   * The attendant is reclaimed at the exit: `printIn` run backwards. The line sweeps down from the top and leaves the
   * pale blank behind it, which stays (faintly, under the win screen) until the next `printIn` clears it.
   */
  public printOut(reduced = false): void {
    clearInterval(this.timer);
    const duration = reduced ? 0.4 : 0.8;
    const start = performance.now();
    this.fog.isVisible = true;
    this.bar.isVisible = !reduced;
    const step = () => {
      const p = Math.min(1, (performance.now() - start) / 1000 / duration);
      const done = reduced ? 1 : p * p * (3 - 2 * p);
      this.fog.height = `${(done * 100).toFixed(2)}%`;
      this.fog.alpha = reduced ? 0.45 * p : 0.75 - 0.3 * p;
      this.bar.top = `${(done * 100).toFixed(2)}%`;
      if (p >= 1) {
        clearInterval(this.timer);
        this.bar.isVisible = false;
      }
    };
    step();
    this.timer = setInterval(step, 16);
  }

  public dispose(): void {
    clearInterval(this.timer);
  }
}
