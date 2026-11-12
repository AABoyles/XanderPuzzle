import { AdvancedDynamicTexture } from '@babylonjs/gui/2D/advancedDynamicTexture';
import { Button } from '@babylonjs/gui/2D/controls/button';
import { Control } from '@babylonjs/gui/2D/controls/control';
import { Rectangle } from '@babylonjs/gui/2D/controls/rectangle';
import { TextBlock } from '@babylonjs/gui/2D/controls/textBlock';
import type { InputDevice } from '../../input/InputSource';

const DESKTOP_SUBTITLE =
  'Click to look around  •  WASD to move  •  Shift to run  •  Space to jump\nWalk up to a lever and press E to rotate gravity 90°\nR restarts the chamber  •  L opens chamber select\n\nClick anywhere to begin';
const TOUCH_SUBTITLE =
  'Left thumb: move  •  Right side: drag to look\nJUMP to jump  •  USE at a lever to rotate gravity 90°\n\nTap anywhere to begin';
const GAMEPAD_SUBTITLE =
  'Left stick move  •  Right stick look  •  LT run  •  A jump\nWalk up to a lever and press X to rotate gravity 90°\nY restarts  •  Back opens chamber select  •  Start pauses\n\nPress A to begin';
const SUBTITLES: Record<InputDevice, string> = {
  keyboard: DESKTOP_SUBTITLE,
  touch: TOUCH_SUBTITLE,
  gamepad: GAMEPAD_SUBTITLE,
};

/** What the start overlay reports back to the game. */
export interface StartOverlayHandlers {
  /** The chamber select button was pressed. */
  onOpenLevelSelect: () => void;
  /** The fullscreen button was pressed. */
  onToggleFullscreen: () => void;
}

/** The title card shown before the first chamber: the name, the controls for the device in use, and the start buttons. */
export class StartOverlay {
  private readonly handlers: StartOverlayHandlers;
  private readonly overlay: Rectangle;
  private readonly subtitle: TextBlock;
  private readonly selectButton: Button;
  private readonly fullscreenButton: Button;
  private readonly fullscreenHint: TextBlock;
  private device: InputDevice = 'keyboard';
  private fullscreenMode: 'toggle' | 'hint' | 'none' = 'none';

  constructor(ui: AdvancedDynamicTexture, handlers: StartOverlayHandlers) {
    this.handlers = handlers;

    this.overlay = new Rectangle('startOverlay');
    this.overlay.width = 1;
    this.overlay.height = 1;
    this.overlay.thickness = 0;
    this.overlay.background = 'rgba(0,0,0,0.6)';
    ui.addControl(this.overlay);

    const title = new TextBlock('title', 'SHIFTBOUND');
    title.color = 'white';
    title.fontSize = 52;
    title.fontFamily = 'Segoe UI, sans-serif';
    title.top = '-90px';
    title.fontWeight = 'bold';
    this.overlay.addControl(title);

    this.subtitle = new TextBlock('subtitle', DESKTOP_SUBTITLE);
    this.subtitle.color = '#d8e6ff';
    this.subtitle.fontSize = 20;
    this.subtitle.top = '10px';
    this.subtitle.textWrapping = true;
    this.subtitle.lineSpacing = '6px';
    this.overlay.addControl(this.subtitle);

    const selectButton = (this.selectButton = Button.CreateSimpleButton('openLevelSelect', 'CHAMBER SELECT  [L]'));
    selectButton.width = '260px';
    selectButton.height = '44px';
    selectButton.top = '190px';
    selectButton.cornerRadius = 6;
    selectButton.color = 'rgba(255,255,255,0.6)';
    selectButton.thickness = 1;
    selectButton.background = 'rgba(20,28,40,0.85)';
    selectButton.fontSize = 18;
    selectButton.fontFamily = 'Consolas, monospace';
    if (selectButton.textBlock) selectButton.textBlock.color = 'white';
    selectButton.pointerEnterAnimation = () => (selectButton.background = 'rgba(60,80,110,0.9)');
    selectButton.pointerOutAnimation = () => (selectButton.background = 'rgba(20,28,40,0.85)');
    selectButton.onPointerClickObservable.add(() => this.handlers.onOpenLevelSelect());
    this.overlay.addControl(selectButton);

    // Fullscreen (touch only): a button where the browser allows it, otherwise an install hint.
    const fsButton = (this.fullscreenButton = Button.CreateSimpleButton('toggleFullscreen', 'FULLSCREEN'));
    fsButton.width = '260px';
    fsButton.height = '44px';
    fsButton.top = '244px';
    fsButton.cornerRadius = 6;
    fsButton.color = 'rgba(255,255,255,0.6)';
    fsButton.thickness = 1;
    fsButton.background = 'rgba(20,28,40,0.85)';
    fsButton.fontSize = 18;
    fsButton.fontFamily = 'Consolas, monospace';
    if (fsButton.textBlock) fsButton.textBlock.color = 'white';
    fsButton.isVisible = false;
    fsButton.onPointerClickObservable.add(() => this.handlers.onToggleFullscreen());
    this.overlay.addControl(fsButton);
    this.fullscreenHint = new TextBlock('fullscreenHint', 'Add to Home Screen for fullscreen');
    this.fullscreenHint.color = '#ffd36b';
    this.fullscreenHint.fontSize = 15;
    this.fullscreenHint.height = '24px';
    this.fullscreenHint.top = '244px';
    this.fullscreenHint.isVisible = false;
    this.overlay.addControl(this.fullscreenHint);
  }

  public get isVisible(): boolean {
    return this.overlay.isVisible;
  }

  public show(): void {
    this.overlay.isVisible = true;
  }

  public hide(): void {
    this.overlay.isVisible = false;
  }

  /** Switches the subtitle to the controls of `device`, and lays the buttons out for it. */
  public setDevice(device: InputDevice): void {
    this.device = device;
    this.subtitle.text = SUBTITLES[device];
    this.layoutButtons();
  }

  /** What the overlay offers for fullscreen; shown on touch devices only. */
  public configureFullscreen(mode: 'toggle' | 'hint' | 'none'): void {
    this.fullscreenMode = mode;
    this.layoutButtons();
  }

  public setFullscreenState(on: boolean): void {
    if (this.fullscreenButton.textBlock) this.fullscreenButton.textBlock.text = on ? 'EXIT FULLSCREEN' : 'FULLSCREEN';
  }

  /** On touch the buttons sit along the bottom edge, where landscape phones have room. */
  private layoutButtons(): void {
    const touch = this.device === 'touch';
    const fs = touch ? this.fullscreenMode : 'none';
    this.fullscreenButton.isVisible = fs === 'toggle';
    this.fullscreenHint.isVisible = fs === 'hint';
    const bottom = Control.VERTICAL_ALIGNMENT_BOTTOM;
    const center = Control.VERTICAL_ALIGNMENT_CENTER;
    if (touch) {
      const side = fs === 'toggle';
      this.selectButton.verticalAlignment = bottom;
      this.selectButton.top = fs === 'hint' ? '-44px' : '-16px';
      this.selectButton.left = side ? '-140px' : '0px';
      this.selectButton.width = side ? '260px' : '280px';
      this.fullscreenButton.verticalAlignment = bottom;
      this.fullscreenButton.top = '-16px';
      this.fullscreenButton.left = '140px';
      this.fullscreenHint.verticalAlignment = bottom;
      this.fullscreenHint.top = '-14px';
    } else {
      this.selectButton.verticalAlignment = center;
      this.selectButton.top = '190px';
      this.selectButton.left = '0px';
      this.selectButton.width = '260px';
    }
  }
}
