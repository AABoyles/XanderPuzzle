import { escapePauses } from '../game/GameState';
import { CHAMBERS } from '../level/chambers/catalog';
import { specFromHash } from '../level/specCodec';
import { isFullscreen, onFullscreenChange, toggleFullscreen } from '../pwa/fullscreen';
import { registerServiceWorker } from '../pwa/register';
import type { App } from './App';
import { advance, pickLevel, setSkin } from './chamberFlow';
import { closeLevelSelect, openLevelSelect } from './menus';

/**
 * The page's own events: the HUD's buttons, pointer lock, clicks and keys outside play, the viewport, and the service
 * worker's update notice. Keys and buttons during play come through `InputManager`, not from here.
 */
export function bindEvents(app: App): void {
  app.hud.onOpenLevelSelect = () => openLevelSelect(app);
  app.hud.onCloseLevelSelect = () => closeLevelSelect(app);
  app.hud.onToggleFullscreen = () => {
    swallowClick();
    void toggleFullscreen();
  };
  app.hud.onPickLevel = (i) => pickLevel(app, i);
  app.hud.onHoverLevel = (i) => app.chamberSelect.highlight(i);

  document.addEventListener('pointerlockchange', () => {
    if (app.touch.active) return;
    if (document.pointerLockElement === app.canvas) app.game.send({ type: 'locked' });
    // Esc (which the browser handles itself) lands here: during play it means pause.
    else app.game.send({ type: 'controlLost' });
  });
  document.addEventListener('pointerlockerror', () => {
    if (app.game.kind !== 'paused') return;
    app.pauseMenu.setHint('The browser would not capture the mouse yet. Try Resume again.');
  });

  /** A GUI button press is followed by a canvas `click`; stop it from also starting play on the title overlay. */
  let clickSwallowed = false;
  function swallowClick(): void {
    clickSwallowed = true;
    setTimeout(() => (clickSwallowed = false), 100);
  }
  app.canvas.addEventListener('click', () => {
    if (clickSwallowed) {
      clickSwallowed = false;
      return;
    }
    if (app.game.kind === 'chamberSelect' || app.game.kind === 'paused') return;
    // A tap on the start overlay begins play without pointer lock.
    if (app.touch.active && app.game.kind === 'title') app.game.send({ type: 'begin' });
    else advance(app);
  });
  window.addEventListener('keydown', (e) => {
    if (app.game.kind === 'paused') {
      app.input.setLastDevice('keyboard');
      if (e.code === 'ArrowUp' || e.code === 'KeyW') app.pauseMenu.move(-1);
      else if (e.code === 'ArrowDown' || e.code === 'KeyS') app.pauseMenu.move(1);
      else if (e.code === 'ArrowLeft' || e.code === 'KeyA') app.pauseMenu.adjust(-1);
      else if (e.code === 'ArrowRight' || e.code === 'KeyD') app.pauseMenu.adjust(1);
      else if (e.code === 'Enter' || e.code === 'NumpadEnter' || e.code === 'Space') {
        if (!e.repeat) app.pauseMenu.activate();
      } else if (e.code === 'Escape' || e.code === 'Backspace') {
        // The Esc that released the pointer can also arrive here; don't let it close the menu it just opened.
        if (!e.repeat && performance.now() - app.pauseOpenedAt > 400) app.pauseMenu.back();
      }
      e.preventDefault();
      return;
    }
    if (app.game.kind === 'chamberSelect') {
      if (e.code === 'ArrowUp' || e.code === 'KeyW') app.chamberSelect.move(-1);
      else if (e.code === 'ArrowDown' || e.code === 'KeyS') app.chamberSelect.move(1);
      else if (e.code === 'Home') app.chamberSelect.move(-CHAMBERS.length);
      else if (e.code === 'End') app.chamberSelect.move(CHAMBERS.length);
      else if (e.code === 'Enter' || e.code === 'NumpadEnter') pickLevel(app, app.chamberSelect.index);
      else if (e.code === 'Escape' || e.code === 'KeyL' || e.code === 'Backspace') closeLevelSelect(app);
      else if (e.code === 'KeyK') setSkin(app, app.skinIndex + (e.shiftKey ? -1 : 1));
      e.preventDefault();
      return;
    }
    // Esc with no pointer lock to release (e.g. play without a lock) opens the pause menu directly.
    if (e.code === 'Escape' && !e.repeat && escapePauses(app.game.state)) app.game.send({ type: 'pause' });
    if (e.code === 'KeyL') openLevelSelect(app);
    if (e.code === 'KeyK') setSkin(app, app.skinIndex + (e.shiftKey ? -1 : 1));
    if (e.code === 'Enter') advance(app);
  });

  // The canvas must follow every change of viewport: window resize, rotation and entering or leaving fullscreen.
  const resize = () => {
    app.engine.resize();
    app.pauseMenu.refresh();
  };
  window.addEventListener('resize', resize);
  // Pasting a chamber link into a tab that is already open changes only the fragment, which the browser does not
  // reload for: load the page afresh so the link opens its chamber.
  window.addEventListener('hashchange', () => {
    if (specFromHash(location.hash) !== undefined) location.reload();
  });
  window.addEventListener('orientationchange', () => {
    resize();
    setTimeout(resize, 250); // some browsers report the old size until the rotation settles
  });
  try {
    screen.orientation?.addEventListener('change', resize);
  } catch {
    /* Screen Orientation API unavailable */
  }
  onFullscreenChange(() => {
    resize();
    app.hud.setFullscreenState(isFullscreen());
    app.pauseMenu.refresh();
  });

  registerServiceWorker({
    onUpdateReady: (apply) => {
      app.applyUpdate = apply;
      app.hud.setUpdateNotice(true);
      app.pauseMenu.setUpdateReady(true);
    },
  });
}
