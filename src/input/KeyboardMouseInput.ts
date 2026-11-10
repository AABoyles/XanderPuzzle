import { InputFrame, InputSource } from './InputSource';

const MOUSE_SENSITIVITY = 0.0022;

/** WASD + Shift + Space + E, and mouse look while the pointer is locked to the canvas. */
export class KeyboardMouseInput implements InputSource {
  /** While true (e.g. a menu is open), clicking the canvas doesn't grab the pointer. */
  public pointerLockSuspended = false;

  private readonly keys = new Set<string>();
  private jumpQueued = false;
  private interactQueued = false;
  private mouseDX = 0;
  private mouseDY = 0;

  private readonly onKeyDown = (e: KeyboardEvent) => {
    this.keys.add(e.code);
    if (e.code === 'Space') this.jumpQueued = true;
    if (e.code === 'KeyE') this.interactQueued = true;
  };
  private readonly onKeyUp = (e: KeyboardEvent) => this.keys.delete(e.code);
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
    document.addEventListener('mousemove', this.onMouseMove);
    canvas.addEventListener('click', this.onCanvasClick);
  }

  public get isPointerLocked(): boolean {
    return document.pointerLockElement === this.canvas;
  }

  public read(): InputFrame {
    const k = this.keys;
    const locked = this.isPointerLocked;
    const frame: InputFrame = {
      moveX: (k.has('KeyD') ? 1 : 0) - (k.has('KeyA') ? 1 : 0),
      moveZ: (k.has('KeyW') ? 1 : 0) - (k.has('KeyS') ? 1 : 0),
      lookX: locked ? this.mouseDX * MOUSE_SENSITIVITY : 0,
      lookY: locked ? this.mouseDY * MOUSE_SENSITIVITY : 0,
      sprint: k.has('ShiftLeft'),
      jump: this.jumpQueued,
      interact: this.interactQueued,
    };
    this.mouseDX = 0;
    this.mouseDY = 0;
    this.jumpQueued = false;
    this.interactQueued = false;
    return frame;
  }

  public dispose(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    document.removeEventListener('mousemove', this.onMouseMove);
    this.canvas.removeEventListener('click', this.onCanvasClick);
  }
}
