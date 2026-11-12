import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  clampSettings,
  DEFAULT_SETTINGS,
  fovToRadians,
  LIMITS,
  loadSettings,
  masterGain,
  musicGain,
  parseSettings,
  saveSettings,
  SETTINGS_KEY,
  stepSetting,
} from '../src/settings.ts';
import type { SettingsStorage } from '../src/settings.ts';

const memory = (): SettingsStorage & { data: Map<string, string> } => {
  const data = new Map<string, string>();
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v) };
};

test('default field of view is exactly the original 1.0 radian camera', () => {
  assert.ok(Math.abs(fovToRadians(DEFAULT_SETTINGS.fov) - 1) < 1e-12);
});

test('parseSettings tolerates garbage, missing fields and wrong types', () => {
  for (const raw of [undefined, null, 5, 'x', [], {}]) assert.deepEqual(parseSettings(raw), DEFAULT_SETTINGS);
  const s = parseSettings({ mouseSensitivity: 'fast', invertY: 'yes', volume: 40, extra: 1, fov: NaN });
  assert.equal(s.mouseSensitivity, 1);
  assert.equal(s.invertY, false);
  assert.equal(s.volume, 40);
  assert.equal(s.fov, DEFAULT_SETTINGS.fov);
});

test('the colour-blind palette is off by default and survives save and load', () => {
  assert.equal(DEFAULT_SETTINGS.colorAssist, false);
  assert.equal(parseSettings({ colorAssist: 'yes' }).colorAssist, false);
  assert.equal(parseSettings({ colorAssist: true }).colorAssist, true);
  const store = memory();
  assert.ok(saveSettings(store, { ...DEFAULT_SETTINGS, colorAssist: true }));
  assert.equal(loadSettings(store).colorAssist, true);
});

test('clampSettings keeps numbers inside their limits', () => {
  const s = clampSettings({
    mouseSensitivity: 99,
    touchSensitivity: -1,
    volume: 500,
    fov: 5,
    gamepadLookSpeed: Infinity,
  });
  assert.equal(s.mouseSensitivity, LIMITS.mouseSensitivity.max);
  assert.equal(s.touchSensitivity, LIMITS.touchSensitivity.min);
  assert.equal(s.volume, 100);
  assert.equal(s.fov, LIMITS.fov.min);
  assert.equal(s.gamepadLookSpeed, 1);
});

test('save then load round-trips, and older or partial saves still load', () => {
  const store = memory();
  const s = { ...DEFAULT_SETTINGS, invertY: true, volume: 35, muted: true, mouseSensitivity: 1.5 };
  assert.ok(saveSettings(store, s));
  assert.ok(store.data.has(SETTINGS_KEY));
  assert.deepEqual(loadSettings(store), s);
  store.data.set(SETTINGS_KEY, JSON.stringify({ version: 0, invertY: true }));
  assert.deepEqual(loadSettings(store), { ...DEFAULT_SETTINGS, invertY: true });
});

test('unavailable, throwing or corrupt storage gives defaults without throwing', () => {
  assert.deepEqual(loadSettings(null), DEFAULT_SETTINGS);
  assert.deepEqual(loadSettings(undefined), DEFAULT_SETTINGS);
  const broken: SettingsStorage = {
    getItem() {
      throw new Error('denied');
    },
    setItem() {
      throw new Error('quota');
    },
  };
  assert.deepEqual(loadSettings(broken), DEFAULT_SETTINGS);
  assert.equal(saveSettings(broken, DEFAULT_SETTINGS), false);
  assert.equal(saveSettings(null, DEFAULT_SETTINGS), false);
  const store = memory();
  store.data.set(SETTINGS_KEY, '{not json');
  assert.deepEqual(loadSettings(store), DEFAULT_SETTINGS);
});

test('stepSetting moves one step, snaps FOV to whole degrees and stops at the limits', () => {
  assert.equal(stepSetting(DEFAULT_SETTINGS, 'mouseSensitivity', 1).mouseSensitivity, 1.05);
  assert.equal(stepSetting(DEFAULT_SETTINGS, 'fov', 1).fov, 58);
  assert.equal(stepSetting(DEFAULT_SETTINGS, 'fov', -1).fov, 56);
  assert.equal(stepSetting({ ...DEFAULT_SETTINGS, volume: 100 }, 'volume', 1).volume, 100);
  assert.equal(stepSetting({ ...DEFAULT_SETTINGS, volume: 0 }, 'volume', -1).volume, 0);
  assert.equal(
    stepSetting({ ...DEFAULT_SETTINGS, touchSensitivity: 0.25 }, 'touchSensitivity', -1).touchSensitivity,
    0.25,
  );
});

test('masterGain follows volume and mute', () => {
  assert.equal(masterGain(DEFAULT_SETTINGS), 1);
  assert.equal(masterGain({ ...DEFAULT_SETTINGS, volume: 50 }), 0.5);
  assert.equal(masterGain({ ...DEFAULT_SETTINGS, muted: true }), 0);
});

test('music volume sits under the master volume and the mute', () => {
  assert.equal(DEFAULT_SETTINGS.musicVolume, 60);
  assert.ok(Math.abs(musicGain(DEFAULT_SETTINGS) - 0.6) < 1e-12);
  assert.ok(Math.abs(musicGain({ ...DEFAULT_SETTINGS, volume: 50, musicVolume: 50 }) - 0.25) < 1e-12);
  assert.equal(musicGain({ ...DEFAULT_SETTINGS, muted: true }), 0);
  assert.equal(clampSettings({ musicVolume: 500 }).musicVolume, 100);
  assert.equal(stepSetting(DEFAULT_SETTINGS, 'musicVolume', -1).musicVolume, 55);
});
