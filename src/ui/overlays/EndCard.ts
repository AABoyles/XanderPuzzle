import { AdvancedDynamicTexture } from '@babylonjs/gui/2D/advancedDynamicTexture';
import { Rectangle } from '@babylonjs/gui/2D/controls/rectangle';
import { TextBlock } from '@babylonjs/gui/2D/controls/textBlock';

/** The end card, after the final fall: fades to black with the facility's last line, then the game's body text. */
export class EndCard {
  private readonly overlay: Rectangle;
  private readonly title: TextBlock;
  private readonly body: TextBlock;
  private timer: ReturnType<typeof setInterval> | undefined;

  constructor(ui: AdvancedDynamicTexture) {
    this.overlay = new Rectangle('endOverlay');
    this.overlay.width = 1;
    this.overlay.height = 1;
    this.overlay.thickness = 0;
    // Not quite opaque: the planet, and the one new light on it, stay faintly in view behind the card.
    this.overlay.background = 'rgba(0,0,0,0.72)';
    this.overlay.isVisible = false;
    ui.addControl(this.overlay);
    this.title = new TextBlock('endTitle', '');
    this.title.color = '#d8c89a';
    this.title.fontSize = 26;
    this.title.fontFamily = 'Consolas, monospace';
    this.title.top = '-70px';
    this.overlay.addControl(this.title);
    this.body = new TextBlock('endBody', '');
    this.body.color = 'white';
    this.body.fontSize = 22;
    this.body.top = '50px';
    this.body.height = '200px';
    this.overlay.addControl(this.body);
  }

  /**
   * The screen fades to black over ~2 s with `title` on it, then `body` fades in below. Purely visual; hiding it at any
   * point is safe.
   */
  public show(title: string, body: string): void {
    clearInterval(this.timer);
    this.title.text = title;
    this.body.text = body;
    this.overlay.alpha = 0;
    this.body.alpha = 0;
    this.overlay.isVisible = true;
    const start = performance.now();
    this.timer = setInterval(() => {
      const t = (performance.now() - start) / 1000;
      // The card waits a moment, so the light is seen coming up first.
      this.overlay.alpha = Math.min(1, Math.max(0, (t - 2) / 2));
      this.body.alpha = Math.min(1, Math.max(0, (t - 5) / 1.5));
      if (t > 6.5) clearInterval(this.timer);
    }, 33);
  }

  public hide(): void {
    clearInterval(this.timer);
    this.overlay.isVisible = false;
  }

  public dispose(): void {
    clearInterval(this.timer);
  }
}
