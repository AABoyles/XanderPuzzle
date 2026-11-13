import './babylonSideEffects';
import { nextIndex, onSystemMotionChange } from './app/App';
import { applySettings } from './app/applySettings';
import { bindEvents } from './app/bindings';
import { createApp } from './app/bootstrap';
import { installDebugHook } from './app/debugHook';
import { runFrame } from './app/frame';
import { wireMenus } from './app/menus';

/**
 * The entry point. Everything the game is made of is built by `createApp` and held in one `App` object
 * (`src/app/App.ts`); the modules in `src/app/` are functions over it. This file only puts them together, in order.
 */
const app = await createApp();
applySettings(app);
onSystemMotionChange(() => applySettings(app));
// The chamber after this one is fetched while this one is played, so moving on does not wait.
app.chambers.preload(nextIndex(app));
wireMenus(app);
bindEvents(app);
app.engine.runRenderLoop(() => runFrame(app));
// The plain page in `index.html` stays up until the first frame is on the canvas.
app.scene.onAfterRenderObservable.addOnce(() => document.getElementById('boot')?.remove());
if (import.meta.env.DEV) installDebugHook(app);
