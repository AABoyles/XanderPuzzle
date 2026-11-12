import { AdvancedDynamicTexture } from '@babylonjs/gui/2D/advancedDynamicTexture';
import { Control } from '@babylonjs/gui/2D/controls/control';
import { Ellipse } from '@babylonjs/gui/2D/controls/ellipse';
import { Rectangle } from '@babylonjs/gui/2D/controls/rectangle';
import { TextBlock } from '@babylonjs/gui/2D/controls/textBlock';
import { GravityAxis } from '../gravity/GravitySystem';
import type { InputDevice } from '../input/InputSource';
import type { ChamberEntry } from './overlays/ChamberSelect';
import { ChamberSelect } from './overlays/ChamberSelect';
import { EndCard } from './overlays/EndCard';
import { PrintWipe } from './overlays/PrintWipe';
import { StartOverlay } from './overlays/StartOverlay';
import { WinOverlay } from './overlays/WinOverlay';

export type { ChamberEntry } from './overlays/ChamberSelect';

const AXIS_LABEL: Record<GravityAxis, string> = {
  '+X': 'EAST WALL',
  '-X': 'WEST WALL',
  '+Y': 'CEILING',
  '-Y': 'FLOOR (NATURAL)',
  '+Z': 'NORTH WALL',
  '-Z': 'SOUTH WALL',
};

const KEYS_LABEL: Record<InputDevice, string> = {
  keyboard: 'WASD move · Shift run · Space jump · E use · R restart · Z undo · L chambers · K skin',
  touch: '',
  gamepad: 'L-stick move · R-stick look · LT run · A jump · X use · Y restart · B undo · Back chambers',
};
const USE_PROMPT: Record<InputDevice, string> = {
  keyboard: 'Press [E] to shift gravity',
  touch: 'Tap [USE] to shift gravity',
  gamepad: 'Press [X] to shift gravity',
};

/**
 * The in-play HUD: the crosshair, prompts, gravity and chamber labels, and the key reminder. The start, chamber select,
 * win and end cards and the print wipe are overlays in `./overlays/`; this class holds them and delegates.
 */
export class HUD {
  /** The start overlay's chamber select button was pressed. */
  public onOpenLevelSelect: () => void = () => {};
  /** A chamber row was clicked or tapped. */
  public onPickLevel: (index: number) => void = () => {};
  /** The pointer moved onto a chamber row. */
  public onHoverLevel: (index: number) => void = () => {};
  /** The chamber select's back button was pressed. */
  public onCloseLevelSelect: () => void = () => {};
  /** The start overlay's fullscreen button was pressed. */
  public onToggleFullscreen: () => void = () => {};

  private readonly ui: AdvancedDynamicTexture;
  private readonly prompt: TextBlock;
  private readonly gravityLabel: TextBlock;
  private gravityColor = '#bfe3ff';
  private keysLabel!: TextBlock;
  private gravityBox!: Rectangle;
  private device: InputDevice = 'keyboard';
  private skinLabel = '';
  private readonly sequenceLabel: TextBlock;
  private readonly levelLabel: TextBlock;
  private readonly hintLabel: TextBlock;
  private readonly logLabel: TextBlock;
  private logTimer: ReturnType<typeof setTimeout> | undefined;
  private readonly printWipe: PrintWipe;
  private readonly startOverlay: StartOverlay;
  private readonly winOverlay: WinOverlay;
  private readonly endCard: EndCard;
  private readonly levelSelect: ChamberSelect;
  private readonly updateNotice: TextBlock;

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
    const gravityBox = (this.gravityBox = new Rectangle('gravityBox'));
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

    // Countdown to the next timed gravity change, under the gravity indicator.
    this.sequenceLabel = new TextBlock('sequenceLabel', '');
    this.sequenceLabel.fontSize = 16;
    this.sequenceLabel.fontFamily = 'Consolas, monospace';
    this.sequenceLabel.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    this.sequenceLabel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    this.sequenceLabel.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    this.sequenceLabel.left = '24px';
    this.sequenceLabel.top = '78px';
    this.sequenceLabel.width = '360px';
    this.sequenceLabel.height = '24px';
    this.sequenceLabel.outlineColor = 'black';
    this.sequenceLabel.outlineWidth = 3;
    this.sequenceLabel.isVisible = false;
    this.ui.addControl(this.sequenceLabel);

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
    // Grows to fit a line that wraps (a phone's narrow hint column), so a longer hint is never clipped.
    this.hintLabel.resizeToFit = true;
    this.hintLabel.outlineColor = 'black';
    this.hintLabel.outlineWidth = 3;
    this.ui.addControl(this.hintLabel);

    // The facility's log line (the Stencil, see NARRATIVE.md), under the hint for a few seconds.
    this.logLabel = new TextBlock('logLabel', '');
    this.logLabel.color = '#d8c89a';
    this.logLabel.fontSize = 14;
    this.logLabel.fontFamily = 'Consolas, monospace';
    this.logLabel.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    this.logLabel.top = '76px';
    this.logLabel.height = '22px';
    this.logLabel.outlineColor = 'black';
    this.logLabel.outlineWidth = 3;
    this.logLabel.isVisible = false;
    this.ui.addControl(this.logLabel);

    // The print wipe sits under every overlay added after it.
    this.printWipe = new PrintWipe(this.ui);

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

    this.startOverlay = new StartOverlay(this.ui, {
      onOpenLevelSelect: () => this.onOpenLevelSelect(),
      onToggleFullscreen: () => this.onToggleFullscreen(),
    });

    // Small notice while a new version is waiting; it is applied from the pause menu or between chambers.
    this.updateNotice = new TextBlock('updateNotice', 'Update available — reload from the pause menu');
    this.updateNotice.color = '#ffd36b';
    this.updateNotice.fontSize = 13;
    this.updateNotice.outlineColor = 'black';
    this.updateNotice.outlineWidth = 3;
    this.updateNotice.height = '20px';
    this.updateNotice.top = '-36px';
    this.updateNotice.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
    this.updateNotice.isVisible = false;
    this.ui.addControl(this.updateNotice);

    this.winOverlay = new WinOverlay(this.ui);
    this.endCard = new EndCard(this.ui);
    this.levelSelect = new ChamberSelect(this.ui, {
      onPick: (index) => this.onPickLevel(index),
      onHover: (index) => this.onHoverLevel(index),
      onClose: () => this.onCloseLevelSelect(),
    });
  }

  /** The GUI layer, so other overlays (the pause menu) can add themselves on top. */
  public get texture(): AdvancedDynamicTexture {
    return this.ui;
  }

  public get isLevelSelectOpen(): boolean {
    return this.levelSelect.isOpen;
  }

  /** Shows the chamber list with `selected` highlighted. */
  public showLevelSelect(entries: ChamberEntry[], selected: number, footer: string): void {
    this.levelSelect.show(entries, selected, footer);
  }

  public hideLevelSelect(): void {
    this.levelSelect.hide();
  }

  /** Moves the keyboard/gamepad highlight to row `index`, scrolling it into view. */
  public highlightLevel(index: number): void {
    this.levelSelect.highlight(index);
  }

  public hideStartOverlay(): void {
    this.startOverlay.hide();
  }

  public showStartOverlay(): void {
    this.startOverlay.show();
  }

  public get isStartOverlayVisible(): boolean {
    return this.startOverlay.isVisible;
  }

  /** Switches prompts and labels to the wording of the device in use; touch also frees the top-right corner. */
  public setDevice(device: InputDevice): void {
    this.device = device;
    const touch = device === 'touch';
    this.startOverlay.setDevice(device);
    this.keysLabel.isVisible = !touch;
    this.refreshKeys();
    // Leave the top-right corner to the touch RESTART / CHAMBERS buttons.
    this.gravityBox.width = touch ? '210px' : '260px';
    this.levelLabel.width = touch ? '34%' : '100%';
    this.hintLabel.width = touch ? '34%' : '100%';
    this.hintLabel.textWrapping = touch;
  }

  /** What the start overlay offers for fullscreen; shown on touch devices only. */
  public configureFullscreen(mode: 'toggle' | 'hint' | 'none'): void {
    this.startOverlay.configureFullscreen(mode);
  }

  public setFullscreenState(on: boolean): void {
    this.startOverlay.setFullscreenState(on);
  }

  /** Shows or hides the "update available" notice. */
  public setUpdateNotice(visible: boolean): void {
    this.updateNotice.isVisible = visible;
  }

  public showWin(title: string, subtitle: string): void {
    this.winOverlay.show(title, subtitle);
  }

  /**
   * The end card: the screen fades to black over ~2 s with `title` (the facility's last line) on it, then `body` fades
   * in below. Purely visual; hiding it at any point is safe.
   */
  public showEnding(title: string, body: string): void {
    this.endCard.show(title, body);
  }

  public hideEnding(): void {
    this.endCard.hide();
  }

  public hideWin(): void {
    this.winOverlay.hide();
  }

  public setLevel(name: string, hint: string): void {
    this.levelLabel.text = name;
    this.hintLabel.text = hint;
  }

  /** Replaces the hint line under the chamber name with a longer one from the hint ladder (src/hints.ts). */
  public setHint(text: string): void {
    this.hintLabel.text = text;
  }

  /** Shows one log line for `seconds`, replacing any line still showing. */
  public log(text: string, seconds = 5): void {
    clearTimeout(this.logTimer);
    this.logLabel.text = text;
    // One 22px row per line, so a two-line notice (see `NO_TRIM`) is not clipped.
    this.logLabel.height = `${22 * text.split('\n').length}px`;
    this.logLabel.isVisible = true;
    this.logTimer = setTimeout(() => {
      this.logLabel.isVisible = false;
    }, seconds * 1000);
  }

  /** The attendant is printed; see `PrintWipe.printIn`. */
  public printIn(reduced = false, repeats = 0): void {
    this.printWipe.printIn(reduced, repeats);
  }

  /** The attendant is reclaimed at the exit; see `PrintWipe.printOut`. */
  public printOut(reduced = false): void {
    this.printWipe.printOut(reduced);
  }

  public setPrompt(visible: boolean, text?: string): void {
    this.prompt.isVisible = visible;
    this.prompt.text = text ?? USE_PROMPT[this.device];
  }

  public setSkin(label: string): void {
    this.skinLabel = label;
    this.refreshKeys();
  }

  private refreshKeys(): void {
    // Skins are switched with K on a keyboard only.
    const label = this.device === 'keyboard' && this.skinLabel ? `: ${this.skinLabel}` : '';
    this.keysLabel.text = KEYS_LABEL[this.device] + label;
  }

  public setGravityAxis(axis: GravityAxis, color = '#bfe3ff'): void {
    this.gravityColor = color;
    this.gravityLabel.color = color;
    this.gravityLabel.text = `GRAVITY: ${AXIS_LABEL[axis]}`;
  }

  /** Shows the next timed gravity change and how long until it, or hides it with `null`. */
  public setSequence(next: GravityAxis | null, seconds = 0, color = '#ffd36b'): void {
    this.sequenceLabel.isVisible = next !== null;
    if (!next) return;
    this.sequenceLabel.color = seconds < 1 ? '#ffffff' : color;
    this.sequenceLabel.text = `NEXT: ${AXIS_LABEL[next]} IN ${Math.max(0, seconds).toFixed(1)}s`;
  }

  public flashGravityChange(): void {
    this.gravityLabel.color = '#ffffff';
    setTimeout(() => {
      this.gravityLabel.color = this.gravityColor;
    }, 250);
  }

  public dispose(): void {
    this.endCard.dispose();
    clearTimeout(this.logTimer);
    this.printWipe.dispose();
    this.ui.dispose();
  }
}
