# Roadmap

What is built is in `README.md` (the chambers and how to play) and `AGENTS.md` (the code). This file is what could come next. Nothing here is committed to; items are ideas until someone picks one up. Each new mechanic should get one chamber that teaches it alone before it is mixed with anything else.

## New mechanics

Ideas for new things the engine could do. The later ones are bigger departures that would change what the game is about for a chamber or an act, so they want a prototype in the sandbox before anyone designs a room around them.

- **Play by Flashlight.** A hard mode in which the player is printed in a cube with non-functioning lights. They can see by a flashlight which illuminates their view, but it is still much darker than a typical cube and only illuminates a circle in the center of their viewport, limiting their peripheral vision.
- **Half gravity zones.** A marked volume where gravity is weaker, so a jump clears what it cannot elsewhere and crates drift. Needs a per-volume gravity scale in the player and crate physics.
- **Local gravity fields.** A boxed region with its own fixed axis, whatever the chamber's is. You and crates change "down" by walking in. This is the first break from "one axis for the whole cube", so introduce it late and alone.
- **Heavy and light crates.** A heavy crate presses a plate a light one cannot; a light one is stopped by a grate a heavy one breaks through once. Needs crate mass and plate thresholds.
- **Linked crates.** Two crates joined by a rigid bar move as one body, so one can hold the other off a plate or hang it over a hole.
- **Latching plates.** A plate that stays pressed once touched, shown by a different colour. Removes the need to keep a crate parked and allows multi-step sequences.
- **Timed doors.** A door that stays open for a few seconds after its plate is released. Pairs naturally with the sequence lever.
- **Glass you can break.** A pane that a crate arriving fast enough shatters, opening a route for the rest of the chamber. Uses the impact speed the physics already reports.
- **Lever relays.** A lever that only works while a plate is held, so a crate must be parked before gravity can be turned again.
- **Carried gravity.** A one-use charge picked up at a pedestal and spent anywhere, the first lever with no wall. Risky for route-checking: the reachability test assumes levers are at fixed places.
- **Second attendant.** A recording of your previous attempt replays beside you, pressing plates as you did. Fits the story (you are reprinted) and gives co-operation puzzles without multiplayer.
- **Split gravity.** You and the crates obey different axes: a lever turns only "ballast gravity", and the crates fall sideways while you stay put. Every crate chamber gets a second reading.
- **Gravity that follows your eyes.** A helmet charge that sets down to whichever face you are looking at when you press it. No levers in the room at all; the puzzle is the three charges you were issued.
- **The cube turns, not gravity.** In a `vista` chamber the stars wheel when you throw a lever. Make that true in one room: the planet stays put, and a beam of planet-light through a skylight sweeps the walls and opens a light-sensitive door.
- **Starlight and shadow.** Light plates that are pressed by the star's light through a window, and blocked by a crate's shadow. Gravity moves the shadow.
- **Storm power.** Some levers are dead except during a stellar storm, once a minute. Plan in the calm, act in the flare. The Crown stops being scenery.
- **Printed matter.** A second print bed in the chamber prints a crate on demand, one at a time: printing a new one reclaims the old. The crate is wherever you last asked for it.
- **Print yourself elsewhere.** A second bay you can be reprinted at, by choice. Your old body stays behind as a statue that still holds plates. The story already says what you are.
- **Liquid ballast.** A tank of fluid that pools on whichever face is down, drawn as a slab that slides and settles. It floats light crates, drowns low levers and pushes float plates up.
- **Crate trains.** Crates that couple when they touch and uncouple at a marked rail, so the order they arrive in is the puzzle.
- **Magnet crates.** A crate that sticks to marked steel faces and ignores gravity until a shift pulls it straight off. A crate you can leave on the ceiling.
- **Fragile floor.** Panels that hold you once and then fall out as a crate. Your route makes your ballast.
- **Momentum gates.** A one-way flap that only a crate arriving fast enough pushes through: the length of the slide matters, so the shift before the shift matters.
- **Rotating rooms inside the cube.** An inner cage on an axle that a lever turns a quarter turn, with its own levers riding on it. Geometry stays axis-aligned at rest; only the turn is animated.
- **Scale shifts.** A lever that halves the attendant. Small, you fit through grates and under doors, and a crate is a cliff.
- **Time ballast.** A lever that rewinds the crates ten seconds but not you. Undo, as a mechanic the facility issues.
- **Counter-gravity twin.** A dark crate that always falls the opposite way to gravity. Paired with a normal crate, every shift moves them apart or together.
- **Sound as a cue.** A chamber with the lights failed: levers hum at the pitch of their axis (the shift tones already exist), and you find them by ear.
- **Shared gravity.** Two cubes side by side with a window between: your levers turn the other cube too, where a second set of crates has to come out right.

## Notional chambers

- **The Scale** (heavy and light crates): two plates, two crates, and only one assignment of crate to plate opens the door; gravity sorts them through a grate.
- **The Airlock** (timed doors): two doors in a row, never both open; the cycle has to carry you through the gap between them.
- **The Lung** (half gravity): a tall hall whose middle band is weak; cross a gap that is too wide by jumping from inside the band.
- **The Loom** (linked crates): a barred pair that must be threaded through a slot under one gravity and laid across two plates under another.
- **The Eddy** (local fields): a corridor of three field boxes that carries a crate round a corner no single axis could.
- **The Echo** (second attendant): a deadman plate for a gate you also have to walk through, solved by holding it on the first run and walking on the second.
- **The Relay** (lever relays, latching plates): a chain of three levers where each needs the last one's crate still in place.
- **The Quarry** (breakable glass): the exit is behind a pane; build up a long enough slide to break it, with a short slide that only cracks it as the decoy.
- **A second finale** before the Descent that uses the crate preview against the player: a chamber where the door state changes mid-slide, which the preview does not model.
- **Optional "dark cube" chambers**, off the main order, unlocked by meeting par: harder variants of existing rooms with the levers moved, told as cubes already off the schedule. See "Play by Flashlight", above.
- **The Sundial** (starlight and shadow): a light plate, a skylight, and one crate whose shadow has to fall anywhere but on it.
- **The Hourglass** (fragile floor): a tall room you descend by breaking it; everything you stood on is ballast you need at the bottom.
- **The Cistern** (liquid ballast): the exit is under the fluid on every axis but one.
- **The Marshalling Yard** (crate trains): three stamped crates that must reach three plates in serial order.
- **The Lodestone** (magnet crates): a crate that must be left on the ceiling to hold a plate while you use the floor.
- **The Gimbal** (rotating inner room): a cage whose door only lines up with the exit after two turns that also move its only lever out of reach.
- **The Eclipse** (storm power): a room with one live lever and one storm lever, where the wait between storms is exactly long enough to make the wrong move.
- **The Understudy** (print yourself elsewhere): three plates, one attendant, two statues.
- **The Mirror** (shared gravity): the room beyond the glass is this room reflected, with its hole where your plate is.
- **The Antechamber** (split gravity): a room that looks solved when you walk in, and is, until you move.
- **The Needle's Eye** (scale shifts): get a full-size crate somewhere only a half-size attendant can go.
- **The Blackout** (sound as a cue): the Lockout again, in the dark.
- **The Long Fall**: a chamber with no floor at all, played entirely mid-fall between six catching ledges, steering from one to the next.
- **The Elevator**: two stacked cubes joined by a shaft; the lower one's crate is the upper one's counterweight.
- **The Archive**: a room of forty spent levers and one live one, the others left by everyone who was here first.

## The field as a place

The cubes are a field of counterweights, but you only ever see one from inside. Ideas that use the rest.

- **A map of the field** as the chamber select: the Orrery's model, lit cube by cube as you clear them, dark ones tumbling.
- **Falls that land.** Miss the planet-ward line and a fall can end on another cube's hull: a short outside walk under that cube's gravity, to a hatch.
- **Cube-to-cube sightlines.** Through a skylight, see the next chamber's cube turn when you throw your lever; in the next chamber, see the last one go dark.
- **Trim as a score.** The field's balance, shown on the title view as how level the Crown hangs, improves with each par met.
- **The schedule.** A real-time duty roster on the title screen: cubes that "need attendance" today, which is the daily chamber told in the facility's voice.
- **Walk the Crown.** One late chamber set on the ring itself: a long curved-looking corridor built from straight boxes, the planet below through the floor grating the whole way.

## Design refinements

- **Par times**, set from `?playtest` logs, shown beside par shifts; a medal on the chamber select for meeting both.
- **A summary on the end card**: total time, total shifts against total par, attendants lost.
- **Player landing preview**: beside the crate ghosts, mark where you would come to rest after the shift.
- **Crate-aware stuck notice**: search a few shifts ahead on the crate physics to detect "no route seats the crate" (the Surplus, the Orrery), which the lever-only check misses.
- **Make the crate preview and the hint ladder settings**, if testers report they give too much away.
- **Mid-chamber checkpoint in the Orrery**, where a late mistake is still the longest redo.
- **Key rebinding**, and captions for sound cues (lever, door, plate, crate lost).
- **Photo mode** on the title's outside view: orbit the cube, hide the HUD.
- **Speedrun mode**: no print-in, a running clock, a single timer across all chambers.
- **Lever glyphs per axis**, as a second cue beside colour, for players who use neither palette comfortably.
- **Haptics** on gamepad and phone for a shift, a crate impact and the reclaimer.
- **Ghost of your best run** as a faint figure during replays.
- **A lever-order ribbon** on the win screen: the axes you used, in their colours, with par's beside it.
- **Chamber thumbnails** in the chamber select, rendered once from the title camera.
- **Assist mode**: slower timed cycles, longer coyote time, unlimited undo depth, set per player and not held against best times.
- **Hard mode**: no undo, no preview, no hints, shown as a mark on the chamber select.
- **A lever log** in the pause menu: what you have thrown this attempt, so a long chamber can be picked up after a break.
- **Skins that mean something**: unlock Draft by meeting every par (the plans), Neon by finishing the game (the facility as it was first lit).
- **A seventh "skin": the facility's own view.** Wireframe, crate paths drawn, plates labelled; what the Stencil sees.
- **Seasonal storms**: the once-a-minute storm varies in strength by real date, peaking on a few days a year.
- **A one-handed control scheme** and a toggle for hold-to-run.

## Narrative

- **416's trail in the dark cubes**: the optional chambers carry the notes 416 left on the way down, ending one cube short of the Descent.
- **The Stencil decays**: late placards with missing letters or serials that no longer match, without the facility ever admitting it.
- **A different end card on a second completion**: the planet shows one more light for each run, kept in saved progress.
- **The other attendants**: a few chambers where a spent lever or a parked crate shows someone was here on another cycle.
- **Storm consequences**: a storm seen through a skylight briefly dims the chamber's work lights or stalls a sequence lever, so the Crown's job is felt, not only logged.
- **Audio log lines**: the facility's log read by a flat synthetic voice, off by default, with captions.
- **Music that follows the acts**: a second and third layer on the drone as the dark share of the field grows.
- **417 leaves notes too.** A grease pencil you can spend once per chamber, on one of a few offered lines. On a second playthrough they are on the walls, signed 417, beside 416's.
- **The Stencil learns your name.** After enough recoveries the facility's log lines start using the recovery count as a title, deadpan.
- **A third voice.** Scratched, not written: one-word marks low on the walls from something that was never printed. Never explained.
- **The planet answers.** The lights on the night side begin to form a pattern over the last act. It is the layout of the chamber you are in.
- **An ending you can refuse.** In the Descent, a hidden fixed lever restores trim. Take it and the facility thanks you, the printer comes back on, and the chamber select gains one more cube: 0148, empty, clean, with a duty line and no exit.
- **Reclaimed memories.** Each reprint drops one word from the induction placard in the Vault, visible only if you go back.
- **Field radio.** Faint number stations in the fall's wind: cube serials being read out, with the dark ones skipped.
- **The first attendant.** One chamber kept exactly as attendant 0001 left it: every lever spent, the door open, nothing to solve, and the longest note in the game.

## Code quality

- **A scripted walking player for the smoke tests**: feed real input frames through `PlayerController` so reach, jumps and timing are tested, not only lever order. This is the largest gap in the safety net.
- **Tests for the paths nothing runs**: touch and gamepad input, the chamber-load failure message, advancing before the next chamber's code has arrived.
- **A check that each chamber's third hint agrees with its route**: its "first lever" should be the first lever in the smoke-test row.
- **Cut first-load size**: Babylon is nearly all of the 1.6 MB. Load the space backdrop, the non-default skins and the pause menu on demand; measure before and after.
- **Audio weight**: 2.6 MB of the build. Re-encode the drone and check bitrates.
- **Split the large files**: `Skin.ts` (one file per skin), `SpaceBackdrop.ts` (planet, field, Crown, streaks) and `HUD.ts` (overlays apart from the play HUD).
- **Group `App`'s per-attempt fields** (`levelTime`, `shifts`, `reclaimHold`, `outOfTrim`, `repeatStarts`) into one `attempt` object with a single reset, so `startLevel` cannot miss one.
- **Chamber data over chamber code**: describe simple chambers as data that one builder reads, which would allow a level editor and checks that need no build.
- **Typecheck the tests**: `tests/` and `e2e/` are outside `tsconfig.json`.
- **Go back to branches and pull requests** for changes to `main`, so the required check runs before a merge.

## Further out

- **A level editor** in the browser, built on chamber-as-data, with the headless invariants run live.
- **Shared chambers**: export a chamber as a URL fragment; no backend needed.
- **A daily chamber**: one seeded arrangement of an existing room per day, with a local best.
- **Localisation**: the strings are already gathered in `narrative.ts`, `hints.ts` and `prompts.ts`; placards would need per-language fitting.

## Death by ballast

Not scheduled; a design note. Today you cannot die: a crate that meets you stops (`LevelDynamics.update` steps crates against the player's box as a fixed obstacle), and a fall out of the cube only reprints you. This adds one way to die that the player can see coming and avoid: being **crushed by a crate**. It gives ballast weight, makes "not in a crate's lane" a rule the player feels instead of a rule the designer follows, and gives a few chambers real teeth.

### The rule

- A crate **moving** into you with a surface of solid (floor, wall, another crate, a closed door) on the far side of you crushes you. A crate that stops against you with open space behind you does not: you are pushed nothing and killed by nothing, as now.
- Practically: when a crate's step ends overlapping the player's box and the player has no free direction along the gravity axis to be pushed (their box would then overlap a solid), or the crate arrives faster than a threshold (reuse the impact speed `stepBody` already returns, with `impactGain` as the existing example of using it), the player is crushed.
- Slow settling never kills. A crate resting on a plate you are also on, or sliding gently into you, does nothing. Only an impact above the threshold counts, so a tuned number, not a physical simulation.
- Falling crates are the main case: a shift while you stand in a crate's lane under it, or in front of its slide, is fatal; the preview ghost (`CratePreview`) already shows where it will come to rest, which makes the danger readable before you throw a lever.
- Doors that close on you (they already refuse to close on a body in the doorway) stay as they are. No other new killers: nothing else needs to be able to hurt you.

### What happens

All of it is short, under two seconds, and then the player is back where undo or a restart would put them. Nothing is saved and `?unlockall` is unaffected.

1. **Sound.** A single dry crunch, then silence. A recorded sound is best: CC0 from OpenGameArt.org like the rest, with its row added to `public/audio/CREDITS.md`, listed in `src/audio/sounds.ts` (which `tests/sounds.test.ts` checks exists). Fall back to a synthesized layering in `AudioEngine` (a low thump plus a burst of filtered noise, as the wind of a fall already is) if no suitable file turns up. The music ducks under it, and the fall's wind and the print sounds stop.
2. **The view.** The frame goes **red** at once: a full-screen tint that is sudden, not eased in, at about 40% opacity under the HUD. It holds for a few tenths of a second and then fades to **black** over about a second and a half, the same overlay mechanism as `HUD.printIn`/`printOut` (a Babylon GUI rectangle; add `HUD.death(reduced)` beside them). The camera does not move.
3. **The facility.** The log says one line in the Stencil's voice, which never says anything is wrong. Something like `ATTENDANT CONTACT WITH BALLAST. REPRINT.` The recovery count (`recoveries`, never saved) goes up and the end card's total includes it.
4. **After the black.** A reprint at the entrance, exactly as after a fall: the print-in wipe plays on the existing path, and `restartLevel` is what runs. The log then adds the recovery line (`recoveryLine`).

### How it fits the code

- A new state, `dead`, in `src/game/GameState.ts` (`transition(state, event)`, with its answers to the queries and tests in `tests/gameState.test.ts`): reached from `playing` and `falling` on a `crushed` event; frozen like a menu (`isFrozen`) so the sim stops but the view keeps rendering; leaves on a `respawn`-style event when the black has finished. `main.ts` stays free of flags, as AGENTS.md says.
- Detection lives in `src/level/Dynamics.ts` and its Babylon-free physics (`src/physics/boxPhysics.ts` for the "no room to be pushed" test), reported through `DynamicsEvents` (a new `crushed: boolean`) and covered by `tests/dynamics.test.ts`: a crate falling onto a player standing on the floor kills; a crate sliding gently against a player in open space does not; a crate settling onto a plate you share does not.
- Undo: allowed from `dead`'s fade (before the reprint) and returns you to just before the lever that killed you, since the snapshot is taken just before the throw. This makes the first death of a chamber cost one Z and no restart. Decide whether that is the intent or whether death should always reprint at the entrance.
- The stuck notice (`checkTrim`) and the playtest log: add `deaths` to each visit in `src/playtest.ts`, and count it as a restart for the hint ladder.
- The headless chamber invariants: add a check that no chamber starts the player in a position where the first reachable crate impact crushes them, and that the spawn has clear room on every side.
- Par and time: a death restarts the attempt like any restart, so `levelTime` and `shifts` reset.

### Open questions

- **Tone and accessibility.** The crunch and the red are the design, but they are the one violent beat in an otherwise calm game. Provide a setting to soften it (a thump and a plain fade with no red), and honour reduced motion by replacing the red flash with a slow fade to black. The pause menu's settings list already carries toggles of this kind.
- **Is it fair?** The deaths a player will remember are the ones they did not see coming. Every chamber with a crate needs a hand playtest for the shifts that kill, and the preview ghost should be on by default for the first chambers that can crush.
- **Which chambers get teeth?** Probably none of the early crate chambers (Ballast, Footing, Stopper) and a few later ones where a wrong shift already costs a restart (Surplus, Orrery), so the new rule rewards care where care was already needed.
- **Crates only, or also you crushing a crate?** Crates are not alive, so no: a crate pinned by gravity and the player does nothing, as now.

## Retire the grate and the barrier

Not scheduled; this is a design note. The grate (blocks you, not crates) and the barrier (blocks crates, not you) make a surface mean different things to different bodies, so "can this get through?" has no single answer and every chamber's reading has to be done twice. Glass (blocks both) and holes (let both through) are one rule each. The aim is to redo The Grate, The Sieve and the Pendulum's lane with only those two, and then delete `Builder.grate`, `Builder.barrier` and the per-mesh player-versus-crate collision filtering behind them. Nothing below is built or checked against the engine.

### What can tell you from a crate once only glass and holes exist

When both bodies share a surface, geometry cannot tell them apart by itself. These are the ways left, most robust first:

1. **Lane.** A crate only moves along the gravity axis, so it keeps whatever lane (the other two coordinates) it started in. A glass-sealed lane, as in the Pendulum, keeps you out entirely; a gap placed outside the crate's lane is a gap only you ever meet. This already works and needs no new rule.
2. **Gravity face.** An opening in a wall is a floor only under one axis. Which body is standing where when that axis comes decides who falls.
3. **Agency.** A visible hole is a choice for you and an inevitability for a crate. Pair it with undo and a pit that costs one Z is a lesson, not a trap, so a hole you can see and could enter is acceptable where it would not have been before.
4. **Size.** You are a ball 1 across; crates are 1.5 (and 2.5 in the Stopper). A doorway 1.2 wide lets you through and stops a 1.5 crate; a slot 0.8 wide lets a 0.6 crate through and stops you. The headline option, since it makes the difference visible. It needs margins (never a gap within 0.1 of a body's size, or the ball will snag) and a prototype in the sandbox before any chamber relies on it.
5. **Reach.** You jump about 1.6 high; crates do not. A ledge you can jump onto and a crate cannot is a one-way valve. Weakest, since it depends on jump feel.

### The Sieve, redone

Replace the barrier with a glass partition across the middle of the room that has a **doorway** in it, 1.2 wide and 3 high, in your lane (z at or below 0, where every lever and landing already is). The crate lane is untouched, so under +X you fall east through the doorway and the crate stops dead against the glass: the same lesson as today, from both sides. The crate still has to go over the top (the partition stops short of the ceiling, as the field does now), so the route `-Y → +X → +Y → +X → -Y` stays and `tests/crateRoutes.test.ts` should keep its rows.

Costs and decisions:
- You must be in the doorway's lane when you fall, where the field let you fall anywhere. The levers will need checking: lever 0 is on the field's west face at z = 0 and should stay in line with the doorway.
- The lane that keeps the crate off the doorway also means the crate never meets it, so the "crate cannot fit" lesson is told only by the glass. Optional: cut a second, too-narrow slot in the crate's lane (1.2 wide against a 1.5 crate) so it visibly jams while you fall through the real one.
- Retitle the placard `MASS FIELD / ATTENDANTS MAY PASS` (it is no longer a field), e.g. `MASS DOOR / ATTENDANT WIDTH`. The hint ("You can go through there. The crate cannot.") stays true word for word.
- Rewrite the Sieve's two extra hints in `MORE_HINTS`, which mention the field's gap.

### The Grate, redone

The lesson today is "you cannot go down there; the crate can". Two replacements, to choose between:

- **A hole in the crate's lane (recommended).** The whole floor is glass over the sealed lower deck except for one hole in the crate's lane at the far end, so after the first shift east the crate slides to the east wall and the shift back drops it down the hole onto the plate. You never meet the hole: it is not in your lane, and the lane is closed to you by a glass parapet or simply by where your levers are. The new lesson is "gravity decides who falls, and where you stand decides what you meet". Simple and robust; it loses the "you cannot" half.
- **A hole you can fall into.** Same layout, but the hole is open to your lane too, and the plate is pressed by crates only. Falling in drops you into the sealed lower deck, where you wait, un-reprintable, for undo or restart. Keeps "you cannot go down there" as advice you could ignore. Needs the lower deck to be a clean, readable dead end, since a pit you cannot leave is the exact trap the level-design pass removed from long chambers.

Either way the chamber keeps its route `-Y → +X → -Y`, and its row in the crate-route tests.

### The Pendulum

The grate in the lane through the partition (`b.grate(V(-0.5, 0, 0), V(0.5, 2, 2))`) probably does nothing today: the lane is sealed in glass on its other sides, so you cannot reach it. If so it can simply become an open gap. Confirm with the crate-route rows and the headless invariants before removing it.

### Clean-up once nothing uses them

- Delete `grate` and `barrier` from `Builder` and the player-versus-crate collision filtering behind them (the barrier is in `solids` and the grate is not, which is the one place the crate and player lists differ), and simplify the chamber invariants that special-case them.
- Update the docs that describe three collision classes: README ("Crates, plates and doors"), AGENTS.md (the `Builder` bullet) and the `Builder` doc comments. "Everything is glass or solid" is the line to end up with.
- The barrier's outline and alpha work (recent) goes with it; the Sieve's glass partition uses the existing glass look.
- Playtest the two redone chambers by hand: reach into the doorway from the east wall's landing, and whether the hole in the Grate can be seen from where each lever is thrown.
