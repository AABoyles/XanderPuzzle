// Loads the game's Babylon-dependent code under Node. Call `await setupHeadless()` before importing from src/.
import { register } from 'node:module';

let done = false;

export function setupHeadless(): void {
  if (done) return;
  done = true;
  register('./hooks.mjs', import.meta.url);
  // Skins paint procedural textures on an OffscreenCanvas (via DynamicTexture). There is no DOM here, so give them a
  // canvas whose 2D context accepts every call and draws nothing. Textures stay blank; structure is all we test.
  const noop = new Proxy(function () {}, {
    get: (_t, prop) => (prop === 'canvas' ? undefined : prop === Symbol.toPrimitive ? () => 0 : noop),
    set: () => true,
    apply: () => noop,
  });
  (globalThis as any).OffscreenCanvas = class {
    width: number;
    height: number;
    constructor(w: number, h: number) {
      this.width = w;
      this.height = h;
    }
    getContext() {
      return noop;
    }
  };
}
