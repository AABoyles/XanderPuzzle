import { AdvancedDynamicTexture } from '@babylonjs/gui/2D/advancedDynamicTexture';
import { Button } from '@babylonjs/gui/2D/controls/button';
import { Control } from '@babylonjs/gui/2D/controls/control';
import { Rectangle } from '@babylonjs/gui/2D/controls/rectangle';
import { StackPanel } from '@babylonjs/gui/2D/controls/stackPanel';
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

/**
 * The wordmark matches the boot splash in `index.html` (`#boot`): same colour, weight, font, letter spacing and bar, so
 * the logo does not change when the game takes over. Keep the two in step. Sizes are CSS pixels, scaled to the GUI
 * texture's device pixels in `layoutLogo`.
 */
const LOGO_TEXT = 'SHIFTBOUND';
const LOGO_COLOR = '#ffa033';
const LOGO_FONT = "'Segoe UI', system-ui, -apple-system, sans-serif";
/** `clamp(1.4rem, 4vw, 2.4rem)` in the splash, with 1rem = 16px. */
const LOGO_MIN_PX = 22.4;
const LOGO_MAX_PX = 38.4;
const LOGO_VW = 0.04;
/** The splash's `letter-spacing: 0.5em`, which also pads its left edge so the word stays centred. */
const LOGO_SPACING_EM = 0.5;
/** The splash's `gap: 1.2rem` and its 6rem by 2px bar at 60% opacity. */
const LOGO_GAP_PX = 19.2;
const LOGO_BAR_WIDTH_PX = 96;
const LOGO_BAR_HEIGHT_PX = 2;
/** The splash centres the logo and pads its bottom by 160px, which lifts the group by half of that. */
const LOGO_LIFT_PX = 80;

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
  private readonly ui: AdvancedDynamicTexture;
  private readonly overlay: Rectangle;
  private readonly logo = new StackPanel('logo');
  private readonly logoLetters: TextBlock[] = [];
  private readonly logoGap = new Rectangle('logoGap');
  private readonly logoBar = new Rectangle('logoBar');
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

    this.ui = ui;
    this.buildLogo();

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

  /** The wordmark and the bar under it, laid out like the splash's flex column. */
  private buildLogo(): void {
    const word = new StackPanel('logoWord');
    word.isVertical = false;
    word.adaptWidthToChildren = true;
    word.adaptHeightToChildren = true;
    for (const letter of LOGO_TEXT) {
      const block = new TextBlock(`logo_${this.logoLetters.length}`, letter);
      block.color = LOGO_COLOR;
      block.fontFamily = LOGO_FONT;
      block.fontWeight = '600';
      block.resizeToFit = true;
      this.logoLetters.push(block);
      word.addControl(block);
    }
    this.logoGap.thickness = 0;
    this.logoBar.thickness = 0;
    this.logoBar.background = LOGO_COLOR;
    this.logoBar.alpha = 0.6;
    this.logo.adaptWidthToChildren = true;
    this.logo.adaptHeightToChildren = true;
    this.logo.addControl(word);
    this.logo.addControl(this.logoGap);
    this.logo.addControl(this.logoBar);
    this.overlay.addControl(this.logo);
    this.layoutLogo();
    this.ui
      .getScene()
      ?.getEngine()
      .onResizeObservable.add(() => this.layoutLogo());
  }

  /** Sizes the logo as the splash is sized: in CSS pixels, converted to the texture's pixels. */
  private layoutLogo(): void {
    const cssWidth = window.innerWidth || 1;
    const scale = this.ui.getSize().width / cssWidth;
    const size = Math.min(LOGO_MAX_PX, Math.max(LOGO_MIN_PX, cssWidth * LOGO_VW)) * scale;
    const spacing = size * LOGO_SPACING_EM;
    this.logoLetters.forEach((block, i) => {
      block.fontSize = size;
      block.paddingRight = `${spacing}px`;
      block.paddingLeft = i === 0 ? `${spacing}px` : '0px';
    });
    this.logoGap.height = `${LOGO_GAP_PX * scale}px`;
    this.logoBar.width = `${LOGO_BAR_WIDTH_PX * scale}px`;
    this.logoBar.height = `${LOGO_BAR_HEIGHT_PX * scale}px`;
    this.logo.top = `${-LOGO_LIFT_PX * scale}px`;
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
