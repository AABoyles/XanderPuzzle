# XanderPuzzle — Shiftbound

A browser-based 3D environmental puzzle game built with [Babylon.js](https://www.babylonjs.com/), in the style of *Portal* / *The Talos Principle*.

## The mechanic

You walk around a level with standard FPS controls (WASD + mouse look, Space to jump). Scattered through the environment are **gravity levers**: walk up to one and press **E** to rotate gravity 90° onto a different wall. Whatever was a wall becomes the new floor, and you keep walking — no re-spawning, no menus, just a continuous first-person traversal through a room that keeps reorienting under your feet.

Gravity can point along any of the 6 axis-aligned directions. Every level starts in the orientation natural to its entrance (normal "down") and ends in whatever orientation its exit requires, so a level might use anywhere from zero extra switches (if entrance and exit already agree) up to a chain of them.

The included level, **The Vault**, is a hollow cube room:
- You enter through a floor-level doorway with ordinary downward gravity.
- A lever on the far wall rotates gravity onto that wall, turning it into the new floor.
- A second lever, now reachable from that wall, rotates gravity again onto the wall that has a hole in it.
- Walking across that final floor drops you into the exit chamber through the hole.

## Running it

```bash
npm install
npm run dev
```

Then open the printed local URL, click into the canvas to lock the pointer, and play. `npm run build` produces a static production bundle in `dist/`.

## Project layout

- `src/gravity/GravitySystem.ts` — owns the single "which way is down" axis and notifies listeners when it changes.
- `src/player/PlayerController.ts` — pointer-lock mouse look, WASD/jump input, and a kinematic body whose movement basis, ground checks, and camera orientation all derive from a smoothly-interpolated "up" vector, so a gravity flip reads as a coherent tumble into the new orientation rather than a snap.
- `src/level/Level.ts` — builds "The Vault" out of axis-aligned boxes (walls assembled as picture-frames around doorways/holes) plus an entrance corridor and exit chamber.
- `src/level/GravitySwitch.ts` — the wall-mounted lever interactable.
- `src/ui/HUD.ts` — Babylon GUI overlay: crosshair, interaction prompt, current-gravity indicator, start/win screens.
- `src/main.ts` — scene bootstrap (lighting, skybox, glow layer, render loop, win-condition check).
