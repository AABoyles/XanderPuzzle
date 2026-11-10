import { frameHasInput, mergeFrames } from './InputSource.ts';
import type { InputDevice, InputFrame, InputSource } from './InputSource.ts';

/** Owns the input sources: reads and merges them once per frame and tracks which device was used last. */
export class InputManager {
  /** Called when `lastDevice` changes, so the HUD can switch its prompts. */
  public onDeviceChange: (device: InputDevice) => void = () => {};

  /** Flips vertical look for every device (the invert-Y setting). */
  public invertY = false;

  private device: InputDevice;
  private readonly sources: InputSource[];

  constructor(sources: InputSource[], initialDevice: InputDevice = 'keyboard') {
    this.sources = sources;
    this.device = initialDevice;
  }

  public get lastDevice(): InputDevice {
    return this.device;
  }

  public setLastDevice(device: InputDevice): void {
    if (device === this.device) return;
    this.device = device;
    this.onDeviceChange(device);
  }

  /**
   * Reads every source once, consuming look deltas and button edges, and returns the merged frame. Call this once
   * per frame and pass the result on, so nothing is consumed twice. If the current device is idle and another one
   * is in use, the other becomes `lastDevice`.
   */
  public read(dt: number): InputFrame {
    const frames = this.sources.map((s) => s.read(dt));
    if (!this.sources.some((s, i) => s.device === this.device && frameHasInput(frames[i]))) {
      const i = frames.findIndex(frameHasInput);
      if (i >= 0) this.setLastDevice(this.sources[i].device);
    }
    const merged = mergeFrames(frames);
    if (this.invertY) merged.lookY = -merged.lookY;
    return merged;
  }

  /** Throws away pending look deltas and button edges without changing `lastDevice`. */
  public drain(): void {
    for (const s of this.sources) s.read(0);
  }

  public dispose(): void {
    for (const s of this.sources) s.dispose();
  }
}
