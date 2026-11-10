# XanderPuzzle — Shiftbound

A browser-based 3D environmental puzzle game built with [Babylon.js](https://www.babylonjs.com/), in the style of *Portal* / *The Talos Principle*.

## The mechanic

You walk around a level with standard FPS controls (WASD + mouse look, Space to jump). Scattered through the environment are **gravity levers**: walk up to one and press **E** to rotate gravity 90° onto a different wall. Whatever was a wall becomes the new floor, and you keep walking — no re-spawning, no menus, just a continuous first-person traversal through a room that keeps reorienting under your feet.

Gravity can point along any of the 6 axis-aligned directions. Every level starts in the orientation natural to its entrance (normal "down") and ends in whatever orientation its exit requires, so a level might use anywhere from zero extra switches (if entrance and exit already agree) up to a chain of them.

Fourteen chambers ship with the game, each teaching or testing one idea:

1. **The Vault** (`-Y → +Z → +X`) — a hollow cube; drop through the hole in the final "floor".
2. **The Shaft** (`-Y → +X → +Y`) — a 40-unit vertical shaft whose exit door is at the top, upside down.
3. **The Divide** (`-Y → +X → +Z`) — a partition too tall to jump, but not too tall to walk around.
4. **The Spiral** (`-Y → -X → +Y → +X`) — three shifts, each lever reachable only from the surface the last one put you on.
5. **The Chimney** (`-Y → +Z`) — a long tunnel one lever turns into a 60-unit pit; steer mid-fall onto the ledge below the exit door, past a decoy that catches anyone who drops straight down.
6. **The Staircase** (`-Y ↔ +X`, four times) — climb a riser under +X, step off the top, then shift back and walk round a divider before the next.
7. **The Atrium** (`-Y → +X → -Z → -X → +Z → +Y`) — a cube with a room behind four of its faces, each enterable only when that face is the floor.
8. **The Ballast** (`-Y → +X → -Y`) — the first crate: shift gravity and it slides onto the plate that opens the door.
9. **The Counterweight** (`-Y → -X → -Y → +X`) — two crates, two plates; pin one in a pit before seating the other.
10. **The Turnstile** (`-Y → +X → +Y → +Z`) — relative levers, which turn gravity clockwise around their own wall.
11. **The Lockout** (`-Y → -X → +Y`) — a one-shot lever that strands you if you throw it first.
12. **The Grate** (`-Y → +X → -Y`) — a crate falls through the grate you stand on.
13. **The Tide** (`-Y → +X → +Z`, on a timer) — a lever starts gravity cycling; be in the right place when each change comes.
14. **The Orrery** (all six) — the finale: a crate, a relative lever and a one-shot lever, leaving through the entrance corridor's ceiling.

Each lever carries an arrow pointing the way "down" will be once it is thrown. White levers with a ring are **relative**: they turn gravity a quarter turn clockwise as you face their wall, so the arrow changes with your orientation. A lever that goes dark after use is **one-shot**. A gold lever with four studs starts a **timed cycle**, with a countdown to the next shift on the HUD. **Shift** runs, **R** restarts the chamber, and clearing one shows your time and number of gravity shifts before moving on.

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

Gravity-driven crates, pressure plates and plate-controlled doors (`Builder.addCrate` / `addPlate` / `addDoor`) appear from chamber VIII on. `Builder.grate` (blocks you, not crates), `glass` (see-through, blocks both) and `barrier` (blocks crates, not you) filter who collides with what. Open the dev server with `?sandbox` in the URL for a test room. `npm test` runs the unit tests for the box physics and the gravity-axis maths.

## Project layout

- `src/gravity/GravitySystem.ts` — owns the single "which way is down" axis and notifies listeners when it changes.
- `src/gravity/axes.ts` — dependency-free axis maths (quarter-turn rotation for relative levers) and the timed `GravitySequencer`.
- `src/player/PlayerController.ts` — pointer-lock mouse look, WASD/jump input, and a kinematic body whose movement basis, ground checks, and camera orientation all derive from a smoothly-interpolated "up" vector, so a gravity flip reads as a coherent tumble into the new orientation rather than a snap.
- `src/level/Builder.ts` — the `Builder` that chambers are written against: `slab` (wall with optional hole), `tube` (corridor/chamber), `box`, `grate`/`glass`/`barrier`, `addSwitch`/`addRelativeSwitch`/`addSequenceSwitch`, `addCrate`/`addPlate`/`addDoor`.
- `src/level/chambers/` — one file per chamber; `index.ts` holds `LEVELS`, the play order. To add a chamber, add a file and list it there.
- `src/physics/boxPhysics.ts` — dependency-free swept axis-aligned box physics used by crates.
- `src/level/Dynamics.ts` — crates, pressure plates, doors, and the per-frame update that ties them together.
- `src/level/GravitySwitch.ts` — the wall-mounted lever interactable: fixed, relative or sequence, optionally one-shot.
- `src/skins/Skin.ts` — the skins: per-axis surface materials, procedural textures, lighting, sky and post-processing.
- `src/ui/HUD.ts` — Babylon GUI overlay: crosshair, interaction prompt, current-gravity indicator, start/win screens.
- `src/main.ts` — scene bootstrap, skin switching, render loop, win-condition check.
