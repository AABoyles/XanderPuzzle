import { AdvancedDynamicTexture } from '@babylonjs/gui/2D/advancedDynamicTexture';
import { Button } from '@babylonjs/gui/2D/controls/button';
import { Control } from '@babylonjs/gui/2D/controls/control';
import { Rectangle } from '@babylonjs/gui/2D/controls/rectangle';
import { ScrollViewer } from '@babylonjs/gui/2D/controls/scrollViewers/scrollViewer';
import { StackPanel } from '@babylonjs/gui/2D/controls/stackPanel';
import { TextBlock } from '@babylonjs/gui/2D/controls/textBlock';
import { cubeLabel } from '../../narrative';

/** One row of the chamber select list. */
export interface ChamberEntry {
  name: string;
  /** The facility's serial for the chamber, shown under its name. */
  cube: string;
  /** Best time, or "not completed". */
  best: string;
  /** Best shift count against par (`3/3 shifts`), or empty when the chamber has no par or no count yet. */
  shifts: string;
  completed: boolean;
  unlocked: boolean;
}

/** What the chamber select reports back to the game. */
export interface ChamberSelectHandlers {
  /** A chamber row was clicked or tapped. */
  onPick: (index: number) => void;
  /** The pointer moved onto a chamber row. */
  onHover: (index: number) => void;
  /** The back button was pressed. */
  onClose: () => void;
}

const ROW_HEIGHT = 52;

/** The full-screen chamber list: one button row per chamber, highlighted by the keyboard or gamepad. */
export class ChamberSelect {
  private readonly ui: AdvancedDynamicTexture;
  private readonly handlers: ChamberSelectHandlers;
  private readonly overlay: Rectangle;
  private readonly scroll: ScrollViewer;
  private readonly list: StackPanel;
  private readonly footer: TextBlock;
  private rows: Button[] = [];
  private entries: ChamberEntry[] = [];

  constructor(ui: AdvancedDynamicTexture, handlers: ChamberSelectHandlers) {
    this.ui = ui;
    this.handlers = handlers;

    this.overlay = new Rectangle('selectOverlay');
    this.overlay.width = 1;
    this.overlay.height = 1;
    this.overlay.thickness = 0;
    this.overlay.background = 'rgba(4,6,12,0.96)';
    this.overlay.isVisible = false;
    ui.addControl(this.overlay);

    const selectTitle = new TextBlock('selectTitle', 'CHAMBER SELECT');
    selectTitle.color = 'white';
    selectTitle.fontSize = 36;
    selectTitle.fontWeight = 'bold';
    selectTitle.height = '60px';
    selectTitle.top = '24px';
    selectTitle.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    this.overlay.addControl(selectTitle);

    this.scroll = new ScrollViewer('selectScroll');
    this.scroll.thickness = 0;
    this.scroll.barSize = 10;
    this.scroll.barColor = 'rgba(255,255,255,0.4)';
    this.scroll.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    this.scroll.top = '96px';
    this.overlay.addControl(this.scroll);

    this.list = new StackPanel('selectList');
    this.list.isVertical = true;
    this.scroll.addControl(this.list);

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
    back.onPointerClickObservable.add(() => this.handlers.onClose());
    this.overlay.addControl(back);

    this.footer = new TextBlock('selectFooter', '');
    this.footer.color = 'rgba(255,255,255,0.65)';
    this.footer.fontSize = 14;
    this.footer.height = '24px';
    this.footer.top = '-12px';
    this.footer.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
    this.overlay.addControl(this.footer);
  }

  public get isOpen(): boolean {
    return this.overlay.isVisible;
  }

  /** Shows the chamber list with `selected` highlighted. */
  public show(entries: ChamberEntry[], selected: number, footer: string): void {
    for (const row of this.rows) row.dispose();
    this.entries = entries;
    this.rows = entries.map((entry, i) => this.createRow(entry, i));
    for (const row of this.rows) this.list.addControl(row);

    const size = this.ui.getSize();
    const width = Math.max(240, Math.min(600, size.width - 32));
    this.list.width = `${width - 14}px`;
    this.scroll.width = `${width}px`;
    this.scroll.height = `${Math.max(ROW_HEIGHT, Math.min(entries.length * (ROW_HEIGHT + 8), size.height - 210))}px`;
    this.footer.text = footer;
    this.overlay.isVisible = true;
    this.highlight(selected);
  }

  public hide(): void {
    this.overlay.isVisible = false;
  }

  /** Moves the keyboard/gamepad highlight to row `index`, scrolling it into view. */
  public highlight(index: number): void {
    this.rows.forEach((row, i) => {
      const unlocked = this.entries[i].unlocked;
      row.thickness = i === index ? 2 : 1;
      row.color = i === index ? '#ffffff' : 'rgba(255,255,255,0.25)';
      row.background = i === index && unlocked ? 'rgba(60,80,110,0.9)' : 'rgba(20,28,40,0.8)';
    });
    const n = this.rows.length;
    if (n > 1) this.scroll.verticalBar.value = index / (n - 1);
  }

  private createRow(entry: ChamberEntry, index: number): Button {
    const row = new Button(`chamber${index}`);
    row.height = `${ROW_HEIGHT + 8}px`;
    row.paddingTop = '4px';
    row.paddingBottom = '4px';
    row.cornerRadius = 6;
    row.alpha = entry.unlocked ? 1 : 0.45;
    row.hoverCursor = entry.unlocked ? 'pointer' : 'not-allowed';
    row.pointerEnterAnimation = () => this.handlers.onHover(index);
    row.pointerOutAnimation = () => {};
    row.pointerDownAnimation = () => {};
    row.pointerUpAnimation = () => {};

    const name = new TextBlock(`chamberName${index}`, entry.name);
    name.color = 'white';
    name.fontSize = 18;
    name.fontFamily = 'Consolas, monospace';
    name.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    name.paddingLeft = '16px';
    name.top = '-7px';
    row.addControl(name);

    const cube = new TextBlock(`chamberCube${index}`, cubeLabel(entry.cube));
    cube.color = '#8a96a8';
    cube.fontSize = 12;
    cube.fontFamily = 'Consolas, monospace';
    cube.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    cube.paddingLeft = '16px';
    cube.top = '13px';
    row.addControl(cube);

    // The shift count goes under the time, not beside it: a long chamber name and both on one line overflow a phone.
    const status = new TextBlock(
      `chamberStatus${index}`,
      !entry.unlocked ? 'LOCKED' : entry.shifts ? `${entry.best}\n${entry.shifts}` : entry.best,
    );
    status.color = !entry.unlocked ? '#ff9d9d' : entry.completed ? '#9dffb0' : '#aab8cc';
    status.fontSize = 15;
    status.fontFamily = 'Consolas, monospace';
    status.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
    status.paddingRight = '16px';
    row.addControl(status);

    row.onPointerClickObservable.add(() => this.handlers.onPick(index));
    return row;
  }
}
