import { emptyFrame, InputFrame, InputSource, stickVector } from './InputSource';

/** Radians of yaw/pitch per pixel dragged on the look zone. */
export const LOOK_SENSITIVITY = 0.005;
const STICK_RADIUS = 56; // px of thumb travel for full tilt
const STICK_DEADZONE = 0.12;

const CSS = `
.sb-touch, .sb-touch * {
  box-sizing: border-box; touch-action: none; user-select: none; -webkit-user-select: none;
  -webkit-touch-callout: none; -webkit-tap-highlight-color: transparent;
}
.sb-touch { position: fixed; inset: 0; z-index: 10; display: none; }
.sb-touch.sb-on { display: block; }
.sb-zone { position: absolute; top: 0; bottom: 0; }
.sb-zone-move { left: 0; width: 50%; }
.sb-zone-look { right: 0; width: 50%; }
.sb-stick {
  position: absolute; width: 112px; height: 112px; margin: -56px 0 0 -56px; border-radius: 50%;
  border: 2px solid rgba(255,255,255,0.4); background: rgba(255,255,255,0.08); display: none; pointer-events: none;
}
.sb-stick.sb-show { display: block; }
.sb-knob {
  position: absolute; left: 50%; top: 50%; width: 52px; height: 52px; margin: -26px 0 0 -26px; border-radius: 50%;
  background: rgba(255,255,255,0.35);
}
.sb-btn {
  position: absolute; display: flex; align-items: center; justify-content: center; border-radius: 50%;
  font: 700 15px/1 Consolas, monospace; color: #fff; background: rgba(20,28,40,0.55);
  border: 2px solid rgba(255,255,255,0.45); letter-spacing: 0.04em;
}
.sb-btn.sb-down { background: rgba(110,140,190,0.7); }
.sb-btn.sb-hot { border-color: #ffd36b; color: #ffd36b; box-shadow: 0 0 14px rgba(255,211,107,0.7); }
.sb-btn.sb-toggled { background: rgba(255,160,51,0.55); border-color: #ffa033; }
.sb-jump { width: 80px; height: 80px; right: calc(24px + env(safe-area-inset-right)); bottom: calc(28px + env(safe-area-inset-bottom)); }
.sb-use { width: 68px; height: 68px; right: calc(116px + env(safe-area-inset-right)); bottom: calc(28px + env(safe-area-inset-bottom)); }
.sb-run { width: 56px; height: 56px; left: calc(24px + env(safe-area-inset-left)); bottom: calc(24px + env(safe-area-inset-bottom)); }
.sb-small {
  top: calc(12px + env(safe-area-inset-top)); width: 48px; height: 48px; font-size: 22px;
}
.sb-restart { right: calc(12px + env(safe-area-inset-right)); }
.sb-chambers { right: calc(68px + env(safe-area-inset-right)); font-size: 18px; }
.sb-rotate {
  display: none; position: absolute; inset: 0; background: rgba(0,0,0,0.88); color: #fff; z-index: 5;
  align-items: center; justify-content: center; text-align: center; padding: 24px; font: 20px system-ui, sans-serif;
}
@media (orientation: portrait) { .sb-touch.sb-on .sb-rotate { display: flex; } }
`;

/** Active pointer on the move or look zone. */
interface Drag {
  kind: 'move' | 'look';
  x: number;
  y: number;
  startX: number;
  startY: number;
}

/** Touch controls: floating move stick (left), drag-to-look (right), JUMP / USE / RUN buttons. */
export class TouchInput implements InputSource {
  /** Fires once, when touch mode is first detected. */
  public onActivate: () => void = () => {};
  public onRestart: () => void = () => {};
  public onChambers: () => void = () => {};

  private isActive = false;
  private visible = false;
  private readonly drags = new Map<number, Drag>();
  private readonly buttonPointers = new Map<number, HTMLElement>();
  private stickX = 0;
  private stickY = 0;
  private lookDX = 0;
  private lookDY = 0;
  private jumpQueued = false;
  private interactQueued = false;
  private sprint = false;

  private readonly style: HTMLStyleElement;
  private readonly root: HTMLDivElement;
  private readonly stick: HTMLDivElement;
  private readonly knob: HTMLDivElement;
  private readonly useBtn: HTMLDivElement;
  private readonly runBtn: HTMLDivElement;
  private readonly disposers: Array<() => void> = [];

  public static isTouchDevice(): boolean {
    return typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
  }

  constructor() {
    this.style = document.createElement('style');
    this.style.textContent = CSS;
    document.head.appendChild(this.style);

    this.root = document.createElement('div');
    this.root.className = 'sb-touch';
    this.root.addEventListener('contextmenu', (e) => e.preventDefault());

    const rotate = this.el('div', 'sb-rotate', 'Rotate your device to landscape to play');
    const moveZone = this.el('div', 'sb-zone sb-zone-move');
    const lookZone = this.el('div', 'sb-zone sb-zone-look');
    this.stick = this.el('div', 'sb-stick');
    this.knob = this.el('div', 'sb-knob');
    this.stick.appendChild(this.knob);
    const jump = this.el('div', 'sb-btn sb-jump', 'JUMP');
    this.useBtn = this.el('div', 'sb-btn sb-use', 'USE');
    this.runBtn = this.el('div', 'sb-btn sb-run', 'RUN');
    const restart = this.el('div', 'sb-btn sb-small sb-restart', '↻');
    const chambers = this.el('div', 'sb-btn sb-small sb-chambers', '☰');
    this.root.append(moveZone, lookZone, this.stick, jump, this.useBtn, this.runBtn, restart, chambers, rotate);
    document.body.appendChild(this.root);

    this.zone(moveZone, 'move');
    this.zone(lookZone, 'look');
    this.button(jump, () => (this.jumpQueued = true));
    this.button(this.useBtn, () => (this.interactQueued = true));
    this.button(this.runBtn, () => {
      this.sprint = !this.sprint;
      this.runBtn.classList.toggle('sb-toggled', this.sprint);
    });
    this.button(restart, () => this.onRestart());
    this.button(chambers, () => this.onChambers());

    const cancel = (e: PointerEvent) => this.release(e.pointerId);
    this.listen(window, 'pointerup', cancel as EventListener);
    this.listen(window, 'pointercancel', cancel as EventListener);
    this.listen(window, 'blur', () => this.reset());
    this.listen(document, 'contextmenu', ((e: Event) => {
      if (this.isActive) e.preventDefault();
    }) as EventListener);
    this.listen(window, 'pointermove', ((e: PointerEvent) => this.move(e)) as EventListener);

    if (TouchInput.isTouchDevice()) this.activate();
    else {
      this.listen(window, 'pointerdown', ((e: PointerEvent) => {
        if (e.pointerType === 'touch') this.activate();
      }) as EventListener, true);
    }
  }

  /** True once touch mode has been detected. */
  public get active(): boolean {
    return this.isActive;
  }

  /** Shows or hides the controls. Hiding releases every held pointer and button. */
  public setVisible(visible: boolean): void {
    const show = visible && this.isActive;
    if (show === this.visible) return;
    this.visible = show;
    this.root.classList.toggle('sb-on', show);
    if (!show) this.reset();
  }

  /** Highlights USE while a lever is in range. */
  public setInteractAvailable(available: boolean): void {
    this.useBtn.classList.toggle('sb-hot', available);
  }

  public read(): InputFrame {
    const f = emptyFrame();
    f.moveX = this.stickX;
    f.moveZ = this.stickY;
    f.lookX = this.lookDX * LOOK_SENSITIVITY;
    f.lookY = this.lookDY * LOOK_SENSITIVITY;
    f.sprint = this.sprint;
    f.jump = this.jumpQueued;
    f.interact = this.interactQueued;
    this.lookDX = this.lookDY = 0;
    this.jumpQueued = this.interactQueued = false;
    return f;
  }

  public dispose(): void {
    for (const off of this.disposers) off();
    this.disposers.length = 0;
    this.root.remove();
    this.style.remove();
  }

  private activate(): void {
    if (this.isActive) return;
    this.isActive = true;
    this.onActivate();
  }

  private el<K extends keyof HTMLElementTagNameMap>(tag: K, cls: string, text = ''): HTMLElementTagNameMap[K] {
    const e = document.createElement(tag);
    e.className = cls;
    if (text) e.textContent = text;
    return e;
  }

  private listen(target: EventTarget, type: string, fn: EventListener, capture = false): void {
    target.addEventListener(type, fn, capture);
    this.disposers.push(() => target.removeEventListener(type, fn, capture));
  }

  private zone(zone: HTMLElement, kind: 'move' | 'look'): void {
    zone.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse') return;
      e.preventDefault();
      zone.setPointerCapture(e.pointerId);
      this.drags.set(e.pointerId, { kind, x: e.clientX, y: e.clientY, startX: e.clientX, startY: e.clientY });
      if (kind === 'move') {
        this.stick.style.left = `${e.clientX}px`;
        this.stick.style.top = `${e.clientY}px`;
        this.stick.classList.add('sb-show');
        this.updateStick(0, 0);
      }
    });
  }

  private button(btn: HTMLElement, onPress: () => void): void {
    btn.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse') return;
      e.preventDefault();
      e.stopPropagation();
      btn.setPointerCapture(e.pointerId);
      this.buttonPointers.set(e.pointerId, btn);
      btn.classList.add('sb-down');
      onPress();
    });
  }

  private move(e: PointerEvent): void {
    const d = this.drags.get(e.pointerId);
    if (!d) return;
    if (d.kind === 'look') {
      this.lookDX += e.clientX - d.x;
      this.lookDY += e.clientY - d.y;
      d.x = e.clientX;
      d.y = e.clientY;
    } else {
      this.updateStick(e.clientX - d.startX, e.clientY - d.startY);
    }
  }

  private updateStick(dx: number, dy: number): void {
    const v = stickVector(dx, dy, STICK_RADIUS, STICK_DEADZONE);
    this.stickX = v.x;
    this.stickY = v.y;
    const len = Math.min(Math.hypot(dx, dy), STICK_RADIUS);
    const angle = Math.atan2(dy, dx);
    this.knob.style.transform = `translate(${Math.cos(angle) * len}px, ${Math.sin(angle) * len}px)`;
  }

  private release(pointerId: number): void {
    const d = this.drags.get(pointerId);
    if (d) {
      this.drags.delete(pointerId);
      if (d.kind === 'move') this.endStick();
    }
    const btn = this.buttonPointers.get(pointerId);
    if (btn) {
      this.buttonPointers.delete(pointerId);
      btn.classList.remove('sb-down');
    }
  }

  private endStick(): void {
    this.stickX = this.stickY = 0;
    this.stick.classList.remove('sb-show');
  }

  /** Drops every held pointer and pending input. */
  private reset(): void {
    this.drags.clear();
    for (const btn of this.buttonPointers.values()) btn.classList.remove('sb-down');
    this.buttonPointers.clear();
    this.endStick();
    this.lookDX = this.lookDY = 0;
    this.jumpQueued = this.interactQueued = false;
    this.sprint = false;
    this.runBtn.classList.remove('sb-toggled');
  }
}
