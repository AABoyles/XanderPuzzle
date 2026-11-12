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
- **↶** undoes the last gravity shift, **↻** restarts the chamber, **☰** opens the chamber select and **⏸** opens the pause menu (top right).

### Gamepad controls

Any standard-mapping controller works; no pointer lock is needed. Press **A** or **Start** to begin.

- **Left stick** moves, **right stick** looks, **LT** (or pressing the left stick) runs.
- **A** jumps, **X** uses a lever, **Y** restarts the chamber, **B** undoes the last gravity shift (in menus, **B** goes back).
- **Start** pauses and resumes (in the menu: D-pad or left stick to choose, left/right to adjust, **A** to select, **B** to go back), **Back/Select** opens the chamber select (D-pad or left stick to choose, **A** to play, **B** to go back).
- **A** also advances from the win screen. On-screen prompts follow whichever device you used last.

### Pause menu and settings

**Esc** pauses (the browser releases the mouse, and the pause menu opens); everything freezes until you resume. On a gamepad press **Start**, on a touch device tap **⏸**. The menu has Resume, Restart chamber, Chamber select, Fullscreen (where the browser allows it), Settings and a Controls reference, which opens on the device you used last. Use the mouse, arrows/WASD with Enter, the gamepad, or touch. Resume and Enter capture the mouse again; if the browser refuses just after Esc, the menu stays open so you can try again.

Settings apply immediately and are remembered in `localStorage` (`shiftbound.settings`; defaults are used if storage is unavailable): mouse sensitivity, touch look sensitivity and gamepad look speed (25%-300%), invert Y (all devices), master volume and mute, reduced motion (snaps the camera on a gravity shift instead of rolling; also on if the OS asks for reduced motion), a colour-blind palette (swaps the six gravity-axis colours for the Okabe-Ito set, so +X and -X and the other pairs stay distinct), and field of view (50-100 degrees; the default is the original view).

### Install and play offline

Shiftbound is an installable web app that works offline after the first visit.

- **Chrome / Edge (desktop and Android):** use the browser's *Install app* option (address bar icon or menu).
- **iPhone / iPad:** in Safari tap *Share*, then *Add to Home Screen*. iOS Safari has no fullscreen button, so this is how to get fullscreen there.
- **Offline:** once loaded, the game is cached and starts without a connection.
- **Updates:** a new version is picked up on the next launch, or choose *Update and reload* in the pause menu when the "Update available" notice appears. It never reloads mid-chamber; between chambers it installs on its own.
- **Fullscreen:** a button on the start screen (touch) and an item in the pause menu, which also asks for landscape where the browser supports it.

Twenty-one chambers ship with the game, each teaching or testing one idea:

1. **The Vault** (`-Y → +Z → +X`) — a hollow cube; drop through the hole in the final "floor".
2. **The Shaft** (`-Y → +X → +Y`) — a 40-unit vertical shaft whose exit door is at the top, upside down. Partway up the climb a hole in the wall you are walking on opens onto space; walk round it.
3. **The Divide** (`-Y → +X → +Z`) — a partition too tall to jump, but not too tall to walk around. A hole in the far wall opens onto space.
4. **The Spiral** (`-Y → -X → +Y → +X`) — three shifts, each lever reachable only from the surface the last one put you on. A fourth lever leads nowhere: it turns a wall with a hole in it into the floor beneath you.
5. **The Chimney** (`-Y → +Z`) — a long tunnel one lever turns into a 60-unit pit with no bottom; steer mid-fall onto the ledge below the exit door, past a decoy ledge that catches anyone who drops straight down. Miss both and you fall out of the cube.
6. **The Staircase** (`-Y ↔ +X`, three climbs) — climb a riser under +X, step off the top, then shift back and walk round a divider before the next. The last cell swaps its lanes.
7. **The Atrium** (`-Y → +X → -Z → -X → +Z → +Y`, or `-Y → +X → +Z → +Y`) — a cube with a room behind four of its faces, each enterable only when that face is the floor. Room A offers three levers; working back from the exit finds the short way. In a glass cage in one corner a crate slides with every shift, with nothing to do.
8. **The Ballast** (`-Y → +X → -Y`) — the first crate you move: shift gravity and watch it slide the length of the room onto the plate that opens the door.
9. **The Footing** (`-Y → -X → -Y → +X → -Y`) — a window too high to jump to; park the crate under it and use it as a step.
10. **The Stopper** (`-Y → -Z → +X → +Z`) — a crate plugs the way out. Gravity pulls it out easily; the obvious way back drops it straight in again.
11. **The Counterweight** (`-Y → -X → -Y → +X`) — two crates, two plates; pin one in a pit before seating the other.
12. **The Deadman** (`-Y → +X → -Y`) — a gate that only your own weight holds open, for a crate that has to get through it.
13. **The Turnstile** (`-Y → +X → +Y → +Z`) — relative levers, which turn gravity clockwise around their own wall. The wrong turn drops you out through a hole in the start wall.
14. **The Lockout** (`-Y → -X → +Y`) — a one-shot lever that strands you if you throw it first; a burnt-out one by the entrance shows what it becomes. A hole in the west wall opens onto space.
15. **The Grate** (`-Y → +X → -Y`) — a crate falls through the grate you stand on.
16. **The Sieve** (`-Y → +X → +Y → +X → -Y`) — the reverse: a field that stops the crate and lets you through, so the crate has to go over the top.
17. **The Surplus** (`-Y → -X → -Y → +X → -Y`) — one crate too many, and a hole in the cube to throw it out of. Throw out the wrong one and there is no replacement.
18. **The Tide** (`-Y → +X → +Z`, on a timer) — a lever starts gravity cycling; be in the right place when each change comes. Too low on the pillar and the next shift drops you out through the north wall.
19. **The Pendulum** (`-Y → +X → -Y → -X`, on a timer) — the cycle swings a crate back and forth, and the door is open only while the crate holds its plate. A 3-high partition splits the room: when `+X` comes, anything above its top is carried east over it, so wait low on the west side, then climb the dais and steps to the raised door during the `-Y` after it.
20. **The Orrery** (all six) — the finale: a crate, a relative lever and a one-shot lever, leaving through the entrance corridor's ceiling. One lever on the way parks the crate where it can never reach its plate.
21. **The Descent** (`-Y → +X → +Y`) — the epilogue: two one-shot levers and no door. The only way out is a hole in the ceiling, and the fall through it ends the game.

Each lever carries an arrow pointing the way "down" will be once it is thrown. White levers with a ring are **relative**: they turn gravity a quarter turn clockwise as you face their wall, so the arrow changes with your orientation. A lever that goes dark after use is **one-shot**. A gold lever with four studs starts a **timed cycle**, with a countdown to the next shift on the HUD. **Shift** runs, **R** restarts the chamber, **Z** undoes the last gravity shift, and clearing one shows your time and number of gravity shifts before moving on. Each chamber has a **par**, the fewest shifts that clear it, shown beside your count (`PAR 3`); the chamber select records your fewest shifts beside your best time. Timed chambers have no par.

When no lever you have left can turn gravity to the one the exit needs, the facility says so and reminds you of undo and restart. It only checks the levers: it cannot tell when a crate is out of reach of its plate, nor where you can walk.

Some chambers have **trap holes** in their shell, placed where a wrong move puts you: under the lever that leads nowhere, at the bottom of the pit you failed to steer out of. Seen from inside, a hole is pitch black, unless it is in the floor you are standing on: then you can see the planet below. Fall through one and you drop out into open space, past the other cubes of the ballast field, towards a planet that always lies the way gravity points; after a few seconds (or on **R**) a replacement is printed at the chamber entrance, and the facility logs the recovery. Crates fall out of holes too, and a crate that does is gone until the chamber restarts. **Z** takes back the last lever you threw: you and the crates go back to where they were, and burnt-out levers light again, so a wrong throw costs a few seconds rather than the chamber. Repeat it to step back further, up to 32 throws. The clock keeps running, and the Descent's levers cannot be undone.

The story is told by the facility's own log lines and placards, and by the notes an earlier attendant, 416, left on the walls: see [NARRATIVE.md](NARRATIVE.md). In short:

- The cubes are counterweights that hold up the **Crown**, a spoked ring overhead: the coil of a magnetic shield that turns the star's storms away from the planet. About once a minute a storm comes off the star, the ring flares violet and aurora runs round the planet. The title screen shows the cube you are in from outside, with the Crown above it and the planet below; the Vault and the Counterweight have skylights that look up at it.
- You are an **attendant**, printed in the print bay at each chamber's entrance. The lit corridor at each exit is a **reclaimer**, the same machine lit amber: stand on the plate on its bed and you are taken apart there and printed again at the next cube. Fall out of a cube and it prints a replacement, so falling is not a way out.
- A cube out of trim drops off the schedule and its printer stops. The Descent's two levers do exactly that, so the fall out of it is the one nobody is printed back from, and the game ends there: the cube goes dark, and one more light comes up on the planet.

Press **L** (or the button on the start screen, or Back/Select on a gamepad) for the chamber select, which lists every chamber with your best time and, beside it, your fewest shifts against par (`3/3 shifts`). You can replay any chamber you've cleared and try the next one; the rest stay locked. Progress, best times and fewest shifts are kept in `localStorage` (`shiftbound.progress`, keyed by chamber id, so reordering chambers never moves your times; saves from older versions are migrated automatically). Pause menu > Settings > Erase saved progress (press twice to confirm) wipes them. Add `?unlockall` to the URL to open every chamber for playtesting; it never saves progress or resume points. If storage is unavailable, everything is unlocked.

### Playtesting

Add `?playtest` to the URL to record each chamber visit: simulated time, gravity shifts, restarts, falls out of the cube, undos, no-trim notices, and whether the chamber was cleared (with the winning attempt's time and shifts). The log stays in this browser (`localStorage`, `shiftbound.playtest`) and nothing is sent anywhere. Pause menu > Save playtest log downloads it as a JSON file; Clear playtest log (press twice) empties it. It works on the deployed site, so a link with `?playtest` can be sent to a tester, who saves the file and sends it back.

### Sound

A dark drone loops under the whole game. The printer and the reclaimer crack with a coil's spark (the reclaimer's is the printer's played backwards), the hull groans each time the cube turns, ballast masses land with a slam, and a fall starts in silence and fills with rushing air as the planet comes up. Master and music volume are in the pause menu's settings. Every recording is CC0 from OpenGameArt.org, credited in [`public/audio/CREDITS.md`](public/audio/CREDITS.md); the wind is synthesized.

## Skins

Press **K** in game to cycle skins (Shift+K goes back), or load with `?skin=station|axis|monolith|draft|neon`. New players start in Station. The choice is remembered. The colour-blind palette (Pause menu > Settings) recolours the lever and HUD colours in every skin, and the surfaces of Axis and Station, in place of each skin's own; Monolith and Draft keep their neutral surfaces. It rebuilds the chamber in place, like K.

- **Station** (default): the cubes as the machinery they are. Brushed, bolted hull plating under cool work lights; each plate carries a painted band in the colour of the lever that makes that face the floor, and the way out is the lit white corridor.
- **Axis**: matte pastel tiles where every surface is the colour of the lever that makes it the floor, so you can plan a route by colour. Soft sun and shadows.
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

Gravity-driven crates, pressure plates and plate-controlled doors (`Builder.addCrate` / `addPlate` / `addDoor`) appear from chamber VIII on (chamber VII has one in a glass cage, to watch). `Builder.grate` (blocks you, not crates), `glass` (see-through, blocks both) and `barrier` (blocks crates, not you) filter who collides with what. A plate is pressed by crates, or by crates and you; an *inverted* plate is satisfied only while nothing rests on it. Levers that move crates are mounted on low glass screens, so you are looking at the crate when you throw one. Open the dev server with `?sandbox` in the URL for a test room. `npm test` runs the unit tests (box physics, gravity-axis maths, settings, progress and so on) plus headless structural checks that build every chamber under Babylon's `NullEngine` (valid lever axes, spawn and exit placement, a lever route to the exit, crates, doors, clean `dispose()`), and `tests/crateRoutes.test.ts`, which replays each crate chamber's gravity route, and the wrong orders it is built around, on the real crate physics.

`npm run test:e2e` runs the chamber smoke tests (Playwright, headless Chromium with software WebGL) against the Vite dev server, which it starts itself on port 5174; `__debug` exists only in dev builds, so it never uses the production bundle. Run `npx playwright install chromium` once first (add `--with-deps` on a bare Linux box). Each chamber is loaded, checked for browser errors and a grounded spawn, then "solved" by teleporting to each lever in its route and throwing it, and finally to the exit. Walking between levers and to the exit is not tested. On failure, screenshots land in `test-results/` and an HTML report in `playwright-report/` (`npx playwright show-report`); CI uploads both.

## Project layout

- `src/gravity/GravitySystem.ts` — owns the single "which way is down" axis and notifies listeners when it changes.
- `src/gravity/axes.ts` — dependency-free axis maths (quarter-turn rotation for relative levers) and the timed `GravitySequencer`.
- `src/input/` — `InputSource` (the shared frame of move/look/jump/use/restart/pause that every device produces, dependency-free and unit-tested), `InputManager` (reads and merges the sources once per frame and tracks the last-used device), `KeyboardMouseInput` (WASD, pointer-lock mouse look), `TouchInput` (on-screen controls) and `GamepadInput` (standard-mapping pads).
- `src/player/PlayerController.ts` — reads and merges the input sources, and drives a kinematic body whose movement basis, ground checks, and camera orientation all derive from a smoothly-interpolated "up" vector, so a gravity flip reads as a coherent tumble into the new orientation rather than a snap.
- `src/level/Builder.ts` — the `Builder` that chambers are written against: `slab` (wall with optional hole), `tube` (corridor/chamber), `box`, `grate`/`glass`/`barrier`, `addSwitch`/`addRelativeSwitch`/`addSequenceSwitch`, `addCrate`/`addPlate`/`addDoor`, `placard`/`note`. `finish()` adds the attendant printer at the spawn point.
- `src/level/chambers/` — one file per chamber; `index.ts` holds `CHAMBERS`, the play order with each chamber's name (shown in the chamber select). To add a chamber, add a file and list it there.
- `src/physics/boxPhysics.ts` — dependency-free swept axis-aligned box physics used by crates.
- `src/level/Dynamics.ts` — crates, pressure plates, doors, and the per-frame update that ties them together.
- `src/level/GravitySwitch.ts` — the wall-mounted lever interactable: fixed, relative or sequence, optionally one-shot.
- `src/skins/Skin.ts` — the skins: per-axis surface materials, procedural textures, lighting, sky and post-processing.
- `src/ui/HUD.ts` — Babylon GUI overlay: crosshair, interaction prompt, current-gravity indicator, start/win screens, the facility's log line, the print-in and the end card.
- `src/game/GameState.ts` — the game-flow state machine (title, playing, falling, descending, paused, chamber select, won, ended) and its transition table; unit-tested.
- `src/ui/PauseMenu.ts` — the pause menu: resume, restart, chamber select, fullscreen, settings and the controls reference.
- `src/settings.ts` — Babylon-free settings model (defaults, limits, parsing, load/save), tested by Node.
- `src/pwa/` — fullscreen helpers, service-worker registration and the offline cache policy.
- `src/main.ts` — scene bootstrap, skin switching, render loop, win-condition check, and the title's outside view of the cube.
- `src/progress.ts` — Babylon-free versioned, id-keyed progress (unlock rule, best times, fewest shifts, migration, reset), tested by Node.
