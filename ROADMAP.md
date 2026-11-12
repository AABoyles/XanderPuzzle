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

## Further out

- **A level editor** in the browser, built on chamber-as-data, with the headless invariants run live.
- **Shared chambers**: a chamber spec travels in a URL fragment (`#c=`, compressed) and opens as a single room; `npm run share -- <id>` makes a link. Still to do: an in-game export, which waits on the level editor, and specs that can carry crates, doors and plates.
- **A daily chamber**: one seeded arrangement of an existing room per day, with a local best.
- **Localisation**: the strings are already gathered in `narrative.ts`, `hints.ts` and `prompts.ts`; placards would need per-language fitting.
