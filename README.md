# XanderPuzzle — Shiftbound

A browser-based 3D environmental puzzle game built with [Babylon.js](https://www.babylonjs.com/), in the style of *Portal* / *The Talos Principle*.

## The mechanic

You walk around a level with standard FPS controls (WASD + mouse look, Space to jump; on a phone or tablet, on-screen touch controls). Scattered through the environment are **gravity levers**: walk up to one and press **E** to rotate gravity 90° onto a different wall. Whatever was a wall becomes the new floor, and you keep walking — no re-spawning, no menus, just a continuous first-person traversal through a room that keeps reorienting under your feet.

Gravity can point along any of the 6 axis-aligned directions. Every level starts in the orientation natural to its entrance (normal "down") and ends in whatever orientation its exit requires, so a level might use anywhere from zero extra switches (if entrance and exit already agree) up to a chain of them.

### Touch controls

On touch devices the controls appear automatically (desktop is unchanged); play in landscape.

- **Left half:** drag to move (a floating joystick appears under your thumb).
- **Right half:** drag to look.
- **JUMP** and **USE** (bottom right; USE lights up when a lever is in reach), **RUN** (toggle, bottom left).
- **↻** restarts the chamber, **☰** opens the chamber select and **⏸** opens the pause menu (top right).

### Gamepad controls

Any standard-mapping controller works; no pointer lock is needed. Press **A** or **Start** to begin.

- **Left stick** moves, **right stick** looks, **LT** (or pressing the left stick) runs.
- **A** jumps, **X** uses a lever, **Y** restarts the chamber.
- **Start** pauses and resumes (in the menu: D-pad or left stick to choose, left/right to adjust, **A** to select, **B** to go back), **Back/Select** opens the chamber select (D-pad or left stick to choose, **A** to play, **B** to go back).
- **A** also advances from the win screen. On-screen prompts follow whichever device you used last.

### Pause menu and settings

**Esc** pauses (the browser releases the mouse, and the pause menu opens); everything freezes until you resume. On a gamepad press **Start**, on a touch device tap **⏸**. The menu has Resume, Restart chamber, Chamber select, Fullscreen (where the browser allows it), Settings and a Controls reference, which opens on the device you used last. Use the mouse, arrows/WASD with Enter, the gamepad, or touch. Resume and Enter capture the mouse again; if the browser refuses just after Esc, the menu stays open so you can try again.

Settings apply immediately and are remembered in `localStorage` (`shiftbound.settings`; defaults are used if storage is unavailable): mouse sensitivity, touch look sensitivity and gamepad look speed (25%-300%), invert Y (all devices), master volume and mute, reduced motion (saved for the upcoming motion effects), and field of view (50-100 degrees; the default is the original view).

### Install and play offline

Shiftbound is an installable web app that works offline after the first visit.

- **Chrome / Edge (desktop and Android):** use the browser's *Install app* option (address bar icon or menu).
- **iPhone / iPad:** in Safari tap *Share*, then *Add to Home Screen*. iOS Safari has no fullscreen button, so this is how to get fullscreen there.
- **Offline:** once loaded, the game is cached and starts without a connection.
- **Updates:** a new version is picked up on the next launch, or choose *Update and reload* in the pause menu when the "Update available" notice appears. It never reloads mid-chamber; between chambers it installs on its own.
- **Fullscreen:** a button on the start screen (touch) and an item in the pause menu, which also asks for landscape where the browser supports it.

Fourteen chambers ship with the game, each teaching or testing one idea:

1. **The Vault** (`-Y → +Z → +X`) — a hollow cube; drop through the hole in the final "floor".
2. **The Shaft** (`-Y → +X → +Y`) — a 40-unit vertical shaft whose exit door is at the top, upside down. A hole in the floor opens onto space.
3. **The Divide** (`-Y → +X → +Z`) — a partition too tall to jump, but not too tall to walk around. A hole in the far wall opens onto space.
4. **The Spiral** (`-Y → -X → +Y → +X`) — three shifts, each lever reachable only from the surface the last one put you on. A hole in the west wall opens onto space.
5. **The Chimney** (`-Y → +Z`) — a long tunnel one lever turns into a 60-unit pit; steer mid-fall onto the ledge below the exit door, past a decoy that catches anyone who drops straight down.
6. **The Staircase** (`-Y ↔ +X`, four times) — climb a riser under +X, step off the top, then shift back and walk round a divider before the next.
7. **The Atrium** (`-Y → +X → -Z → -X → +Z → +Y`) — a cube with a room behind four of its faces, each enterable only when that face is the floor.
8. **The Ballast** (`-Y → +X → -Y`) — the first crate: shift gravity and it slides onto the plate that opens the door.
9. **The Counterweight** (`-Y → -X → -Y → +X`) — two crates, two plates; pin one in a pit before seating the other.
10. **The Turnstile** (`-Y → +X → +Y → +Z`) — relative levers, which turn gravity clockwise around their own wall. A hole in the ceiling opens onto space.
11. **The Lockout** (`-Y → -X → +Y`) — a one-shot lever that strands you if you throw it first. A hole in the west wall opens onto space.
12. **The Grate** (`-Y → +X → -Y`) — a crate falls through the grate you stand on.
13. **The Tide** (`-Y → +X → +Z`, on a timer) — a lever starts gravity cycling; be in the right place when each change comes.
14. **The Orrery** (all six) — the finale: a crate, a relative lever and a one-shot lever, leaving through the entrance corridor's ceiling.

Each lever carries an arrow pointing the way "down" will be once it is thrown. White levers with a ring are **relative**: they turn gravity a quarter turn clockwise as you face their wall, so the arrow changes with your orientation. A lever that goes dark after use is **one-shot**. A gold lever with four studs starts a **timed cycle**, with a countdown to the next shift on the HUD. **Shift** runs, **R** restarts the chamber, and clearing one shows your time and number of gravity shifts before moving on.

Some chambers have **trap holes** in their shell. Fall through one and you drop out into open space, towards a planet that always lies the way gravity points; after a few seconds (or on **R**) you are put back at the chamber entrance.

Press **L** (or the button on the start screen, or Back/Select on a gamepad) for the chamber select, which lists every chamber with your best time. You can replay any chamber you've cleared and try the next one; the rest stay locked. Progress and best times are kept in `localStorage`. Add `?unlockall` to the URL to open every chamber for playtesting; if storage is unavailable, everything is unlocked.

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
- `src/input/` — `InputSource` (the shared frame of move/look/jump/use/restart/pause that every device produces, dependency-free and unit-tested), `InputManager` (reads and merges the sources once per frame and tracks the last-used device), `KeyboardMouseInput` (WASD, pointer-lock mouse look), `TouchInput` (on-screen controls) and `GamepadInput` (standard-mapping pads).
- `src/player/PlayerController.ts` — reads and merges the input sources, and drives a kinematic body whose movement basis, ground checks, and camera orientation all derive from a smoothly-interpolated "up" vector, so a gravity flip reads as a coherent tumble into the new orientation rather than a snap.
- `src/level/Builder.ts` — the `Builder` that chambers are written against: `slab` (wall with optional hole), `tube` (corridor/chamber), `box`, `grate`/`glass`/`barrier`, `addSwitch`/`addRelativeSwitch`/`addSequenceSwitch`, `addCrate`/`addPlate`/`addDoor`.
- `src/level/chambers/` — one file per chamber; `index.ts` holds `CHAMBERS`, the play order with each chamber's name (shown in the chamber select). To add a chamber, add a file and list it there.
- `src/physics/boxPhysics.ts` — dependency-free swept axis-aligned box physics used by crates.
- `src/level/Dynamics.ts` — crates, pressure plates, doors, and the per-frame update that ties them together.
- `src/level/GravitySwitch.ts` — the wall-mounted lever interactable: fixed, relative or sequence, optionally one-shot.
- `src/skins/Skin.ts` — the skins: per-axis surface materials, procedural textures, lighting, sky and post-processing.
- `src/ui/HUD.ts` — Babylon GUI overlay: crosshair, interaction prompt, current-gravity indicator, start/win screens.
- `src/ui/PauseMenu.ts` — the pause menu: resume, restart, chamber select, fullscreen, settings and the controls reference.
- `src/settings.ts` — Babylon-free settings model (defaults, limits, parsing, load/save), tested by Node.
- `src/pwa/` — fullscreen helpers, service-worker registration and the offline cache policy.
- `src/main.ts` — scene bootstrap, skin switching, render loop, win-condition check.
- `src/progress.ts` — Babylon-free unlock rule and best-time formatting for the chamber select, tested by Node.
