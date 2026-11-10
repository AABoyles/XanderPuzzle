# Chamber roadmap

Ideas for chambers VI–XIV, roughly in the order they should be built. Each one teaches or tests a single idea. The first three need nothing the engine lacks today; the rest each introduce one new mechanic, listed under "Needs".

What exists today: static axis-aligned boxes, wall-mounted levers that set gravity to a fixed axis (90° steps only), one exit trigger per chamber, and the `Builder` helpers (`slab`, `tube`, `addSwitch`) in `src/level/Builder.ts`.

## Buildable now

### VI · The Staircase
- **Status:** built (`staircase.ts`). Five cells of 3-high risers split into two lanes by a divider; each climb under +X drops you into a lane sealed overhead, so you must shift back to -Y and walk through the divider's doorway before the next climb. Eight levers, four shifts each way.
- **Idea:** a room of large stepped blocks. Each step is too tall to jump under any single gravity, but every step's riser is another gravity's tread.
- **Route:** alternate `-Y ↔ +X` four or five times, climbing diagonally.
- **Teaches:** returning to an orientation you have already used.
- **Needs:** nothing new. Several levers targeting the same axis.

### VII · The Atrium
- **Status:** built (`atrium.ts`). Rooms on +X, -X and +Z hold levers; the exit room is on +Y. Route `-Y → +X → -Z → -X → +Z → +Y`. Every decoy is a backward edge, so nothing traps you, but that also makes it closer to following levers than planning. Playtest whether a real fork (perhaps with one-shot levers) is needed.
- **Idea:** the first chamber with more than one room. A central cube with a side room on each of four faces, reachable only when that face is the floor. Three side rooms hold a lever; one holds the exit.
- **Route:** five or six shifts, with the order to work out.
- **Teaches:** planning a route rather than following the next lever.
- **Needs:** nothing new. This is the first real test of whether decoys are fun, so playtest it before building further.

## One new mechanic each

### VIII · The Ballast
- **Status:** built (`ballast.ts`). One crate in a trough, one crates-only plate on the east wall, one door. Route `-Y → +X → -Y`.
- **Idea:** a crate that obeys gravity. It rests in a pit; shift gravity and it slides across the room to hold down a pressure plate that opens the exit door.
- **Teaches:** gravity moves things other than you.
- **Needs:** dynamic boxes (falling and sliding, pushed by nothing but gravity), pressure plates, and doors. This is the largest engine addition on the list and unlocks most of what follows.

### IX · The Counterweight
- **Status:** built (`counterweight.ts`). One plate at the bottom of a 1-deep pit (which pins its crate under any sideways gravity) and one on the +X wall, rather than on opposite walls. Route `-Y → -X → -Y → +X`; throwing +X first leaves the pit crate unseated, and a lever on the -Z wall undoes it.
- **Idea:** two crates and two plates on opposite walls. Any shift that seats one crate unseats the other, unless one is first trapped in an alcove.
- **Teaches:** using geometry to pin an object while gravity changes.
- **Needs:** VIII's crates, plates and doors.

### X · The Turnstile
- **Status:** built (`turnstile.ts`). A tunnel whose start-corner relative lever is thrown twice (`-Y → +X`, then `+X → +Y`), then a second relative lever on the west wall turns `+Y → +Z` for a steered fall through a hole in the end wall.
- **Idea:** relative levers. Instead of a fixed target, the lever rotates gravity a quarter turn clockwise around the wall it is mounted on, so the same lever does different things depending on how you arrived.
- **Teaches:** thinking in rotations instead of destinations.
- **Needs:** a relative lever type and a distinct look for it.

### XI · The Lockout
- **Status:** built (`lockout.ts`). The obvious lever is a one-shot relative lever: thrown first it gives -X and burns out, stranding you. The right order uses a hidden fixed -X lever first, then the relative lever from the -X wall (`-X → +Y`) to fall up through the ceiling.
- **Idea:** one-shot levers that burn out after a single use, in a room where the obvious first move strands you.
- **Teaches:** order matters and mistakes cost a restart.
- **Needs:** single-use levers with a clear "spent" state. `R` already restarts.

### XII · The Grate
- **Status:** built (`grate.ts`). Half glass, half grate floor over a sealed lower deck. Route `-Y → +X → -Y`: the crate slides across the glass onto the grate, then drops through onto the plate below.
- **Idea:** grated floors that crates fall through but you do not, and the reverse: glass you can see through but nothing passes.
- **Teaches:** you and the crate can take different routes under the same gravity.
- **Needs:** per-mesh collision filtering between player and crates, and a see-through material.

### XIII · The Tide
- **Status:** built (`tide.ts`). The sequence lever cycles `-Y → +X → +Z` every 5 s: walk into the pillar's lane, climb its face, slide along the tall wall onto the ledge, and the next +X carries you into the framed exit.
- **Idea:** a timed gravity field. One lever starts gravity cycling through three axes every few seconds, and you cross the room by standing in the right place when each change comes.
- **Teaches:** timing, as a change of pace from pure planning.
- **Needs:** a gravity sequencer and a HUD countdown showing the next axis.

### XIV · The Orrery
- **Status:** built (`orrery.ts`). Route `-Y → +X → +Z → +Y → -X → -Z → +Y`, one crate riding every shift to a plate in the top-west corner of the south wall, a one-shot lever and a relative lever, and the exit in the entrance corridor's ceiling. The one-shot lever is only reachable when it is meant to be used, so its one-shot nature barely matters yet.
- **Idea:** the finale. A large chamber using all six orientations, with crates, a relative lever and a one-shot lever, ending with the exit door in the entrance corridor's ceiling so you leave through the room you came in by, upside down.
- **Teaches:** nothing new. It combines everything.
- **Needs:** VIII, X and XI.

## Engine work this implies

1. **Dynamic crates, plates and doors** (VIII, IX, XII, XIV). Done: hand-rolled swept AABB physics in `src/physics/boxPhysics.ts`.
2. **Lever variants** (X, XI). Done: `addRelativeSwitch` (white, with a ring) and `{ once: true }` (goes dark when spent), sharing `GravitySwitch`.
3. **Collision filtering** (XII). Done: `grate` (blocks the player, not crates), `glass` (see-through, blocks both) and `barrier` (blocks crates, not the player).
4. **Gravity sequencer** (XIII). Done: `addSequenceSwitch` and a HUD countdown. Throwing any other lever stops the cycle.
5. **Checkpoints.** Not done. Chambers VII onward are long enough that restarting from the entrance will sting.
6. **Platform.** Done: touch controls, gamepad support, a pause menu with persistent settings and a controls reference, fullscreen with landscape lock, and an installable offline-capable web app. These are outside the chamber designs above.

## Before any of this

The four existing chambers have never been played by hand: testing so far teleported between levers. A manual playtest comes first, since it may change jump height, air control and lever reach, all of which these designs depend on.
