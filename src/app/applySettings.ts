import { fovToRadians, masterGain, musicGain } from '../settings';
import { reducedMotionActive } from './App';
import type { App } from './App';
import { setSkin } from './chamberFlow';

/** Pushes the current settings into the input sources and the camera. Volume and mute are read by `beep`. */
export function applySettings(app: App): void {
  app.keyboardMouse.lookScale = app.settings.mouseSensitivity;
  app.touch.lookScale = app.settings.touchSensitivity;
  app.gamepad.lookScale = app.settings.gamepadLookSpeed;
  app.input.invertY = app.settings.invertY; // for every device; GamepadInput.invertY stays off so it isn't applied twice
  app.player.camera.fov = fovToRadians(app.settings.fov);
  app.player.reducedMotion = reducedMotionActive(app);
  app.sound.setVolumes(masterGain(app.settings), musicGain(app.settings));
  // The palette is baked into the skin, so changing it rebuilds the chamber the way K does.
  if (app.settings.colorAssist !== app.skinColorAssist) setSkin(app, app.skinIndex);
}
