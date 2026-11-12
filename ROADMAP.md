# Chamber roadmap

The chambers after the first five, roughly in the order they were built. Each one teaches or tests a single idea. All of them are built; the headings below use the numbers they were planned under, and the play order (with today's numbers) is in `README.md`. The level-design pass at the end of this file added six more and reworked most of the rest.

What exists today: static axis-aligned boxes, wall-mounted levers that set gravity to a fixed axis (90° steps only), one exit trigger per chamber, and the `Builder` helpers (`slab`, `tube`, `addSwitch`) in `src/level/Builder.ts`.

## Buildable now

### VI · The Staircase
- **Status:** built (`staircase.ts`), then cut from four risers to three in the level-design pass. Each climb under +X drops you into a lane sealed overhead, so you must shift back to -Y and walk through the divider's doorway before the next climb; the last cell swaps its lanes, so the habit of crossing the divider leads into a dead end. Five levers.
- **Idea:** a room of large stepped blocks. Each step is too tall to jump under any single gravity, but every step's riser is another gravity's tread.
- **Route:** alternate `-Y ↔ +X` four or five times, climbing diagonally.
- **Teaches:** returning to an orientation you have already used.
- **Needs:** nothing new. Several levers targeting the same axis.

### VII · The Atrium
- **Status:** built (`atrium.ts`). Rooms on +X, -X and +Z hold levers; the exit room is on +Y. Route `-Y → +X → -Z → -X → +Z → +Y`. The level-design pass gave it a real fork: room A now holds three levers (-Z the long way, +Z straight to room C for a three-shift route, -Y back to the start), and three decoys that had become noise were removed. It also holds a caged crate that slides with every shift and does nothing, so the player has watched a crate move before the Ballast asks them to move one.
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
- **Status:** built (`orrery.ts`). Route `-Y → +X → +Z → +Y → -X → -Z → +Y`, one crate riding every shift to a plate in the top-west corner of the south wall, a one-shot lever and a relative lever, and the exit in the entrance corridor's ceiling. The level-design pass added a fork on the ceiling walk: a lever straight to -Z parks the crate in a pocket it cannot leave, and because the one-shot lever is spent by then, that costs a restart. Its centrepiece is a model of the ballast field (a ring for the Crown, a plinth for the planet, 13 small cubes of which 5 are lit); see NARRATIVE.md.
- **Idea:** the finale. A large chamber using all six orientations, with crates, a relative lever and a one-shot lever, ending with the exit door in the entrance corridor's ceiling so you leave through the room you came in by, upside down.
- **Teaches:** nothing new. It combines everything.
- **Needs:** VIII, X and XI.

## Engine work this implies

1. **Dynamic crates, plates and doors** (VIII, IX, XII, XIV). Done: hand-rolled swept AABB physics in `src/physics/boxPhysics.ts`.
2. **Lever variants** (X, XI). Done: `addRelativeSwitch` (white, with a ring) and `{ once: true }` (goes dark when spent), sharing `GravitySwitch`.
3. **Collision filtering** (XII). Done: `grate` (blocks the player, not crates), `glass` (see-through, blocks both) and `barrier` (blocks crates, not the player).
4. **Gravity sequencer** (XIII). Done: `addSequenceSwitch` and a HUD countdown. Throwing any other lever stops the cycle.
5. **Checkpoints.** Not done. Chambers VII onward are long enough that restarting from the entrance will sting. The level-design pass kept new trap holes out of the long chambers for this reason; the Orrery's fork is the one place a late mistake costs a long restart.
7. **Level-design pass engine work.** Done: crates that fall out of the level are lost (`Crate.lost`, `MASS_RELEASED` log line), inverted plates (`addPlate(..., cratesOnly, inverted)`), a burnt-out lever prop (`addSpentLever`), and `tests/crateRoutes.test.ts`, which replays crate routes headlessly.
8. **Telling the story.** Done: the attendant printer at every entrance and the print-in (`Builder.finish()`, `HUD.printIn`), skylights and `vista` chambers that show the field and the Crown from inside, the title's outside view of the cube, the Orrery's model of the field (`modelCube`), signed notes from attendant 416, and an ending that says why it is one (the Descent's printer goes offline, its cube goes dark, one more light on the planet). See NARRATIVE.md, "Building it".
6. **Platform.** Done: touch controls, gamepad support, a pause menu with persistent settings and a controls reference, fullscreen with landscape lock, and an installable offline-capable web app. These are outside the chamber designs above.

## Level-design pass

Two aims: the player should see crates move (and learn what gravity does to them by watching), and trap holes should be consequences of a wrong move, not scenery.

### Changes to existing chambers
- **Shaft:** the trap hole moved from the floor to the +X wall, on the climb; you walk round it.
- **Spiral:** the dead-end lever pair became one lever that turns a wall with a hole in it into the floor under you. The old side hole is gone.
- **Chimney:** the pit has no bottom. The end wall and the lever at the bottom are gone; miss the ledge (and the decoy ledge, which is now a second chance) and you fall out of the cube.
- **Staircase, Atrium, Orrery:** see their entries above.
- **Ballast, Counterweight, Grate:** every lever is on a low glass screen facing the crates, so the crate, its path and its plate are in front of you when you throw it. The Ballast's slide is longer.
- **Turnstile:** the trap hole moved from the ceiling to the start wall, where the wrong-turn lever drops you. The two recovery levers are gone.
- **Lockout:** a burnt-out lever by the entrance shows what a one-shot lever becomes.
- **Tide:** one trap hole in the north wall, where being too low on the pillar when +Z comes drops you.

### New chambers
- **IX · The Footing** (`footing.ts`): a crate as a step. A window with a sill 2.6 up; a low stop block catches the crate under it only when it slides east along the floor, and it starts on a ledge that carries its first slide over the block. Route `-Y → -X → -Y → +X → -Y`.
- **X · The Stopper** (`stopper.ts`): a crate as an obstacle. A 2.5 crate plugs a shaft high in the north wall; -Z pulls it out, but going back by -Y sets it on a shelf at the mouth's height and +Z drops it back in. Route `-Y → -Z → +X → +Z`, then fall into the open shaft.
- **XII · The Deadman** (`deadman.ts`): the first plate the player presses. Standing on it holds a gate open for the crate. Route `-Y → +X → -Y`.
- **XVI · The Sieve** (`sieve.ts`): the first `barrier`. The crate stops at the field and has to go over the top. Route `-Y → +X → +Y → +X → -Y`.
- **XVII · The Surplus** (`surplus.ts`): an inverted plate and a hole to lose a crate through. A decoy lever stacks the crates so the hole takes the one you need. Route `-Y → -X → -Y → +X → -Y`.
- **XIX · The Pendulum** (`pendulum.ts`): a timed cycle `-Y → +X → -Y → -X` swings a crate between a plate and the far wall; the door is open only while the crate is on the plate.

### Still to do
- **A manual playtest of all of it.** Every changed and new chamber builds, passes the headless invariants and crate-route tests, and can be "solved" by the teleporting smoke test. Only the Footing's climb and the Stopper's final drop were also driven with real movement. Reach, sightlines and difficulty are otherwise unproven.
- **The lever's own arrow is in the way.** The arrow was made smaller and moved beside the lever, close to the wall, so it no longer fills the middle of the view and hides the crate behind the lever. It still needs a manual playtest: is the arrow still easy to read from the usual standing distance, and is the crate behind a lever now visible?
- **The Pendulum is simple.** With a full-height partition the puzzle is only "be on the west side when +X comes". Lowering the partition would make the west floor unsafe too.
- **The barrier field was made more opaque and outlined, but needs a look.** Its alpha went from 0.12 to 0.32, its emissive colour is stronger and its edges are outlined. Check in a manual playtest, in every skin, that the Sieve's field reads as a thing and still reads as see-through.
- **The story pass is unplayed.** The print bay, the skylights (Vault, Counterweight), the Orrery's model and the ending were checked in screenshots only. NARRATIVE.md, "For playtesting", lists what to look at; the Orrery's model also changes what a mid-hall fall lands on.

## Before any of this

The four existing chambers have never been played by hand: testing so far teleported between levers. A manual playtest comes first, since it may change jump height, air control and lever reach, all of which these designs depend on.
