/**
 * Player settings: the model, its limits, and loading/saving. Babylon-free (and free of `localStorage` itself)
 * so Node can test it directly.
 */

export const SETTINGS_KEY = 'shiftbound.settings';
export const SETTINGS_VERSION = 1;

export interface Settings {
  /** Multipliers on each device's base look speed: 1 is the original feel. */
  mouseSensitivity: number;
  touchSensitivity: number;
  gamepadLookSpeed: number;
  /** Flips vertical look on every device. */
  invertY: boolean;
  /** Master volume, 0-100. */
  volume: number;
  /** Music volume, 0-100, under the master volume. */
  musicVolume: number;
  muted: boolean;
  /** Snaps the camera to a new gravity instead of rolling into it (the OS preference also forces this). */
  reducedMotion: boolean;
  /** Vertical field of view in degrees. */
  fov: number;
}

/** The camera's original vertical field of view: exactly 1.0 radian. */
export const DEFAULT_FOV_DEGREES = 180 / Math.PI;

export const DEFAULT_SETTINGS: Readonly<Settings> = {
  mouseSensitivity: 1,
  touchSensitivity: 1,
  gamepadLookSpeed: 1,
  invertY: false,
  volume: 100,
  musicVolume: 60,
  muted: false,
  reducedMotion: false,
  fov: DEFAULT_FOV_DEGREES,
};

export type NumericSetting = 'mouseSensitivity' | 'touchSensitivity' | 'gamepadLookSpeed' | 'volume' | 'musicVolume' | 'fov';

export const LIMITS: Readonly<Record<NumericSetting, { min: number; max: number; step: number }>> = {
  mouseSensitivity: { min: 0.25, max: 3, step: 0.05 },
  touchSensitivity: { min: 0.25, max: 3, step: 0.05 },
  gamepadLookSpeed: { min: 0.25, max: 3, step: 0.05 },
  volume: { min: 0, max: 100, step: 5 },
  musicVolume: { min: 0, max: 100, step: 5 },
  fov: { min: 50, max: 100, step: 1 },
};

const NUMERIC = Object.keys(LIMITS) as NumericSetting[];
const BOOLEAN = ['invertY', 'muted', 'reducedMotion'] as const;

/** A minimal slice of `localStorage`, so tests can fake it. */
export interface SettingsStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

/** Fills in missing or invalid fields with defaults and clamps numbers into range. Ignores unknown fields. */
export function clampSettings(raw: Partial<Record<keyof Settings, unknown>>): Settings {
  const out: Settings = { ...DEFAULT_SETTINGS };
  for (const key of NUMERIC) {
    const v = raw[key];
    if (typeof v === 'number' && Number.isFinite(v)) out[key] = clamp(v, LIMITS[key].min, LIMITS[key].max);
  }
  for (const key of BOOLEAN) {
    const v = raw[key];
    if (typeof v === 'boolean') out[key] = v;
  }
  return out;
}

/** Turns anything (parsed JSON, garbage, null) into valid settings. */
export function parseSettings(raw: unknown): Settings {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return { ...DEFAULT_SETTINGS };
  return clampSettings(raw as Record<string, unknown>);
}

/** Reads settings from storage; unavailable storage, missing or corrupt data all give the defaults. */
export function loadSettings(storage: SettingsStorage | null | undefined): Settings {
  try {
    const text = storage?.getItem(SETTINGS_KEY);
    return parseSettings(text ? JSON.parse(text) : undefined);
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

/** Writes settings; returns false (without throwing) if storage is unavailable or full. */
export function saveSettings(storage: SettingsStorage | null | undefined, settings: Settings): boolean {
  try {
    if (!storage) return false;
    storage.setItem(SETTINGS_KEY, JSON.stringify({ version: SETTINGS_VERSION, ...settings }));
    return true;
  } catch {
    return false;
  }
}

/** Moves a numeric setting one step up or down, staying on the step grid and inside its limits. */
export function stepSetting(settings: Settings, key: NumericSetting, direction: number): Settings {
  const { min, max, step } = LIMITS[key];
  // The default field of view (57.29...) isn't on the grid, so start from the nearest whole degree.
  const base = key === 'fov' ? Math.round(settings[key]) : settings[key];
  const next = Math.round((base + Math.sign(direction) * step) / step) * step;
  return { ...settings, [key]: Math.round(clamp(next, min, max) * 1000) / 1000 };
}

export const fovToRadians = (degrees: number): number => (degrees * Math.PI) / 180;

/** How a numeric setting reads in the menu: multipliers as a percentage, volume as a percentage, FOV in degrees. */
export function formatSetting(key: NumericSetting, value: number): string {
  return key === 'fov' ? `${Math.round(value)}°` : key === 'volume' || key === 'musicVolume' ? `${Math.round(value)}%` : `${Math.round(value * 100)}%`;
}

/** The gain multiplier for sound effects: zero when muted. */
export function masterGain(settings: Settings): number {
  return settings.muted ? 0 : clamp(settings.volume, 0, 100) / 100;
}

/** The gain multiplier for the music: the master gain times the music volume. */
export function musicGain(settings: Settings): number {
  return masterGain(settings) * (clamp(settings.musicVolume, 0, 100) / 100);
}
