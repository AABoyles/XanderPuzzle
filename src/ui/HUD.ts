import { AdvancedDynamicTexture } from '@babylonjs/gui/2D/advancedDynamicTexture';
import { Button } from '@babylonjs/gui/2D/controls/button';
import { Control } from '@babylonjs/gui/2D/controls/control';
import { Ellipse } from '@babylonjs/gui/2D/controls/ellipse';
import { Rectangle } from '@babylonjs/gui/2D/controls/rectangle';
import { ScrollViewer } from '@babylonjs/gui/2D/controls/scrollViewers/scrollViewer';
import { StackPanel } from '@babylonjs/gui/2D/controls/stackPanel';
import { TextBlock } from '@babylonjs/gui/2D/controls/textBlock';
import { GravityAxis } from '../gravity/GravitySystem';
import type { InputDevice } from '../input/InputSource';

const AXIS_LABEL: Record<GravityAxis, string> = {
  '+X': 'EAST WALL',
  '-X': 'WEST WALL',
  '+Y': 'CEILING',
  '-Y': 'FLOOR (NATURAL)',
  '+Z': 'NORTH WALL',
  '-Z': 'SOUTH WALL',
};

/** One row of the chamber select list. */
export interface ChamberEntry {
  name: string;
  /** Best time, or "not completed". */
  best: string;
  completed: boolean;
  unlocked: boolean;
}

const ROW_HEIGHT = 52;
const DESKTOP_SUBTITLE =
  'Click to look around  \u2022  WASD to move  \u2022  Shift to run  \u2022  Space to jump\nWalk up to a lever and press E to rotate gravity 90\u00B0\nR restarts the chamber  \u2022  L opens chamber select\n\nClick anywhere to begin';
const TOUCH_SUBTITLE =
  'Left thumb: move  \u2022  Right side: drag to look\nJUMP to jump  \u2022  USE at a lever to rotate gravity 90\u00B0\n\nTap anywhere to begin';
const GAMEPAD_SUBTITLE =
  'Left stick move  \u2022  Right stick look  \u2022  LT run  \u2022  A jump\nWalk up to a lever and press X to rotate gravity 90\u00B0\nY restarts  \u2022  Back opens chamber select  \u2022  Start pauses\n\nPress A to begin';
const KEYS_LABEL: Record<InputDevice, string> = {
  keyboard: 'WASD move \u00B7 Shift run \u00B7 Space jump \u00B7 E use \u00B7 R restart \u00B7 L chambers \u00B7 K skin',
  touch: '',
  gamepad: 'L-stick move \u00B7 R-stick look \u00B7 LT run \u00B7 A jump \u00B7 X use \u00B7 Y restart \u00B7 Back chambers',
};
const SUBTITLES: Record<InputDevice, string> = {
  keyboard: DESKTOP_SUBTITLE,
  touch: TOUCH_SUBTITLE,
  gamepad: GAMEPAD_SUBTITLE,
};
const USE_PROMPT: Record<InputDevice, string> = {
  keyboard: 'Press [E] to shift gravity',
  touch: 'Tap [USE] to shift gravity',
  gamepad: 'Press [X] to shift gravity',
};

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
  private subtitle!: TextBlock;
  private gravityBox!: Rectangle;
  private device: InputDevice = 'keyboard';
  private skinLabel = '';
  private readonly startOverlay: Rectangle;
  private readonly winOverlay: Rectangle;
  private readonly sequenceLabel: TextBlock;
  private readonly levelLabel: TextBlock;
  private readonly hintLabel: TextBlock;
  private winTitle!: TextBlock;
  private winSubtitle!: TextBlock;
  private readonly updateNotice: TextBlock;
  private selectButton!: Button;
  private fullscreenButton!: Button;
  private fullscreenHint!: TextBlock;
  private fullscreenMode: 'toggle' | 'hint' | 'none' = 'none';
  private readonly selectOverlay: Rectangle;
  private readonly selectScroll: ScrollViewer;
  private readonly selectList: StackPanel;
  private readonly selectFooter: TextBlock;
  private selectRows: Button[] = [];
  private selectEntries: ChamberEntry[] = [];

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

    const subtitle = (this.subtitle = new TextBlock('subtitle', DESKTOP_SUBTITLE));
    subtitle.color = '#d8e6ff';
    subtitle.fontSize = 20;
    subtitle.top = '10px';
    subtitle.textWrapping = true;
    subtitle.lineSpacing = '6px';
    this.startOverlay.addControl(subtitle);

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
    selectButton.onPointerClickObservable.add(() => this.onOpenLevelSelect());
    this.startOverlay.addControl(selectButton);

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
    fsButton.onPointerClickObservable.add(() => this.onToggleFullscreen());
    this.startOverlay.addControl(fsButton);
    this.fullscreenHint = new TextBlock('fullscreenHint', 'Add to Home Screen for fullscreen');
    this.fullscreenHint.color = '#ffd36b';
    this.fullscreenHint.fontSize = 15;
    this.fullscreenHint.height = '24px';
    this.fullscreenHint.top = '244px';
    this.fullscreenHint.isVisible = false;
    this.startOverlay.addControl(this.fullscreenHint);

    // Small notice while a new version is waiting; it is applied from the pause menu or between chambers.
    this.updateNotice = new TextBlock('updateNotice', 'Update available \u2014 reload from the pause menu');
    this.updateNotice.color = '#ffd36b';
    this.updateNotice.fontSize = 13;
    this.updateNotice.outlineColor = 'black';
    this.updateNotice.outlineWidth = 3;
    this.updateNotice.height = '20px';
    this.updateNotice.top = '-36px';
    this.updateNotice.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
    this.updateNotice.isVisible = false;
    this.ui.addControl(this.updateNotice);

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

    // Chamber select overlay
    this.selectOverlay = new Rectangle('selectOverlay');
    this.selectOverlay.width = 1;
    this.selectOverlay.height = 1;
    this.selectOverlay.thickness = 0;
    this.selectOverlay.background = 'rgba(4,6,12,0.96)';
    this.selectOverlay.isVisible = false;
    this.ui.addControl(this.selectOverlay);

    const selectTitle = new TextBlock('selectTitle', 'CHAMBER SELECT');
    selectTitle.color = 'white';
    selectTitle.fontSize = 36;
    selectTitle.fontWeight = 'bold';
    selectTitle.height = '60px';
    selectTitle.top = '24px';
    selectTitle.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    this.selectOverlay.addControl(selectTitle);

    this.selectScroll = new ScrollViewer('selectScroll');
    this.selectScroll.thickness = 0;
    this.selectScroll.barSize = 10;
    this.selectScroll.barColor = 'rgba(255,255,255,0.4)';
    this.selectScroll.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    this.selectScroll.top = '96px';
    this.selectOverlay.addControl(this.selectScroll);

    this.selectList = new StackPanel('selectList');
    this.selectList.isVertical = true;
    this.selectScroll.addControl(this.selectList);

    const back = Button.CreateSimpleButton('closeLevelSelect', 'BACK');
    back.width = '140px';
    back.height = '40px';
    back.top = '-44px';
    back.cornerRadius = 6;
    back.color = 'rgba(255,255,255,0.6)';
    back.thickness = 1;
    back.background = 'rgba(20,28,40,0.85)';
    back.fontSize = 16;
    if (back.textBlock) back.textBlock.color = 'white';
    back.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
    back.onPointerClickObservable.add(() => this.onCloseLevelSelect());
    this.selectOverlay.addControl(back);

    this.selectFooter = new TextBlock('selectFooter', '');
    this.selectFooter.color = 'rgba(255,255,255,0.65)';
    this.selectFooter.fontSize = 14;
    this.selectFooter.height = '24px';
    this.selectFooter.top = '-12px';
    this.selectFooter.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
    this.selectOverlay.addControl(this.selectFooter);
  }

  /** The GUI layer, so other overlays (the pause menu) can add themselves on top. */
  public get texture(): AdvancedDynamicTexture {
    return this.ui;
  }

  public get isLevelSelectOpen(): boolean {
    return this.selectOverlay.isVisible;
  }

  /** Shows the chamber list with `selected` highlighted. */
  public showLevelSelect(entries: ChamberEntry[], selected: number, footer: string): void {
    for (const row of this.selectRows) row.dispose();
    this.selectEntries = entries;
    this.selectRows = entries.map((entry, i) => this.createChamberRow(entry, i));
    for (const row of this.selectRows) this.selectList.addControl(row);

    const size = this.ui.getSize();
    const width = Math.max(240, Math.min(600, size.width - 32));
    this.selectList.width = `${width - 14}px`;
    this.selectScroll.width = `${width}px`;
    this.selectScroll.height = `${Math.max(ROW_HEIGHT, Math.min(entries.length * (ROW_HEIGHT + 8), size.height - 210))}px`;
    this.selectFooter.text = footer;
    this.selectOverlay.isVisible = true;
    this.highlightLevel(selected);
  }

  public hideLevelSelect(): void {
    this.selectOverlay.isVisible = false;
  }

  /** Moves the keyboard/gamepad highlight to row `index`, scrolling it into view. */
  public highlightLevel(index: number): void {
    this.selectRows.forEach((row, i) => {
      const unlocked = this.selectEntries[i].unlocked;
      row.thickness = i === index ? 2 : 1;
      row.color = i === index ? '#ffffff' : 'rgba(255,255,255,0.25)';
      row.background = i === index && unlocked ? 'rgba(60,80,110,0.9)' : 'rgba(20,28,40,0.8)';
    });
    const n = this.selectRows.length;
    if (n > 1) this.selectScroll.verticalBar.value = index / (n - 1);
  }

  private createChamberRow(entry: ChamberEntry, index: number): Button {
    const row = new Button(`chamber${index}`);
    row.height = `${ROW_HEIGHT + 8}px`;
    row.paddingTop = '4px';
    row.paddingBottom = '4px';
    row.cornerRadius = 6;
    row.alpha = entry.unlocked ? 1 : 0.45;
    row.hoverCursor = entry.unlocked ? 'pointer' : 'not-allowed';
    row.pointerEnterAnimation = () => this.onHoverLevel(index);
    row.pointerOutAnimation = () => {};
    row.pointerDownAnimation = () => {};
    row.pointerUpAnimation = () => {};

    const name = new TextBlock(`chamberName${index}`, entry.name);
    name.color = 'white';
    name.fontSize = 18;
    name.fontFamily = 'Consolas, monospace';
    name.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    name.paddingLeft = '16px';
    row.addControl(name);

    const status = new TextBlock(`chamberStatus${index}`, entry.unlocked ? entry.best : 'LOCKED');
    status.color = !entry.unlocked ? '#ff9d9d' : entry.completed ? '#9dffb0' : '#aab8cc';
    status.fontSize = 15;
    status.fontFamily = 'Consolas, monospace';
    status.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
    status.paddingRight = '16px';
    row.addControl(status);

    row.onPointerClickObservable.add(() => this.onPickLevel(index));
    return row;
  }

  public hideStartOverlay(): void {
    this.startOverlay.isVisible = false;
  }

  public showStartOverlay(): void {
    this.startOverlay.isVisible = true;
  }

  public get isStartOverlayVisible(): boolean {
    return this.startOverlay.isVisible;
  }

  /** Switches prompts and labels to the wording of the device in use; touch also frees the top-right corner. */
  public setDevice(device: InputDevice): void {
    this.device = device;
    const touch = device === 'touch';
    this.subtitle.text = SUBTITLES[device];
    this.keysLabel.isVisible = !touch;
    this.refreshKeys();
    // Leave the top-right corner to the touch RESTART / CHAMBERS buttons.
    this.gravityBox.width = touch ? '210px' : '260px';
    this.levelLabel.width = touch ? '34%' : '100%';
    this.hintLabel.width = touch ? '34%' : '100%';
    this.hintLabel.textWrapping = touch;
    this.layoutStartButtons();
  }

  /** What the start overlay offers for fullscreen; shown on touch devices only. */
  public configureFullscreen(mode: 'toggle' | 'hint' | 'none'): void {
    this.fullscreenMode = mode;
    this.layoutStartButtons();
  }

  public setFullscreenState(on: boolean): void {
    if (this.fullscreenButton.textBlock) this.fullscreenButton.textBlock.text = on ? 'EXIT FULLSCREEN' : 'FULLSCREEN';
  }

  /** Shows or hides the "update available" notice. */
  public setUpdateNotice(visible: boolean): void {
    this.updateNotice.isVisible = visible;
  }

  /** On touch the start overlay's buttons sit along the bottom edge, where landscape phones have room. */
  private layoutStartButtons(): void {
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
    this.ui.dispose();
  }
}
