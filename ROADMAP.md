# Chamber roadmap

Ten ideas for chambers V–XIV, roughly in the order they should be built. Each one teaches or tests a single idea. The first three need nothing the engine lacks today; the rest each introduce one new mechanic, listed under "Needs".

What exists today: static axis-aligned boxes, wall-mounted levers that set gravity to a fixed axis (90° steps only), one exit trigger per chamber, and the `Builder` helpers (`slab`, `tube`, `addSwitch`) in `src/level/Level.ts`.

## Buildable now

### V · The Chimney
- **Idea:** falling is travel. A lever at the bottom of a long horizontal tunnel turns the tunnel into a pit, and the exit door is partway down its side.
- **Route:** `-Y → +Z`, then steer mid-fall onto a ledge.
- **Teaches:** air control during a fall, and that the first surface you hit is not always the one you want.
- **Needs:** nothing new. Tune air control if steering feels too weak.

### VI · The Staircase
- **Idea:** a room of large stepped blocks. Each step is too tall to jump under any single gravity, but every step's riser is another gravity's tread.
- **Route:** alternate `-Y ↔ +X` four or five times, climbing diagonally.
- **Teaches:** returning to an orientation you have already used.
- **Needs:** nothing new. Several levers targeting the same axis.

### VII · The Atrium
- **Idea:** the first chamber with more than one room. A central cube with a side room on each of four faces, reachable only when that face is the floor. Three side rooms hold a lever; one holds the exit.
- **Route:** five or six shifts, with the order to work out.
- **Teaches:** planning a route rather than following the next lever.
- **Needs:** nothing new. This is the first real test of whether decoys are fun, so playtest it before building further.

## One new mechanic each

### VIII · The Ballast
- **Idea:** a crate that obeys gravity. It rests in a pit; shift gravity and it slides across the room to hold down a pressure plate that opens the exit door.
- **Teaches:** gravity moves things other than you.
- **Needs:** dynamic boxes (falling and sliding, pushed by nothing but gravity), pressure plates, and doors. This is the largest engine addition on the list and unlocks most of what follows.

### IX · The Counterweight
- **Idea:** two crates and two plates on opposite walls. Any shift that seats one crate unseats the other, unless one is first trapped in an alcove.
- **Teaches:** using geometry to pin an object while gravity changes.
- **Needs:** VIII's crates, plates and doors.

### X · The Turnstile
- **Idea:** relative levers. Instead of a fixed target, the lever rotates gravity a quarter turn clockwise around the wall it is mounted on, so the same lever does different things depending on how you arrived.
- **Teaches:** thinking in rotations instead of destinations.
- **Needs:** a relative lever type and a distinct look for it.

### XI · The Lockout
- **Idea:** one-shot levers that burn out after a single use, in a room where the obvious first move strands you.
- **Teaches:** order matters and mistakes cost a restart.
- **Needs:** single-use levers with a clear "spent" state. `R` already restarts.

### XII · The Grate
- **Idea:** grated floors that crates fall through but you do not, and the reverse: glass you can see through but nothing passes.
- **Teaches:** you and the crate can take different routes under the same gravity.
- **Needs:** per-mesh collision filtering between player and crates, and a see-through material.

### XIII · The Tide
- **Idea:** a timed gravity field. One lever starts gravity cycling through three axes every few seconds, and you cross the room by standing in the right place when each change comes.
- **Teaches:** timing, as a change of pace from pure planning.
- **Needs:** a gravity sequencer and a HUD countdown showing the next axis.

### XIV · The Orrery
- **Idea:** the finale. A large chamber using all six orientations, with crates, a relative lever and a one-shot lever, ending with the exit door in the entrance corridor's ceiling so you leave through the room you came in by, upside down.
- **Teaches:** nothing new. It combines everything.
- **Needs:** VIII, X and XI.

## Engine work this implies

1. **Dynamic crates, plates and doors** (VIII, IX, XII, XIV). Biggest item. Decide early between extending the hand-rolled kinematic approach and adopting a physics engine with a per-frame gravity vector.
2. **Lever variants** (X, XI): relative and single-use, sharing the existing `GravitySwitch`.
3. **Collision filtering** (XII).
4. **Gravity sequencer** (XIII).
5. **Checkpoints.** Chambers VII onward are long enough that restarting from the entrance will sting.

## Before any of this

The four existing chambers have never been played by hand: testing so far teleported between levers. A manual playtest comes first, since it may change jump height, air control and lever reach, all of which these designs depend on.
