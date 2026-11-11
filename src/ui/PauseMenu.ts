import { AdvancedDynamicTexture } from '@babylonjs/gui/2D/advancedDynamicTexture';
import { Button } from '@babylonjs/gui/2D/controls/button';
import { Control } from '@babylonjs/gui/2D/controls/control';
import { Rectangle } from '@babylonjs/gui/2D/controls/rectangle';
import { ScrollViewer } from '@babylonjs/gui/2D/controls/scrollViewers/scrollViewer';
import { StackPanel } from '@babylonjs/gui/2D/controls/stackPanel';
import { TextBlock } from '@babylonjs/gui/2D/controls/textBlock';
import type { InputDevice } from '../input/InputSource';
import { DEFAULT_SETTINGS, formatSetting, stepSetting } from '../settings';
import type { NumericSetting, Settings } from '../settings';

type Page = 'main' | 'settings' | 'controls';

/** `button` runs on activate; `slider` and `toggle` also respond to left/right; `info` and `text` are not focusable. */
interface Row {
  kind: 'button' | 'slider' | 'toggle' | 'info' | 'text';
  label: string;
  /** The current value shown at the right of the row (live, so it can be refreshed in place). */
  value?: () => string;
  run?: () => void;
  adjust?: (direction: number) => void;
  /** Body text of a `text` row. */
  lines?: string[];
}

/** What the fullscreen row should do on this device. */
export interface FullscreenState {
  kind: 'toggle' | 'hint' | 'none';
  on: boolean;
}

const ROW_HEIGHT = 52;
const ROW_GAP = 8;
const BUTTON_SIZE = 44;
const MONO = 'Consolas, monospace';

const CONTROLS: Record<InputDevice, string[]> = {
  keyboard: [
    'Move            W A S D',
    'Look            Mouse (click to capture it)',
    'Jump            Space',
    'Run             Left Shift',
    'Use lever       E',
    'Restart         R',
    'Pause           Esc',
    'Chamber select  L',
    'Cycle skin      K (Shift+K back)',
    'Next chamber    Enter or click, after a win',
    'In menus        Arrows or WASD move, left/right',
    '                adjust, Enter select',
  ],
  gamepad: [
    'Move            Left stick',
    'Look            Right stick',
    'Run             LT, or press the left stick',
    'Jump            A',
    'Use lever       X',
    'Restart         Y',
    'Pause           Start',
    'Chamber select  Back / Select',
    'Next chamber    A, after a win',
    'In menus        D-pad or left stick move,',
    '                left/right adjust, A select,',
    '                B back',
  ],
  touch: [
    'Move            Drag on the left half',
    'Look            Drag on the right half',
    'Jump            JUMP button',
    'Use lever       USE button',
    'Run             RUN button (toggle)',
    'Restart         ↻ (top right)',
    'Chamber select  ☰ (top right)',
    'Pause           ⏸ (top right)',
    'Next chamber    Tap, after a win',
  ],
};
const TAB_LABEL: Record<InputDevice, string> = { keyboard: 'Keyboard & mouse', gamepad: 'Gamepad', touch: 'Touch' };
const TABS: InputDevice[] = ['keyboard', 'gamepad', 'touch'];
const FOOTER: Record<InputDevice, string> = {
  keyboard: 'Arrows/WASD choose · ←/→ adjust · Enter select · Esc back',
  gamepad: 'D-pad choose · ←/→ adjust · A select · B back · Start resume',
  touch: '',
};

export interface PauseMenuOptions {
  texture: AdvancedDynamicTexture;
  getSettings: () => Settings;
  /** True if the OS asks for reduced motion, which applies whatever the setting says. */
  systemReducedMotion?: () => boolean;
  /** Called with the new settings, and which numeric/boolean field changed (undefined for a full reset). */
  onSettingsChange: (next: Settings, changed?: keyof Settings) => void;
  /** Erases saved progress and best times (the menu asks for confirmation first). */
  onResetProgress?: () => void;
  fullscreen: () => FullscreenState;
  /** False in the sandbox, which has a single room. */
  hasChamberSelect: boolean;
}

/** The pause menu: Resume, Restart, Chamber select, Fullscreen, Settings and a controls reference. */
export class PauseMenu {
  public onResume: () => void = () => {};
  public onRestart: () => void = () => {};
  public onChambers: () => void = () => {};
  public onToggleFullscreen: () => void = () => {};
  public onUpdate: () => void = () => {};

  private readonly opts: PauseMenuOptions;
  private readonly overlay: Rectangle;
  private readonly title: TextBlock;
  private readonly scroll: ScrollViewer;
  private readonly list: StackPanel;
  private readonly footer: TextBlock;
  private readonly hint: TextBlock;
  private page: Page = 'main';
  private device: InputDevice = 'keyboard';
  private controlsTab: InputDevice = 'keyboard';
  private updateReady = false;
  private rows: Row[] = [];
  private controls: Rectangle[] = [];
  private values: Array<TextBlock | undefined> = [];
  private tops: number[] = [];
  private heights: number[] = [];
  private focus = 0;
  private mainFocus = 0;
  /** The 'Erase saved progress' row has been pressed once and awaits a second press. */
  private confirmErase = false;

  constructor(opts: PauseMenuOptions) {
    this.opts = opts;
    const ui = opts.texture;
    this.overlay = new Rectangle('pauseOverlay');
    this.overlay.width = 1;
    this.overlay.height = 1;
    this.overlay.thickness = 0;
    this.overlay.background = 'rgba(4,6,12,0.96)';
    this.overlay.isVisible = false;
    ui.addControl(this.overlay);

    this.title = new TextBlock('pauseTitle', 'PAUSED');
    this.title.color = 'white';
    this.title.fontSize = 36;
    this.title.fontWeight = 'bold';
    this.title.height = '50px';
    this.title.top = '14px';
    this.title.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    this.overlay.addControl(this.title);

    this.scroll = new ScrollViewer('pauseScroll');
    this.scroll.thickness = 0;
    this.scroll.barSize = 10;
    this.scroll.barColor = 'rgba(255,255,255,0.4)';
    this.scroll.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    this.scroll.top = '70px';
    this.overlay.addControl(this.scroll);

    this.list = new StackPanel('pauseList');
    this.list.isVertical = true;
    this.scroll.addControl(this.list);

    this.hint = new TextBlock('pauseHint', '');
    this.hint.color = '#ffd36b';
    this.hint.fontSize = 14;
    this.hint.height = '20px';
    this.hint.top = '-34px';
    this.hint.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
    this.overlay.addControl(this.hint);

    this.footer = new TextBlock('pauseFooter', '');
    this.footer.color = 'rgba(255,255,255,0.65)';
    this.footer.fontSize = 14;
    this.footer.height = '20px';
    this.footer.top = '-10px';
    this.footer.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
    this.overlay.addControl(this.footer);
  }

  public get isOpen(): boolean {
    return this.overlay.isVisible;
  }

  /** Opens on the main page with Resume focused. */
  public open(device: InputDevice): void {
    this.device = device;
    this.controlsTab = device;
    this.page = 'main';
    this.mainFocus = 0;
    this.hint.text = '';
    this.overlay.isVisible = true;
    this.render(0);
  }

  public close(): void {
    this.overlay.isVisible = false;
  }

  public setDevice(device: InputDevice): void {
    this.device = device;
    this.footer.text = FOOTER[device];
  }

  /** Shows or hides the "Update and reload" item. */
  public setUpdateReady(ready: boolean): void {
    this.updateReady = ready;
    if (this.isOpen && this.page === 'main') this.render(this.focus);
  }

  /** A short message above the footer, e.g. when the browser refuses to re-capture the mouse yet. */
  public setHint(text: string): void {
    this.hint.text = text;
  }

  /** Rebuilds the current page, e.g. after the window size or fullscreen state changed. */
  public refresh(): void {
    if (this.isOpen) this.render(this.focus);
  }

  /** Moves focus to the next focusable row in `direction` (-1 up, 1 down). */
  public move(direction: number): void {
    let i = this.focus;
    for (;;) {
      i += Math.sign(direction);
      if (i < 0 || i >= this.rows.length) return;
      if (this.focusable(i)) break;
    }
    this.setFocus(i);
  }

  /** Left/right on a slider or toggle. */
  public adjust(direction: number): void {
    const row = this.rows[this.focus];
    if (!row?.adjust) return;
    row.adjust(direction);
    this.updateValues();
  }

  /** Enter / A / tap on the focused row. */
  public activate(): void {
    const row = this.rows[this.focus];
    if (row?.kind === 'toggle') this.adjust(1);
    else row?.run?.();
  }

  /** Esc / B: up one page, or resume from the main page. */
  public back(): void {
    if (this.page === 'main') this.onResume();
    else this.goto('main');
  }

  // --- Pages ---------------------------------------------------------------------------------------

  private goto(page: Page): void {
    if (this.page === 'main') this.mainFocus = this.focus;
    this.page = page;
    this.confirmErase = false;
    if (page === 'controls') this.controlsTab = this.device;
    this.render(page === 'main' ? this.mainFocus : 0);
  }

  private build(): Row[] {
    if (this.page === 'settings') return this.settingsRows();
    if (this.page === 'controls') return this.controlsRows();
    const rows: Row[] = [{ kind: 'button', label: 'Resume', run: () => this.onResume() }];
    if (this.updateReady) rows.push({ kind: 'button', label: 'Update and reload', run: () => this.onUpdate() });
    rows.push({ kind: 'button', label: 'Restart chamber', run: () => this.onRestart() });
    if (this.opts.hasChamberSelect) rows.push({ kind: 'button', label: 'Chamber select', run: () => this.onChambers() });
    const fs = this.opts.fullscreen();
    if (fs.kind === 'toggle') {
      rows.push({
        kind: 'toggle',
        label: 'Fullscreen',
        value: () => (this.opts.fullscreen().on ? 'ON' : 'OFF'),
        run: () => this.onToggleFullscreen(),
        adjust: () => this.onToggleFullscreen(),
      });
    } else if (fs.kind === 'hint') {
      rows.push({ kind: 'info', label: 'Add to Home Screen for fullscreen' });
    }
    rows.push({ kind: 'button', label: 'Settings', run: () => this.goto('settings') });
    rows.push({ kind: 'button', label: 'Controls', run: () => this.goto('controls') });
    return rows;
  }

  private slider(label: string, key: NumericSetting): Row {
    return {
      kind: 'slider',
      label,
      value: () => formatSetting(key, this.opts.getSettings()[key]),
      adjust: (dir) => this.opts.onSettingsChange(stepSetting(this.opts.getSettings(), key, dir), key),
    };
  }

  private toggle(label: string, key: 'invertY' | 'muted' | 'reducedMotion'): Row {
    return {
      kind: 'toggle',
      label,
      value: () => (this.opts.getSettings()[key] ? 'ON' : 'OFF'),
      adjust: () => this.opts.onSettingsChange({ ...this.opts.getSettings(), [key]: !this.opts.getSettings()[key] }, key),
    };
  }

  private reducedMotionRow(): Row {
    const on = () => this.opts.getSettings().reducedMotion;
    return {
      kind: 'toggle',
      label: 'Reduced motion',
      value: () => (on() ? 'ON' : this.opts.systemReducedMotion?.() ? 'ON (system)' : 'OFF'),
      adjust: () => this.opts.onSettingsChange({ ...this.opts.getSettings(), reducedMotion: !on() }, 'reducedMotion'),
    };
  }

  private settingsRows(): Row[] {
    return [
      this.slider('Mouse sensitivity', 'mouseSensitivity'),
      this.slider('Touch look sensitivity', 'touchSensitivity'),
      this.slider('Gamepad look speed', 'gamepadLookSpeed'),
      this.toggle('Invert Y', 'invertY'),
      this.slider('Master volume', 'volume'),
      this.slider('Music volume', 'musicVolume'),
      this.toggle('Mute', 'muted'),
      this.reducedMotionRow(),
      this.slider('Field of view', 'fov'),
      {
        kind: 'button',
        label: 'Reset to defaults',
        run: () => {
          this.opts.onSettingsChange({ ...DEFAULT_SETTINGS });
          this.updateValues();
        },
      },
      ...this.eraseRows(),
      { kind: 'button', label: 'Back', run: () => this.goto('main') },
    ];
  }

  /** Erasing needs two presses; moving focus or leaving the page cancels. */
  private eraseRows(): Row[] {
    if (!this.opts.hasChamberSelect || !this.opts.onResetProgress) return [];
    return [
      {
        kind: 'button',
        label: 'Erase saved progress',
        value: () => (this.confirmErase ? 'PRESS AGAIN' : ''),
        run: () => {
          if (this.confirmErase) {
            this.confirmErase = false;
            this.opts.onResetProgress?.();
          } else this.confirmErase = true;
          this.updateValues();
        },
      },
    ];
  }

  private controlsRows(): Row[] {
    const rows: Row[] = TABS.map((tab) => ({
      kind: 'button' as const,
      label: TAB_LABEL[tab],
      value: () => (this.controlsTab === tab ? '●' : ''),
      run: () => {
        this.controlsTab = tab;
        this.render(this.focus);
      },
    }));
    rows.push({ kind: 'text', label: '', lines: CONTROLS[this.controlsTab] });
    rows.push({ kind: 'button', label: 'Back', run: () => this.goto('main') });
    return rows;
  }

  // --- Rendering ------------------------------------------------------------------------------------

  private focusable(i: number): boolean {
    const kind = this.rows[i]?.kind;
    return kind === 'button' || kind === 'slider' || kind === 'toggle';
  }

  private render(focus: number): void {
    for (const c of this.controls) c.dispose();
    this.list.clearControls();
    this.title.text = this.page === 'settings' ? 'SETTINGS' : this.page === 'controls' ? 'CONTROLS' : 'PAUSED';
    this.footer.text = FOOTER[this.device];
    this.rows = this.build();
    const size = this.opts.texture.getSize();
    const width = Math.max(240, Math.min(560, size.width - 32));
    this.controls = [];
    this.values = [];
    this.tops = [];
    this.heights = [];
    let total = 0;
    this.rows.forEach((row, i) => {
      const control = row.kind === 'text' ? this.textRow(row, width) : this.buttonRow(row, i);
      const height = row.kind === 'text' ? parseFloat(String(control.height)) : ROW_HEIGHT + ROW_GAP;
      this.tops.push(total);
      this.heights.push(height);
      total += height;
      this.controls.push(control);
      this.list.addControl(control);
    });
    this.list.width = `${width - 14}px`;
    this.scroll.width = `${width}px`;
    this.scroll.height = `${Math.max(ROW_HEIGHT, Math.min(total, size.height - 140))}px`;
    this.scroll.verticalBar.value = 0;
    if (!this.focusable(focus)) focus = this.rows.findIndex((_, i) => this.focusable(i));
    this.setFocus(Math.max(0, focus));
  }

  private buttonRow(row: Row, index: number): Button {
    const interactive = row.kind !== 'info';
    const b = new Button(`pause${index}`);
    b.height = `${ROW_HEIGHT + ROW_GAP}px`;
    b.paddingTop = `${ROW_GAP / 2}px`;
    b.paddingBottom = `${ROW_GAP / 2}px`;
    b.cornerRadius = 6;
    b.alpha = interactive ? 1 : 0.7;
    b.isHitTestVisible = interactive;
    b.hoverCursor = 'pointer';
    b.pointerEnterAnimation = () => interactive && this.setFocus(index);
    b.pointerOutAnimation = () => {};
    b.pointerDownAnimation = () => {};
    b.pointerUpAnimation = () => {};

    const label = new TextBlock(`pauseLabel${index}`, row.label);
    label.color = 'white';
    label.fontSize = 18;
    label.fontFamily = MONO;
    label.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    label.paddingLeft = '16px';
    b.addControl(label);

    if (row.kind === 'info') {
      label.color = '#ffd36b';
      label.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
      label.paddingLeft = '0px';
      label.fontSize = 15;
    }
    if (row.value) {
      const value = new TextBlock(`pauseValue${index}`, row.value());
      value.color = '#9dd0ff';
      value.fontSize = 16;
      value.fontFamily = MONO;
      if (row.kind === 'slider') {
        // Sits between the two steppers.
        value.width = '62px';
        value.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
        value.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        value.left = `-${BUTTON_SIZE + 6}px`;
      } else {
        value.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
        value.paddingRight = '16px';
      }
      this.values[index] = value;
      b.addControl(value);
    }
    if (row.kind === 'slider') {
      // Large touch-sized steppers, so sliders work without a keyboard.
      const step = (name: string, text: string, dir: number, left: string) => {
        const s = Button.CreateSimpleButton(`${name}${index}`, text);
        s.width = `${BUTTON_SIZE}px`;
        s.height = `${BUTTON_SIZE}px`;
        s.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
        s.left = left;
        s.cornerRadius = 6;
        s.color = 'rgba(255,255,255,0.5)';
        s.thickness = 1;
        s.background = 'rgba(40,56,80,0.9)';
        s.fontSize = 22;
        if (s.textBlock) s.textBlock.color = 'white';
        s.onPointerClickObservable.add(() => {
          this.setFocus(index);
          this.adjust(dir);
        });
        b.addControl(s);
      };
      step('pauseDown', '\u2212', -1, `-${BUTTON_SIZE + 6 + 62}px`);
      step('pauseUp', '+', 1, '-6px');
    }
    if (interactive && row.kind !== 'slider') b.onPointerClickObservable.add(() => {
      this.setFocus(index);
      this.activate();
    });
    return b;
  }

  private textRow(row: Row, width: number): Rectangle {
    const lines = row.lines ?? [];
    const charsPerLine = Math.max(12, Math.floor((width - 28) / 8.4));
    const wrapped = lines.reduce((n, l) => n + Math.max(1, Math.ceil(l.length / charsPerLine)), 0);
    const box = new Rectangle('pauseText');
    box.thickness = 0;
    box.height = `${wrapped * 20 + 20}px`;
    const text = new TextBlock('pauseTextBody', lines.join('\n'));
    text.color = '#d8e6ff';
    text.fontSize = 14;
    text.fontFamily = MONO;
    text.textWrapping = true;
    text.lineSpacing = '2px';
    text.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    text.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    text.paddingLeft = '14px';
    text.paddingRight = '14px';
    text.paddingTop = '8px';
    box.addControl(text);
    return box;
  }

  /** Refreshes the value text of every row in place. */
  private updateValues(): void {
    this.rows.forEach((row, i) => {
      const block = this.values[i];
      if (block && row.value) block.text = row.value();
    });
  }

  private setFocus(index: number): void {
    if (this.confirmErase && index !== this.focus) {
      this.confirmErase = false;
      this.updateValues();
    }
    this.focus = index;
    this.rows.forEach((row, i) => {
      if (row.kind === 'text') return;
      const c = this.controls[i];
      const on = i === index && this.focusable(i);
      c.thickness = on ? 2 : 1;
      c.color = on ? '#ffffff' : 'rgba(255,255,255,0.25)';
      c.background = on ? 'rgba(60,80,110,0.9)' : 'rgba(20,28,40,0.8)';
    });
    // Keep the focused row in view.
    const total = this.tops.length ? this.tops[this.tops.length - 1] + this.heights[this.tops.length - 1] : 0;
    const view = parseFloat(String(this.scroll.height));
    if (total > view && this.tops[index] !== undefined) {
      const centre = this.tops[index] + this.heights[index] / 2 - view / 2;
      this.scroll.verticalBar.value = Math.min(Math.max(centre / (total - view), 0), 1);
    }
  }
}
