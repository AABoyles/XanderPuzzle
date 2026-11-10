/**
 * Maps a gravity shift to a sound, so players can hear which way gravity went. Babylon-free so Node can test it.
 */
import type { GravityAxis } from './axes';

export interface ShiftTone {
  from: number;
  to: number;
  duration: number;
  type: 'sawtooth' | 'triangle' | 'square' | 'sine';
}

/** Base pitch (Hz) per axis: X, Y and Z sit a few semitones apart, and the pair of each axis is a fifth apart. */
const BASE: Record<GravityAxis, number> = {
  '+X': 330,
  '-X': 495,
  '+Y': 392,
  '-Y': 588,
  '+Z': 466,
  '-Z': 699,
};

/** Sweeps up when the new "down" is positive and down when it is negative; pitch is set by the axis. */
export function shiftTone(axis: GravityAxis): ShiftTone {
  const base = BASE[axis];
  const positive = axis[0] === '+';
  return {
    from: positive ? base * 0.6 : base,
    to: positive ? base : base * 0.6,
    duration: 0.35,
    type: axis[1] === 'Y' ? 'sawtooth' : axis[1] === 'X' ? 'triangle' : 'square',
  };
}
