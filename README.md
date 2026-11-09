# XanderPuzzle — Shiftbound

A browser-based 3D environmental puzzle game built with [Babylon.js](https://www.babylonjs.com/), in the style of *Portal* / *The Talos Principle*.

## The mechanic

You walk around a level with standard FPS controls (WASD + mouse look, Space to jump). Scattered through the environment are **gravity levers**: walk up to one and press **E** to rotate gravity 90° onto a different wall. Whatever was a wall becomes the new floor, and you keep walking — no re-spawning, no menus, just a continuous first-person traversal through a room that keeps reorienting under your feet.

Gravity can point along any of the 6 axis-aligned directions. Every level starts in the orientation natural to its entrance (normal "down") and ends in whatever orientation its exit requires, so a level might use anywhere from zero extra switches (if entrance and exit already agree) up to a chain of them.

Four chambers ship with the game, each ending in a different orientation than it starts:

1. **The Vault** (`-Y → +Z → +X`) — a hollow cube; drop through the hole in the final "floor".
2. **The Shaft** (`-Y → +X → +Y`) — a 40-unit vertical shaft whose exit door is at the top, upside down.
3. **The Divide** (`-Y → +X → +Z`) — a partition too tall to jump, but not too tall to walk around.
4. **The Spiral** (`-Y → -X → +Y → +X`) — three shifts, each lever reachable only from the surface the last one put you on.

Each lever carries an arrow pointing the way "down" will be once it is thrown. **Shift** runs, **R** restarts the chamber, and clearing one shows your time and number of gravity shifts before moving on.

## Skins

Press **K** in game to cycle skins (Shift+K goes back), or load with `?skin=axis|monolith|draft|neon`. The choice is remembered.

- **Axis** (default): matte pastel tiles where every surface is the colour of the lever that makes it the floor, so you can plan a route by colour. Soft sun and shadows.
- **Monolith**: board-formed concrete with form-tie holes under a low warm sun, with fog and a vignette.
- **Draft**: ink outlines on drafting paper; floors are clean and walls and ceilings are hatched by orientation.
- **Neon**: the original glowing grid.

Every face of every box is the floor under exactly one gravity axis (the one pointing into it), so `src/skins/Skin.ts` gives each skin one material per axis, plus lighting, sky, fog and lever colours.

## Running it

```bash
npm install
npm run dev
```

Then open the printed local URL, click into the canvas to lock the pointer, and play. `npm run build` produces a static production bundle in `dist/`.

## Crates, plates and doors

The engine supports gravity-driven crates, pressure plates and plate-controlled doors (`Builder.addCrate` / `addPlate` / `addDoor`). No chamber uses them yet; open the dev server with `?sandbox` in the URL for a test room. `npm test` runs the unit tests for the box physics.

## Project layout

- `src/gravity/GravitySystem.ts` — owns the single "which way is down" axis and notifies listeners when it changes.
- `src/player/PlayerController.ts` — pointer-lock mouse look, WASD/jump input, and a kinematic body whose movement basis, ground checks, and camera orientation all derive from a smoothly-interpolated "up" vector, so a gravity flip reads as a coherent tumble into the new orientation rather than a snap.
- `src/level/Level.ts` — data-driven level builders (`LEVELS`) on top of a small `Builder` with `slab` (wall with optional hole), `tube` (corridor/chamber) and `addSwitch` helpers; add a function to `LEVELS` to add a chamber.
- `src/physics/boxPhysics.ts` — dependency-free swept axis-aligned box physics used by crates.
- `src/level/Dynamics.ts` — crates, pressure plates, doors, and the per-frame update that ties them together.
- `src/level/GravitySwitch.ts` — the wall-mounted lever interactable.
- `src/skins/Skin.ts` — the skins: per-axis surface materials, procedural textures, lighting, sky and post-processing.
- `src/ui/HUD.ts` — Babylon GUI overlay: crosshair, interaction prompt, current-gravity indicator, start/win screens.
- `src/main.ts` — scene bootstrap, skin switching, render loop, win-condition check.
