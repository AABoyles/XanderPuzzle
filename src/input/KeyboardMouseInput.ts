import { emptyFrame } from './InputSource.ts';
import type { InputDevice, InputFrame, InputSource } from './InputSource.ts';

const MOUSE_SENSITIVITY = 0.0022;

/** WASD + Shift + Space + E + R (restart) + Z (undo), and mouse look while the pointer is locked to the canvas. */
export class KeyboardMouseInput implements InputSource {
  public readonly device: InputDevice = 'keyboard';
  /** While true (e.g. a menu is open), clicking the canvas doesn't grab the pointer. */
  public pointerLockSuspended = false;
  /** Multiplier on mouse look (the sensitivity setting). */
  public lookScale = 1;

  private readonly keys = new Set<string>();
  private jumpQueued = false;
  private interactQueued = false;
  private restartQueued = false;
  private undoQueued = false;
  private mouseDX = 0;
  private mouseDY = 0;

  private readonly onKeyDown = (e: KeyboardEvent) => {
    this.keys.add(e.code);
    if (e.code === 'Space') this.jumpQueued = true;
    if (e.code === 'KeyE') this.interactQueued = true;
    if (e.code === 'KeyR' && !e.repeat) this.restartQueued = true;
    if (e.code === 'KeyZ' && !e.repeat) this.undoQueued = true;
  };
  private readonly onKeyUp = (e: KeyboardEvent) => this.keys.delete(e.code);
  /** Drops held keys and queued presses, so nothing sticks when the window loses focus. */
  private readonly reset = () => {
    this.keys.clear();
    this.jumpQueued = this.interactQueued = this.restartQueued = this.undoQueued = false;
  };
  private readonly onVisibility = () => {
    if (document.hidden) this.reset();
  };
  private readonly onMouseMove = (e: MouseEvent) => {
    if (document.pointerLockElement !== this.canvas) return;
    this.mouseDX += e.movementX;
    this.mouseDY += e.movementY;
  };
  private readonly onCanvasClick = () => {
    if (!this.pointerLockSuspended && document.pointerLockElement !== this.canvas) {
      this.canvas.requestPointerLock();
    }
  };

  constructor(private readonly canvas: HTMLCanvasElement) {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.reset);
    document.addEventListener('visibilitychange', this.onVisibility);
    document.addEventListener('mousemove', this.onMouseMove);
    canvas.addEventListener('click', this.onCanvasClick);
  }

  public get isPointerLocked(): boolean {
    return document.pointerLockElement === this.canvas;
  }

  public read(_dt: number): InputFrame {
    const k = this.keys;
    const locked = this.isPointerLocked;
    const frame: InputFrame = {
      ...emptyFrame(),
      moveX: (k.has('KeyD') ? 1 : 0) - (k.has('KeyA') ? 1 : 0),
      moveZ: (k.has('KeyW') ? 1 : 0) - (k.has('KeyS') ? 1 : 0),
      lookX: locked ? this.mouseDX * MOUSE_SENSITIVITY * this.lookScale : 0,
      lookY: locked ? this.mouseDY * MOUSE_SENSITIVITY * this.lookScale : 0,
      sprint: k.has('ShiftLeft'),
      jump: this.jumpQueued,
      interact: this.interactQueued,
      restart: this.restartQueued,
      undo: this.undoQueued,
    };
    this.mouseDX = 0;
    this.mouseDY = 0;
    this.jumpQueued = false;
    this.interactQueued = false;
    this.restartQueued = false;
    this.undoQueued = false;
    return frame;
  }

  public dispose(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.reset);
    document.removeEventListener('visibilitychange', this.onVisibility);
    document.removeEventListener('mousemove', this.onMouseMove);
    this.canvas.removeEventListener('click', this.onCanvasClick);
  }
}
