# AGENTS.md

Guidance for coding agents working in this repo. Read `README.md` for the game itself and `ROADMAP.md` for planned chambers and engine work.

## What this is

**Shiftbound** (repo: XanderPuzzle): a browser-based first-person gravity-puzzle game in TypeScript on Babylon.js 7, bundled with Vite. Levers rotate gravity onto one of six axis-aligned directions (`'+X' | '-X' | '+Y' | '-Y' | '+Z' | '-Z'`). There is no backend; the build is a static bundle deployed to GitHub Pages.

## Commands

```bash
npm install
npm run dev       # Vite dev server on :5173 (host: true)
npm run build     # tsc -b && vite build -> dist/
npm test          # node --experimental-strip-types --test tests/*.test.ts (Node 22.6+)
npx tsc -b        # typecheck only
```

Before you call a change done, run `npx tsc -b` and `npm test`. CI (`.github/workflows/test.yml`) runs exactly these on every PR and push to `main`, and the job name `Unit tests` is a required status check, so don't rename it. `build.yml` deploys `dist/` to Pages on push to `main`.

There is no linter or formatter. Match the existing style: 2-space indent, single quotes, semicolons, lines up to about 120 characters, `strict` TypeScript.

## Layout

- `src/main.ts`: scene bootstrap, level loading and progression, skin switching, render loop, win check, `localStorage` persistence (keys prefixed `shiftbound.`). Progress lives in `src/progress.ts` (`shiftbound.progress`, keyed by each chamber's stable `id` in `CHAMBERS`; never change or reuse an id). `?unlockall` must never write progress.
- `src/gravity/GravitySystem.ts`: the single current gravity axis and its change listeners.
- `src/input/`: `InputSource.ts` is the Babylon-free input interface (`InputFrame`, `mergeFrames`, `stickVector`, deadzone/look-curve maths) and `InputManager.ts` reads and merges the sources once per frame and tracks the last-used device (`lastDevice`, which drives HUD wording); both are tested by Node like `boxPhysics.ts` (import with explicit `.ts` extensions and no constructor parameter properties). `KeyboardMouseInput.ts`, `TouchInput.ts` and `GamepadInput.ts` implement `InputSource`; `main.ts` reads the manager once per frame and passes the frame to `PlayerController.update`.
- `src/player/PlayerController.ts`: merges the input sources' frames and drives a kinematic body oriented by a smoothly interpolated "up" vector.
- `src/level/Builder.ts`: the API chambers are written against (`box`, `slab`, `tube`, `grate`, `glass`, `barrier`, `addSwitch` (with `{ once }`), `addRelativeSwitch`, `addSequenceSwitch`, `addCrate`, `addPlate`, `addDoor`, `finish`), plus `V()` and the wall thickness `T`.
- `src/gravity/axes.ts`: Babylon-free axis maths and the `GravitySequencer`; tested directly by Node like `boxPhysics.ts`.
- `src/level/chambers/`: one file per chamber. `index.ts` exports `CHAMBERS` (the play order, each with the name shown in the chamber select), `LEVELS` and `buildSandbox`.
- `src/level/Dynamics.ts`: crates, pressure plates, doors and their per-frame update.
- `src/level/GravitySwitch.ts`: the lever interactable.
- `src/physics/boxPhysics.ts`: swept AABB physics for crates. It must stay free of Babylon imports so Node can test it directly.
- `src/environment/`: what lies outside a chamber. `fall.ts` is the Babylon-free escape/fall maths (level bounds, `FallTracker`, planet distance), tested by Node like `boxPhysics.ts`; `SpaceBackdrop.ts` draws the stars, planet and speed streaks, visible only after an escape.
- `src/skins/Skin.ts`: the skins (`axis`, `monolith`, `draft`, `neon`): per-axis materials, lighting, sky, post-processing.
- `src/ui/HUD.ts`: Babylon GUI overlay.
- `src/ui/PauseMenu.ts`: the pause menu (resume, restart, chamber select, fullscreen, update, settings, controls reference); added on top of the HUD's GUI texture. Keep its controls reference in sync with the real bindings.
- `src/time.ts`: Babylon-free `simDelta`, the one clamped frame delta (`MAX_SIM_DELTA` = 1/20 s) that `main.ts` feeds every system; tested by Node.
- `src/gravity/shiftSound.ts`: Babylon-free axis -> shift-sound mapping (`shiftTone`); tested by Node.
- `src/settings.ts`: Babylon-free settings model (`Settings`, defaults, limits, `parseSettings`/`loadSettings`/`saveSettings`, `stepSetting`), stored as JSON under `shiftbound.settings`; tested by Node.
- `src/pwa/`: `cachePolicy.ts` Babylon-free cache naming/strategy tested by Node; `sw.template.js` service worker source that `build/pwaPlugin.ts` fills with the precache list to emit `dist/sw.js`; `register.ts` production-only registration and update flow; `fullscreen.ts` fullscreen/standalone/orientation helpers.
- `tests/`: `node:test` unit tests. They import source with explicit `.ts` extensions (`../src/physics/boxPhysics.ts`).

## Adding or changing a chamber

1. Create `src/level/chambers/<name>.ts` exporting `build<Name>(scene, skin): BuiltLevel`. Start by copying a similar chamber; `chimney.ts` is a good, recent example.
2. Construct a `Builder` with an accent `Color3`, lay out geometry with `slab`/`tube`/`box`, place levers with `addSwitch(position, wallNormal, targetAxis)`, and return `b.finish({ name, hint, spawnPosition, entranceAxis, exitAxis, exitCenter, exitRadius })`.
3. Add it to `CHAMBERS` in `chambers/index.ts` with a new unique, permanent `id` and the same `name` it passes to `finish()`, then update the chamber list in `README.md` and its status in `ROADMAP.md`.

Conventions and pitfalls:

- Everything is axis-aligned boxes. Every box face is the floor under exactly one gravity axis (the one pointing into it), and skins colour faces by that axis. Don't add rotated geometry.
- Use surface roles deliberately: `b.wall`/`b.floor` (shell), `b.alcove` for corridors, `b.exit` for the exit path and anything the player must find, and the default `feature` for interior obstacles.
- Holes cut with `slab(..., hole)` run to the slab's edge, which can leave a floor gap under a doorway. Fill it with a sill `box` (see the existing chambers).
- Describe the gravity route in the file's doc comment (e.g. `-Y -> +Z`) and keep it in sync with `entranceAxis`/`exitAxis`.
- Use `?sandbox` in the dev URL for the crate/plate/door test room, and `?skin=<id>` to force a skin.
- Every mesh, material and listener a level creates must be released in `dispose()`. Go through `Builder` so `finish()` handles this; skin sub-materials outlive levels and must not be disposed with them.

## Verifying gameplay

Typecheck and unit tests do not tell you whether a chamber can be completed. When you change geometry, lever placement, or player movement constants (jump height, air control, lever reach), say plainly that the change still needs a manual playtest, and say what to check: can each lever be reached from the surface the previous shift leaves you on, and can the exit be reached. Don't claim a chamber works because it builds.

## Git

- Work on a branch and open a PR into `main`. Commit only when asked.
- Commit subjects are short, imperative and sentence case, with no prefix (e.g. `Add chamber V, The Chimney; fill the floor gap under doorways`).
