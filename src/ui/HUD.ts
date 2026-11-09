import { AdvancedDynamicTexture, Control, Ellipse, Rectangle, TextBlock } from '@babylonjs/gui';
import { GravityAxis } from '../gravity/GravitySystem';

const AXIS_LABEL: Record<GravityAxis, string> = {
  '+X': 'EAST WALL',
  '-X': 'WEST WALL',
  '+Y': 'CEILING',
  '-Y': 'FLOOR (NATURAL)',
  '+Z': 'NORTH WALL',
  '-Z': 'SOUTH WALL',
};

export class HUD {
  private readonly ui: AdvancedDynamicTexture;
  private readonly prompt: TextBlock;
  private readonly gravityLabel: TextBlock;
  private gravityColor = '#bfe3ff';
  private keysLabel!: TextBlock;
  private readonly startOverlay: Rectangle;
  private readonly winOverlay: Rectangle;
  private readonly levelLabel: TextBlock;
  private readonly hintLabel: TextBlock;
  private winTitle!: TextBlock;
  private winSubtitle!: TextBlock;

  constructor() {
    this.ui = AdvancedDynamicTexture.CreateFullscreenUI('hud');

    // Crosshair
    const dot = new Ellipse('crosshair');
    dot.width = '5px';
    dot.height = '5px';
    dot.thickness = 0;
    dot.background = 'white';
    dot.alpha = 0.85;
    this.ui.addControl(dot);

    const ring = new Ellipse('crosshairRing');
    ring.width = '26px';
    ring.height = '26px';
    ring.thickness = 1.5;
    ring.color = 'white';
    ring.alpha = 0.35;
    this.ui.addControl(ring);

    // Interaction prompt
    this.prompt = new TextBlock('prompt', '');
    this.prompt.color = 'white';
    this.prompt.fontSize = 22;
    this.prompt.top = '120px';
    this.prompt.outlineColor = 'black';
    this.prompt.outlineWidth = 4;
    this.prompt.isVisible = false;
    this.ui.addControl(this.prompt);

    // Gravity indicator (top-left)
    const gravityBox = new Rectangle('gravityBox');
    gravityBox.width = '260px';
    gravityBox.height = '54px';
    gravityBox.cornerRadius = 6;
    gravityBox.color = 'rgba(255,255,255,0.25)';
    gravityBox.thickness = 1;
    gravityBox.background = 'rgba(10,12,18,0.55)';
    gravityBox.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    gravityBox.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    gravityBox.left = '18px';
    gravityBox.top = '18px';
    this.ui.addControl(gravityBox);

    this.gravityLabel = new TextBlock('gravityLabel', 'GRAVITY: FLOOR (NATURAL)');
    this.gravityLabel.color = '#bfe3ff';
    this.gravityLabel.fontSize = 16;
    this.gravityLabel.fontFamily = 'Consolas, monospace';
    gravityBox.addControl(this.gravityLabel);

    this.levelLabel = new TextBlock('levelLabel', '');
    this.levelLabel.color = 'white';
    this.levelLabel.fontSize = 20;
    this.levelLabel.fontFamily = 'Consolas, monospace';
    this.levelLabel.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    this.levelLabel.top = '22px';
    this.levelLabel.height = '30px';
    this.levelLabel.outlineColor = 'black';
    this.levelLabel.outlineWidth = 3;
    this.ui.addControl(this.levelLabel);

    this.hintLabel = new TextBlock('hintLabel', '');
    this.hintLabel.color = '#aab8cc';
    this.hintLabel.fontSize = 15;
    this.hintLabel.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    this.hintLabel.top = '50px';
    this.hintLabel.height = '24px';
    this.hintLabel.outlineColor = 'black';
    this.hintLabel.outlineWidth = 3;
    this.ui.addControl(this.hintLabel);

    const keys = (this.keysLabel = new TextBlock('keys', ''));
    this.setSkin('');
    keys.color = 'rgba(255,255,255,0.75)';
    keys.outlineColor = 'rgba(0,0,0,0.6)';
    keys.outlineWidth = 3;
    keys.fontSize = 13;
    keys.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
    keys.top = '-12px';
    keys.height = '20px';
    this.ui.addControl(keys);

    // Start overlay
    this.startOverlay = new Rectangle('startOverlay');
    this.startOverlay.width = 1;
    this.startOverlay.height = 1;
    this.startOverlay.thickness = 0;
    this.startOverlay.background = 'rgba(0,0,0,0.6)';
    this.ui.addControl(this.startOverlay);

    const title = new TextBlock('title', 'SHIFTBOUND');
    title.color = 'white';
    title.fontSize = 52;
    title.fontFamily = 'Segoe UI, sans-serif';
    title.top = '-90px';
    title.fontWeight = 'bold';
    this.startOverlay.addControl(title);

    const subtitle = new TextBlock(
      'subtitle',
      'Click to look around  •  WASD to move  •  Shift to run  •  Space to jump\nWalk up to a lever and press E to rotate gravity 90°\nR restarts the chamber\n\nClick anywhere to begin',
    );
    subtitle.color = '#d8e6ff';
    subtitle.fontSize = 20;
    subtitle.top = '10px';
    subtitle.textWrapping = true;
    subtitle.lineSpacing = '6px';
    this.startOverlay.addControl(subtitle);

    // Win overlay
    this.winOverlay = new Rectangle('winOverlay');
    this.winOverlay.width = 1;
    this.winOverlay.height = 1;
    this.winOverlay.thickness = 0;
    this.winOverlay.background = 'rgba(5,15,10,0.72)';
    this.winOverlay.isVisible = false;
    this.ui.addControl(this.winOverlay);

    const winTitle = (this.winTitle = new TextBlock('winTitle', 'CHAMBER CLEARED'));
    winTitle.color = '#9dffb0';
    winTitle.fontSize = 56;
    winTitle.fontWeight = 'bold';
    winTitle.top = '-40px';
    this.winOverlay.addControl(winTitle);

    const winSubtitle = (this.winSubtitle = new TextBlock('winSubtitle', ''));
    winSubtitle.color = 'white';
    winSubtitle.fontSize = 22;
    winSubtitle.top = '30px';
    this.winOverlay.addControl(winSubtitle);
  }

  public hideStartOverlay(): void {
    this.startOverlay.isVisible = false;
  }

  public showStartOverlay(): void {
    this.startOverlay.isVisible = true;
  }

  public showWin(title: string, subtitle: string): void {
    this.winTitle.text = title;
    this.winSubtitle.text = subtitle;
    this.winOverlay.isVisible = true;
  }

  public hideWin(): void {
    this.winOverlay.isVisible = false;
  }

  public setLevel(name: string, hint: string): void {
    this.levelLabel.text = name;
    this.hintLabel.text = hint;
  }

  public setPrompt(visible: boolean, text = 'Press [E] to shift gravity'): void {
    this.prompt.isVisible = visible;
    this.prompt.text = text;
  }

  public setSkin(label: string): void {
    this.keysLabel.text = `WASD move · Shift run · Space jump · E use · R restart · K skin${label ? `: ${label}` : ''}`;
  }

  public setGravityAxis(axis: GravityAxis, color = '#bfe3ff'): void {
    this.gravityColor = color;
    this.gravityLabel.color = color;
    this.gravityLabel.text = `GRAVITY: ${AXIS_LABEL[axis]}`;
  }

  public flashGravityChange(): void {
    this.gravityLabel.color = '#ffffff';
    setTimeout(() => {
      this.gravityLabel.color = this.gravityColor;
    }, 250);
  }

  public dispose(): void {
    this.ui.dispose();
  }
}
