import { AdvancedDynamicTexture } from '@babylonjs/gui/2D/advancedDynamicTexture';
import { Rectangle } from '@babylonjs/gui/2D/controls/rectangle';
import { TextBlock } from '@babylonjs/gui/2D/controls/textBlock';

/** The chamber cleared card: a title and a subtitle over a dim green wash. */
export class WinOverlay {
  private readonly overlay: Rectangle;
  private readonly title: TextBlock;
  private readonly subtitle: TextBlock;

  constructor(ui: AdvancedDynamicTexture) {
    this.overlay = new Rectangle('winOverlay');
    this.overlay.width = 1;
    this.overlay.height = 1;
    this.overlay.thickness = 0;
    this.overlay.background = 'rgba(5,15,10,0.72)';
    this.overlay.isVisible = false;
    ui.addControl(this.overlay);

    this.title = new TextBlock('winTitle', 'CHAMBER CLEARED');
    this.title.color = '#9dffb0';
    this.title.fontSize = 56;
    this.title.fontWeight = 'bold';
    this.title.top = '-120px'; // clear of the body, which is centred and up to eight lines tall
    this.overlay.addControl(this.title);

    this.subtitle = new TextBlock('winSubtitle', '');
    this.subtitle.color = 'white';
    this.subtitle.fontSize = 22;
    this.subtitle.top = '40px';
    this.overlay.addControl(this.subtitle);
  }

  public show(title: string, subtitle: string): void {
    this.title.text = title;
    this.subtitle.text = subtitle;
    this.overlay.isVisible = true;
  }

  public hide(): void {
    this.overlay.isVisible = false;
  }
}
