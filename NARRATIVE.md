# Narrative: The Ballast

The story Shiftbound tells, and how the game tells it. This is a design document, not a script. "Building it" at the end tracks what is built; where an idea needs engine work, that is noted there.

## The premise in one paragraph

Hundreds of hollow cubes hang in the sky above a planet. They are ballast: the moving counterweights of a vast balancing machine that holds something even larger aloft overhead: the Crown, a ring whose magnetic field shields the planet from the storms of its star. To keep the balance, each cube must be turned on a schedule so that a particular face points at the planet. The cubes are designed to be turned from inside, by hand, with levers. You are the hand: an **attendant**, printed at a chamber's entrance, sent through the cube to throw its levers in the right order, and then taken apart at the exit and printed again at the next cube in the queue. The machine still runs its schedule perfectly. Nobody is left on it to ask what for; the ones it shields are on the ground.

## What is decided

Five things hold the story together. The game states the first plainly and lets the player assemble the other two.

1. **Recovery is the cage.** Falling out of a cube is not an escape, because the cube prints you back at its entrance. The printer only serves a cube that is on the schedule, and a cube out of trim drops off the schedule. That is what the Descent's two levers do: they put cube 0147 out of trim, its printer stops, and the fall out of it is the first one nobody is printed back from. That is why the game ends there.
2. **Dark cubes are earlier departures.** A dark cube is one that somebody took off the schedule and left. The lights on the planet are the attendants who got out. The ending adds one more light, and the Descent's cube goes dark like the others.
3. **The Margin is AT-0416.** The notes were written by the attendant whose serial is on the reveal crate, one below the player's. They reached cube 0147, went back to write the notes for whoever was printed next, and were recycled into ballast before they returned. The notes that matter are signed `— 416`.
4. **The Crown is the planet's shield.** It is a coil: a ring whose field turns the star's storms aside. The ballast field holds it in place, and the field is as strong as the share of cubes still keeping their schedule. This gives the ending its cost. Everyone who leaves darkens a cube and weakens the shield over the people they are going to join. The game states the facts (`CROWN SHIELD HOLDING AT 38%`) and does not say whether leaving is right.
5. **The exit is a reclaimer.** The attendant never travels between cubes. The lit corridor at the end of each chamber is the printer run backwards: the attendant is taken apart there and printed again at the next cube. It is the same machine that makes ballast mass out of spent attendants, which is where AT-0416 went.

## Why this fits the game we already have

The premise mostly reinterprets things the game already does:

| What the game does | What it means in the story |
| --- | --- |
| The planet always lies the way gravity points. | Levers don't change gravity. They turn the whole cube until a new face points at the planet. Gravity is real, and it always comes from the planet. |
| The chambers float in empty space. | They have to float freely, or they couldn't be turned. |
| A chamber's exit leads to the next chamber. | The exit is a reclaimer. When the cube is set, the attendant is taken apart there and printed again at the next cube in the queue. |
| Falling through a trap hole resets you to the entrance. | The attendant who fell is lost. A new one is printed at the entrance. The machine calls this a recovery. It is also why falling is not a way out. |
| The win screen shows time and number of shifts. | It is a work log. The machine is counting your labour. |
| Crates slide with gravity and hold down plates. | They are ballast mass, the cubes' trim weights. |
| The finale is called the Orrery. | It is the cube that holds a model of the whole machine, where its alignment can be seen. |
| The last chamber's fall does not reset you. | Its cube was put out of trim, so it is off the schedule and its printer is off. |

## The world

- **The Ballast Field.** The cubes, each a few dozen units across, scattered at different heights and orientations through the sky. Most keep turning on schedule. Some have gone dark and tumble: each of those is a cube somebody left.
- **The Crown.** What the field balances: a spoked ring overhead, the coil of the planet's magnetic shield. It stands between the planet and its star: from the field, which hangs under it, the star is 15 degrees off the line from the planet through the Crown (`SUN_OFFSET` in `SpaceBackdrop.ts`), so in a skylight its glare sits just outside the ring's rim. The field is therefore over the planet's day side. The settlements show as warm lights only in the dusk at the limb furthest from the star, and as glints of sunlight elsewhere. Nobody lives on it and it has no lights, but it runs: a faint violet current travels round the ring. About once a minute a storm comes off the star: its glare swells, the ring flares, and green aurora runs round the planet's limb where the field turns the storm aside (`stormStrength` in `src/environment/fall.ts`). Where the Crown is in view (a window, or a fall) the facility logs it: `STELLAR STORM. CROWN SHIELD HOLDING AT 85%.`, the figure being the share of the field still responding. The player sees the Crown through the skylights (the Vault, the Counterweight), through the hole in the Descent's ceiling, overhead in every fall, and in the title's outside view. The facility names it (`VIEWPORT · THE CROWN` beside each skylight; `THE CROWN SHIELDS THE PLANET FROM THE STAR.` and `THE FIELD HOLDS UP THE CROWN.` on the induction placard) and reports on it (`CROWN LOAD BALANCED.` on every win log). The Margin says what it sees: it keeps the star off the ground, and nobody is up there. Who built it is not explained.
- **The planet.** Always "down", wherever down currently is. Early in the game its night side is dark. Later, a few lights appear on its surface: the attendants who got out. The ending adds one.
- **The builders.** Never seen and never named. They left behind the placards, the schedule and the attendants. Whether they died, went up to the Crown or went down to the planet is left open until the end, and only half answered then.

## The attendant

The player character never speaks and is never seen, except in one place (see "The reveal" below). The attendant is manufactured, serial-numbered and disposable. The facility addresses the attendant only by serial number, for example `AT-0417`. The number is fixed for a playthrough, so it reads like a name.

Each time the attendant falls, a new one is printed and the old one is gone. The number stays the same. The facility never says whether the new one is the same attendant, and the player shouldn't be sure.

Printing is shown, not implied:

- **The print bay.** Every chamber's entrance has one around the spawn point: a glowing bed on the floor, four posts, and a gantry with the print head over it. `Builder.finish()` builds it, and it collides with nothing.
- **The print-in.** At every chamber start, restart and recovery the view opens as a pale blank that the print head's line wipes away from the feet up, in under a second, with a rising hum. With reduced motion it is a plain fade. Behind the title the view is outside the cube, so the print-in plays when the title lifts.
- **The words.** The duty line (`CUBE 0112 · ATTENDANT AT-0417 PRINTED · ON DUTY`), the recovery line (`ATTENDANT LOST. REPLACEMENT PRINTED. RECOVERIES THIS CYCLE: 3.`), the Vault's floor stencil (`ATTENDANT PRINTER 0112` / `KEEP THE BED CLEAR`), the Shaft's placard before the first trap hole, and the prompt outside a cube ("press [R] to be reprinted").
- **The Descent.** When the second lever puts the cube out of trim, the bed and the head go dark and the printer winds down.

## The two voices

The story is told in two voices. They must never be confused with each other.

### The Stencil

This is the facility's voice. It appears on placards stencilled on walls and in the HUD's log lines (fall recoveries, chamber complete, shift counts). It is institutional, deadpan, procedural and polite, and it never jokes on purpose. It assumes that everything is fine and that the builders are still in charge. It is creepy because it does not notice what has happened.

Examples:

- `CUBE 0112 · TRIM SCHEDULE NOMINAL`
- `ATTENDANT LOST. REPLACEMENT PRINTED. RECOVERIES THIS CYCLE: 3.`
- `BALLAST MASS. DO NOT OBSTRUCT.`
- `THANK YOU FOR YOUR CONTINUED ALIGNMENT.`
- `CUBE 0112 SET` · `4 SHIFTS LOGGED` · `CROWN LOAD BALANCED.` · `ATTENDANT RECLAIMED. REPRINT AT CUBE 0113.`

### The Margin

The Margin is a predecessor: attendant AT-0416, who annotated the manual and wrote on the walls of the cubes they passed through. They wrote by hand, in short lines, often on surfaces that can only be reached or read under a gravity the route doesn't need. They figured out more than the Stencil admits. Over the course of the game the Margin goes from helpful, to personal, to frightened, to resolved.

The player has to know the notes are a person's, and whose. So the first note is on the route, in the Vault's entrance corridor, addressed and signed (*To whoever they print next: / read the walls. I wrote on them. / — 416*), and the facility answers it on the opposite wall (`UNAUTHORISED MARKINGS` / `WILL BE REMOVED` / `AT NEXT CLEANING`). Nothing has been cleaned. The signature returns on the notes that carry the plot (the Orrery, the Descent), so the crate stamped `AT-0416` lands as the person who has been talking.

The Margin wants something, and says so: to get down to the lights. It jumped, and was printed back (the Shaft). It worked out that the dark cubes are the way (the Sieve, the Pendulum). It reached cube 0147 and went back to write all this down (the Descent).

The chamber hints already sound like the Margin: "Walls are just floors you have not met yet." "Falling is just walking, faster. Steer." Treat the hint line as the page of the manual for that cube, with the Margin's note on it. Early hints are mostly manual. Later ones are mostly margin.

Rules for the Margin:

- It never contradicts the solution. A hint must still teach what the chamber teaches.
- It never names the builders. It may say what it sees of the Crown and what it does (it keeps the star off the ground; nobody is there), in its own words, never the facility's.
- It says what it wants and what it found out, in its own words, never as instructions from the facility.
- Its last line is written in the final chamber, and the line is `Steer.`

## Telling the story with the game's own rules

### Text that faces one floor

Every box face is already the floor under exactly one gravity axis. A placard or a Margin scrawl is painted on one face and set upright for that face's gravity. Under any other gravity it reads sideways or upside down. To read it comfortably, you have to shift onto its floor.

- Stencil placards sit on the faces the route uses, so you read them in passing.
- Margin notes favour the faces the route doesn't use, such as ceilings, the backs of partitions, and walls that are only floors under a decoy lever. Finding them is optional, and it rewards playing with the levers.

### Recovery

Falling through a trap hole is the most frequent story beat, so it should carry weight:

- During the fall, the backdrop shows other cubes of the field nearby: some lit and turning, some dark and tumbling, and one, rarely, with a hole in the same place as the one you just fell through. The Crown hangs overhead.
- When the attendant is reset, the view prints in and the HUD shows a Stencil log line that says a replacement was printed, with the running recovery count. The count never comments on itself.
- Never comment on deaths in any other way. The number does the work.

### The reclaimer

Every exit has a reclaimer standing in it: the print bay again, lit amber instead of blue-white (`Builder.finish()` stands it on the floor under `exitCenter`; an ending chamber has none). On its bed is a pressure plate like the Deadman's: red until stood on, then green and sunk. Standing on it is the win condition (`BuiltLevel.reclaimer`; touching the plate counts under any gravity, and it takes the attendant after 0.4 s). `exitCenter` now only says where the reclaimer stands: on the floor under it along `exitAxis`. The view is taken apart from the top down (`HUD.printOut`, the print-in run backwards), and the next chamber opens with a print-in. The Vault names it on the wall beside the way out: `ATTENDANT RECLAIMER` / `STAND ON THE PLATE.` / `YOU WILL BE REPRINTED` / `AT THE NEXT CUBE.`

### Sound

The sound is part of the telling, and it is grim on purpose (`src/audio/`, credits in `public/audio/CREDITS.md`). A low drone loops under everything: the machine, still running. The printer cracks like a coil discharging, and the reclaimer makes the same sound backwards, because it is the same machine. The hull groans whenever the cube turns, so every lever is felt as weight. A ballast mass stops with a slam. A fall begins in silence, in vacuum beside the cube, and fills with air as the planet comes up; in an ordinary fall it is cut off dead by the reprint, and in the last one it stops with the end card.

### Windows

Inside most chambers a hole shows only black sky, or the planet if it is in the floor. A chamber marked `vista` has a window meant to be looked out of, and there the stars, the field and the Crown show from inside. The Vault and the Counterweight each have a glass skylight in the ceiling (glass is as solid as wall, so the routes are unchanged) with the Crown straight overhead and `VIEWPORT · THE CROWN` stencilled beside it. The Descent is a vista too: its ceiling hole frames the Crown on the way in, and the planet once the ceiling is the floor. In a vista chamber the planet and the Crown swing round as the cube turns.

### The title view

Behind the title the camera stands outside the cube: the chamber's hull hanging in the field, the Crown above it and the planet below. It is the one place the whole machine is seen at once, before the attendant is printed inside it. It holds while the title is up and the player has not moved off the print bed.

### The Orrery's model

The Orrery's centrepiece is a model of the field. A square ring at the top is the Crown and a plinth on the floor is the planet, both labelled; a larger lit cube above the ring, labelled `STAR`, puts the Crown between the star and the planet. Between them float 13 small cubes, 5 lit and 8 dark: the 38% on the placard.

### The work log

The win screen keeps its time and shift count, but in the Stencil's words (`CUBE 0112 SET`, `4 SHIFTS LOGGED`), and it says what the work did (`CROWN LOAD BALANCED.`) and what the exit did to the attendant (`ATTENDANT RECLAIMED. REPRINT AT CUBE 0113.`). The chamber select can show each cube's serial number alongside its name. Chamber names stay as they are; they are what the attendants call the cubes, not what the facility calls them.

### Ballast mass

Crates are stencilled `BALLAST MASS` with a serial number. Early on the serials have a different prefix (`BM-…`). In the last act, the player finds a crate whose serial number is in the attendant format. See "The reveal".

### Skins as ways of seeing

The five skins are five views of the same cube:

| Skin | What it is in the story |
| --- | --- |
| **Station** | The cube as it is: plated metal machinery in orbit, bolted and worn, with the facility's colour coding reduced to a painted band on each plate. The default. |
| **Axis** | The induction diagram: the same cube as the attendants' training material shows it, every face flooded with its lever's colour, clean and simplified. |
| **Draft** | The builders' plan, before any cube was built. |
| **Monolith** | The cube long after the last attendant: the same machine as a ruin, weathered under a low sun. |
| **Neon** | The attendant's own diagnostic overlay: how the machine sees the cube. |

Skins stay freely switchable. Station is the one the story is written for: placards are pale paint on steel, and the Margin's red pencil must stay legible on every wall of it.

## The arc

The twenty chambers before the last fall into four acts, followed by the epilogue.

### Act I · Orientation (I–V: Vault, Shaft, Divide, Spiral, Chimney)

Everything is new and clean. The Stencil is welcoming: induction placards, `WELCOME, ATTENDANT`. The Margin is a helpful tutor, and every hint is useful. The planet is dark.

- **The Vault:** the induction. The corridor names the printer, holds the Margin's first note (addressed and signed) and the facility's notice about such markings; the placard over the first lever says what the cubes are for and what levers do; the skylight shows the Crown.
- **The Shaft:** the first trap hole, and the first recovery log. The count starts at 1. The placard before the hole says a lost attendant is reprinted; the Margin, overhead, says it checked, and was printed back. From here on a trap hole is where a wrong move puts you, never scenery: the lever that leads nowhere (Spiral), the pit you failed to steer out of (Chimney).
- **The Chimney:** the Margin's thesis line, "Falling is just walking, faster. Steer." It reads as a tip about the chamber. It is also the ending.

### Act II · Maintenance (VI–XII: Staircase, Atrium, Ballast, Footing, Stopper, Counterweight, Deadman)

The attendant is now doing a job. Placards turn into duty rosters and schedules. Ballast mass appears. The Margin starts noticing things: the schedule never changes; no other attendant is ever seen in a cube; the field seems to have more dark cubes than it should.

- **The Atrium:** a Margin note on the back of one room says it has been here before, and that this cube was the same last time.
- **The Atrium** also holds the first ballast mass the attendant sees: a crate in a glass cage, sliding with every shift, with no job. The facility is watching it.
- **The Ballast:** the first crate the attendant moves, stencilled `BALLAST MASS · BM-2231`.
- **The Footing** and **The Stopper:** the mass as a tool (a step) and as an obstacle (a plug the facility thinks is correctly seated).
- **The Counterweight:** the second skylight. The Margin looked up: no lights, nobody up there.
- **The Deadman:** the act's last beat. A plate that takes the attendant's weight, for a crate that needs a gate held. The facility cannot tell an attendant from a crate, and says so without knowing what it has said.

### Act III · Wear (XIII–XIX: Turnstile, Lockout, Grate, Sieve, Surplus, Tide, Pendulum)

Cubes in this act show their age: Monolith-style wear can bleed into the other skins' textures here. There are scuffs on ceilings, and a crate left on a plate in a room that doesn't need it. The Margin becomes personal and frightened. A few lights appear on the planet.

- **The Lockout:** the one-shot lever. A Margin note near it: "Someone threw this one first. I found them." It points nowhere, because they fell.
- **The Grate:** "You cannot go down there. The crate can." The hint already works as both an instruction and a threat.
- **The Sieve:** the Grate's mirror. A glass door the attendant fits through and the mass does not. The Margin connects the lights on the planet to the dark cubes.
- **The Surplus:** the attendant throws ballast out of a trap hole on purpose. The log line, `BALLAST MASS RELEASED. REPLACEMENT NOT SCHEDULED.`, is the recovery line's opposite: attendants are replaced, masses are not.
- **The Tide:** the lever starts the cube turning on its own. It's the first time the machine moves without you. The Stencil calls it `AUTOMATIC TRIM`.
- **The Pendulum:** the cycle now swings a crate, and the door answers to the crate, not to you. The partition is low enough to be carried over, so the rule is when the field turns east, anything above it goes with it. The Margin reaches its conclusion: they didn't fall, they left, and a dark cube prints no one back.

### Act IV · The Orrery (XX)

The finale chamber holds a model of the whole field: a ring for the Crown, a plinth for the planet, and 13 cubes between them, 8 of them dark. Here the attendant can see how much of the field has gone. The machine has been compensating by printing more.

**The reveal.** In this chamber, or late in Act III, there is a crate stencilled `BALLAST MASS · AT-0416`: one number below the player's own serial. Spent attendants are recycled into ballast. The Stencil placard beside it says `THANK YOU FOR YOUR CONTINUED ALIGNMENT.` Leave it at that: the signature on the notes makes the connection.

The Margin's note in the Orrery is its handover: it did not get back to cube 0147, and it says where the way out is. Two more notes wait in the Descent.

### Epilogue · XXI · The Descent

The game has taught that falling is failure. It has also taught you to steer while falling (the Chimney). The last chamber turns the second lesson against the first.

The Descent has no exit door. Its only way out is a hole in the ceiling, which shows the Crown on the way in. A placard above the first lever states the rule the chamber turns on: a cube out of trim leaves the schedule, and its printer will not run. Under the facility's welcome the Margin says why the notes exist: it got this far once, and went back to write it all down. The two levers put the cube out of trim. The Stencil objects to the first (`ATTENDANT, THIS SHIFT IS NOT ON SCHEDULE. PLEASE RETURN TO YOUR STATION.`) and reports the second (`CUBE 0147 OUT OF TRIM · REMOVED FROM SCHEDULE · PRINTER OFFLINE. RECOVERY SUSPENDED.`), and the print bay goes dark. The player has switched recovery off, and knows it. The last Margin note is on the lip of the hole, readable only once that face is the floor: `Steer.`

The fall is long. The cube left behind is dark now. The field drifts past, the Crown overhead, the lights on the planet below. The game ends before landing: the view settles on the ground, one new light comes up there, and the recovery log appears for the last time: `ATTENDANT NOT RECOVERED.`, `CUBE 0147 DARK.`, the recovery count, `LIGHTS ON THE SURFACE: ONE MORE.`

Every trap hole in the game has been foreshadowing this.

## Hint lines

Hints still have to teach the chamber, and they're limited to one or two short sentences. Most current hints already work in the Margin's voice and should be kept. Proposed changes:

| Chamber | Current hint | Proposal |
| --- | --- | --- |
| I · The Vault | Levers pull gravity toward the wall their arrow points at. | Levers turn the cube until the arrow's wall faces the planet. That wall is your floor now. |
| II · The Shaft | The way out is a long way up. Walls are just floors you have not met yet. | Keep. |
| III · The Divide | Too tall to jump. But is it too tall to walk around? | Keep. |
| IV · The Spiral | One lever leads to the next. Not every lever leads somewhere. | Keep. |
| V · The Chimney | Falling is just walking, faster. Steer. | Keep. This is the thesis. Never change it. |
| VI · The Staircase | Climb the wall, step off the top, then walk round the divider. | Climb, step off, turn the cube back, walk round. Look where you land. |
| VII · The Atrium | A doorway is only a door when its wall is the floor. Work backwards from the exit. | Keep. |
| VIII · The Ballast | Gravity moves more than you do. | Keep. |
| IX · The Footing | (new) | A mass is a floor you can move. Mind where it stops. |
| X · The Stopper | (new) | Out is easy. Mind the way back. |
| XI · The Counterweight | Pin one crate where gravity cannot move it, then seat the other. | Keep. |
| XII · The Deadman | (new) | Something has to hold the gate for it. The crate can't be the one. |
| XIII · The Turnstile | A white lever turns gravity clockwise, as you face it. Same lever, different floor, different turn. | Keep. |
| XIV · The Lockout | Levers burn out after one use. Think before you throw one. R restarts. | Levers burn out after one use. Someone threw this one first. |
| XV · The Grate | You cannot go down there. The crate can. | Keep. |
| XVI · The Sieve | (new) | You can go through there. The crate cannot. It can go over. |
| XVII · The Surplus | (new) | One mass too many. There is a way to be rid of it. Choose with care. |
| XVIII · The Tide | The cycle will not wait. Be where the next shift needs you. | The cube turns itself now. Be where the next shift needs you. |
| XIX · The Pendulum | (new) | Watch the crate. The door keeps its time, not yours. |
| XX · The Orrery | Everything you have learned, in one room. The way out is the way you came in. R restarts. | Everything you have learned, in one room. The way out is the way you came in. |

The proposals above are in the game. Dropping "R restarts" is safe: the HUD's control strip shows the restart binding on every device.

### The ladder

Each chamber has three hints. The first is its own line from `finish()`, shown from the start. The second and third (`MORE_HINTS` in `src/hints.ts`) appear only for a player who is stuck: the second once they have been in the chamber for 150 seconds or have restarted it three times, the third at 360 seconds or seven restarts (either condition is enough). The line changes with a soft tick, and a restart keeps the line already reached. Hints only climb while the player is playing, so a menu, a fall or the win does not change them.

The second line points at the thing to notice (which lever, which surface, what the crate does) and never gives the order. The third may say what to do first, pointing with things the player can see or do ("the lever behind the screen", "the far wall", "the lever whose arrow points at a doorway wall", "the first lever you reach"), but it must stay true of the chamber as built: if a route changes, re-check both lines. The player has no compass, so the lines never use north, south, east or west, and never name a room by its letter (the Atrium's doorway placards read ROOM A, B and C, but a hint describes a room by what is in it); "left" and "right" are used only as the player faces when they come in (+Z ahead, +X on the right). The Descent's two lines are quiet and true, and do not hurry or explain the ending.

| Chamber | Hint 1 (its own) | Hint 2 (at 150 s or 3 restarts) | Hint 3 (at 360 s or 7 restarts) |
| --- | --- | --- | --- |
| I · The Vault | Levers turn the cube until the arrow's wall faces the planet. That wall is your floor now. | The placard above the first lever explains the arrows. Read it before you throw. | Throw the low lever on the far wall first. The next one is on a side wall. |
| II · The Shaft | The way out is a long way up. Walls are just floors you have not met yet. | The wall you climb has a gap right across it. Read the placard just before the opening. | Throw the low lever first, then climb the wall it makes, jumping the opening. |
| III · The Divide | Too tall to jump. But is it too tall to walk around? | The partition does not reach the ceiling. Look at the gap over it. | Throw the low lever before the partition first. Then walk up the wall and over it. |
| IV · The Spiral | One lever leads to the next. Not every lever leads somewhere. | Two levers share one wall. The ceiling lists the sequence. | Throw the lower of those two levers first. The next one is on the ceiling. |
| V · The Chimney | Falling is just walking, faster. Steer. | Straight down from the lever is a wide ledge. It catches anyone who drops. | Throw the lever, then steer across to the other side before the first ledge. |
| VI · The Staircase | Climb, step off, turn the cube back, walk round. Look where you land. | One lane of each cell has a block overhead. Look up before you climb. | Throw the lever in the lane with nothing hanging over it first, then climb the riser. |
| VII · The Atrium | A doorway is only a door when its wall is the floor. Work backwards from the exit. | Only one lever in the cube has its arrow pointing up. It is in a side room. | Throw the start lever, then take the room lever whose arrow faces a doorway wall. |
| VIII · The Ballast | Gravity moves more than you do. | The crate leaves its trough when gravity turns. Look at the plate it lands on. | Throw the lever on the glass screen first. Then the low lever on the wall it slides to. |
| IX · The Footing | A mass is a floor you can move. Mind where it stops. | The window is too high to reach. A low block in front of it stops a crate. | Throw the console lever beside the crate first. The crate slides clear of the low block. |
| X · The Stopper | Out is easy. Mind the way back. | A shelf on the wall opposite the plug is level with the mouth. Mind where the plug goes. | Throw the lever by the mouth first. Then the one whose arrow points away from the way in. |
| XI · The Counterweight | Pin one crate where gravity cannot move it, then seat the other. | The floor has a pit at one end. A crate that drops into it stays there. | Slide the crate nearest the pit into it. Only then send the other to its plate. |
| XII · The Deadman | Something has to hold the gate for it. The crate can't be the one. | The gate has its own plate out in the room. It holds only while you stand on it. | Throw the tunnel lever first. Stand on the gate plate until the crate is through. |
| XIII · The Turnstile | A white lever turns gravity clockwise, as you face it. Same lever, different floor, different turn. | A black gap sits in view of the floor lever, in the wall you came in by. | Throw the lever beside the entrance from the floor, then again from the new floor. |
| XIV · The Lockout | Levers burn out after one use. Someone threw this one first. | The white lever with a ring burns out when thrown. Look behind the screen on your left. | Throw the lever behind the screen first. Then walk to the white lever on the far wall. |
| XV · The Grate | You cannot go down there. The crate can. | One hole in the glass floor, at the far end of the crate's lane. Get the crate there. | Throw the middle lever first. Then throw the other one, further along the same row. |
| XVI · The Sieve | You can go through there. The crate cannot. It can go over. | The glass partition stops short of the ceiling. Look at the gap above it. | Throw the lever in the doorway first. Then the one near the exit. |
| XVII · The Surplus | One mass too many. There is a way to be rid of it. Choose with care. | The door wants one crate on its plate, not two. The RELEASE APERTURE can take one. | Throw the pane lever nearer the exit first. Leave the one nearer the entrance alone. |
| XVIII · The Tide | The cube turns itself now. Be where the next shift needs you. | The pillar and the tall wall each become a floor for one shift. Look at both. | Get into the pillar's lane before the first sideways shift, then climb its face. |
| XIX · The Pendulum | Watch the crate. The door keeps its time, not yours. | When the sideways shift comes, the partition stops whatever is at or below its top. | Stay low on the dais side of the partition for the next swing. Then climb the steps. |
| XX · The Orrery | Everything you have learned, in one room. The way out is the way you came in. | The ceiling has a lever of its own. Think about where it sends the crate. | Throw the low lever on the wall to your right as you come in. Then walk along that wall. |
| XXI · The Descent | The way out is down. All the way down. | There is no door in this cube. Look at the ceiling, and the lever on its edge. | Throw the lever under the trim notice first. Then walk up that wall to the ceiling lever. |

## Chamber script

Everything placed in the chambers, in the order of the arc. All of it is in the game. To change a line, edit it here and in the chamber file together. Lines break where the table shows ` / `.

How to read the table:

- **Voice:** **S** is the Stencil (the facility; placards on or beside the route). **M** is the Margin (the earlier attendant; notes mostly off the route).
- **Where:** the face the text is painted on, and the gravity it reads upright under. "On route" means you pass it anyway. "Off route" means you have to go looking, usually by throwing a lever you don't need or by looking up.
- Every chamber also has its cube serial stencilled near the entrance (`CUBE 0113`, and so on), reading under -Y. That row isn't repeated below. `npm test` checks that it matches the `cube` field in `CHAMBERS`.

### Act I · Orientation

The Stencil welcomes you. The Margin is a helpful tutor.

| Chamber | Voice | Text | Where | Why |
| --- | --- | --- | --- | --- |
| I · Vault | S | `ATTENDANT PRINTER 0112` / `KEEP THE BED CLEAR` | Corridor floor just ahead of the print bed, under -Y, top towards the room. On route: you walk over it leaving the bed. | Names the machine you started in. |
| I · Vault | M | *To whoever they print next: / read the walls. I wrote on them. / — 416* | Corridor's left wall (x = -2) beside the bed, under -Y. On route. | The first note: addressed, signed, and on the wall its red pencil shows up on in Axis. Says the notes are a person's, and that you were printed. |
| I · Vault | S | `UNAUTHORISED MARKINGS` / `WILL BE REMOVED` / `AT NEXT CLEANING` | Corridor's right wall, opposite the note, under -Y. On route. | The facility acknowledges the notes as an attendant's graffiti. It has not been cleaned. |
| I · Vault | S | `CUBE 0112 · ATTENDANT INDUCTION` / `THE CROWN SHIELDS THE PLANET FROM THE STAR.` / `THE FIELD HOLDS UP THE CROWN.` / `EACH CUBE IS A COUNTERWEIGHT.` / `LEVERS TURN THE CUBE.` / `THE ARROW'S WALL WILL FACE THE PLANET.` | +Z wall above the first lever, under -Y. On route. | States the job plainly in the first room: what the cubes are for, and what a lever does. |
| I · Vault | S | `ATTENDANT RECLAIMER` / `STAND ON THE PLATE.` / `YOU WILL BE REPRINTED` / `AT THE NEXT CUBE.` | +X wall between the second lever and the exit hole, under +X, top towards the hole. On route: you walk over it to the way out. | Says what the lit corridor at the end of every chamber is. |
| I · Vault | S | `VIEWPORT · THE CROWN` | Ceiling, between the doorway and the skylight, under -Y, read looking up. On route. | Names what the ring in the skylight is. |
| I · Vault | M | *You'll get used to it. / The turning, I mean.* | +X wall (the exit wall), low, under +Z: readable only while standing on the +Z wall. On route but easy to miss. | The tutor's voice, once you have turned. |
| II · Shaft | S | `OPEN APERTURE` / `LOST ATTENDANTS` / `ARE REPRINTED` / `AT THE ENTRANCE` | +X wall on the climb, just short of the trap hole, under +X. On route: you read it walking towards the hole. | The first trap hole, and what recovery is, in the facility's words. |
| II · Shaft | M | *It is a long way up. / It is a longer way down. / I checked. It printed me back.* | -X wall overhead during the climb under +X, top towards +Y. Off route: you have to look up. | The Margin jumped, and it did not work. The cage, planted where the first recovery happens. |
| III · Divide | S | `PARTITION · DO NOT CLIMB` | Near face of the partition, under -Y. On route. | Deadpan: the solution is to walk up the wall, not to climb. |
| III · Divide | M | *It says don't climb. / It doesn't say anything about walking.* | Far face of the partition, under +X. On route, just after the shift. | A tutor's wink that confirms what you just did. |
| IV · Spiral | S | `TRIM SEQUENCE: -Y · -X · +Y · +X` | Ceiling (+Y face), under +Y. On route, read once you are standing there. | The facility shows you the whole route, readable only from partway through it. |
| IV · Spiral | M | *Not every lever leads somewhere. / This one led me here.* | -X wall beside the decoy lever, under -X. Beside the route, read before the throw. | It echoes the hint, and it is a true warning: that lever turns a wall with a hole in it into the floor under you. |
| V · Chimney | S | `DESCENT CORRIDOR · KEEP TO THE LEDGE` | Tunnel wall near the lever, under -Y. After the shift it reads sideways as you fall past. | Instruction you can only read before you need it. |
| V · Chimney | M | *Missed it too. / Steer earlier.* | Top face of the decoy ledge, under +Z. Only seen if you land there. | Consolation, and the first "steer". The ending calls back to it. |

### Act II · Maintenance

Placards turn into rosters and schedules. The Margin starts noticing things.

| Chamber | Voice | Text | Where | Why |
| --- | --- | --- | --- | --- |
| VI · Staircase | S | `RISER MAINTENANCE` / `3 CLIMBS SCHEDULED` / `SCHEDULE UNCHANGED` / `SINCE CYCLE 1` | First riser face, under -Y. On route. | The schedule never changes. |
| VI · Staircase | M | *Same stairs every time. / I counted.* | West face of the next cell's sealed block, under +X, above the gap you step off. Off route: you have to look up during the first climb. | The Margin notices repetition. |
| VII · Atrium | S | `ROOM A`, `ROOM B`, `ROOM C`, `EXIT` | Above each doorway, each reading under the gravity that makes its wall the floor. On route. | Wayfinding that only reads right under the correct gravity, which helps you plan the route. |
| VII · Atrium | M | *I have been here before. / This cube was the same / last time.* | Side wall of room B, under -X. (Its back wall is the floor under -X.) On route, beside the lever. | From the NARRATIVE arc: the cubes repeat. |
| VII · Atrium | S | `MASS UNDER OBSERVATION` / `NO ACTION REQUIRED` | +Z wall under the glass cage, under -Y. In view from the start. | The first ballast mass, a chamber before it matters. The facility watches it and does nothing. |
| VIII · Ballast | S | `BALLAST MASS SEATS HERE` / `DO NOT OBSTRUCT` | East wall beside the plate, under +X. On route. | Names the crate's job. (The crate's own stamp `BM-2231` is already in game.) |
| VIII · Ballast | M | *The crates don't need us. / They just need someone to throw the lever.* | Bottom of the trough under the crate, under -Y. Visible only after the crate slides out. | Unease about what the attendants are for. |
| IX · Footing | S | `NORTH BAY: CLEANING 0700` / `SILL HEIGHT: 2.6` / `STEP ISSUED: 1` | Partition's south face, west of the window, under -Y. On route. | A roster that issues the mass as a step. |
| IX · Footing | M | *Scuffs on the top of the mass. / Boots. Not mine.* | Partition's south face above the crate's ledge, under -Y. In the first view. | Someone has stood on it before. |
| X · Stopper | S | `AUXILIARY EXIT` / `BALLAST MASS SEATED` / `DO NOT UNSEAT` | North wall above the plugged mouth, under -Y. On route. | The facility thinks the plug is where it belongs. |
| X · Stopper | M | *It comes out easily. / I put it back where I found it. / Twice.* | South wall beside the two levers, under -Z. On route, read on landing there. | The Margin made the mistake the chamber is built around, and says so without giving the order. |
| XI · Counterweight | S | `TRIM REQUIRES 2 MASSES` / `ATTENDANTS ON THIS CYCLE: 1` | +Z wall beside the door, under -Y. On route. | "1" is the first hint that you are alone. |
| XI · Counterweight | M | *I have never met another attendant. / The roster has room for hundreds.* | -X wall above the pit, under -X. Off route: away from the lever on that wall. | Picks up the Stencil's "1". |
| XI · Counterweight | S | `VIEWPORT · THE CROWN` | Ceiling, between the entrance wall and the skylight, under -Y, read looking up. | The second skylight, named like the first. |
| XI · Counterweight | M | *Look up. That is what we hold up. / It keeps the star off the ground. / Nobody is up there.* | +Z wall facing the entrance, above the Stencil, under -Y. On route. | What the work is for, in the Margin's words, and that the machine runs unattended. |
| XII · Deadman | S | `PLATE ACCEPTS ANY MASS` / `ATTENDANT MASS: ACCEPTED` | East wall beside the player's plate, under +X. On route. | The facility cannot tell an attendant from a crate. |
| XII · Deadman | M | *It can't tell us / from the crates.* | East wall above the plate, under +X. On route. | One dry line, no explanation. It sets up the reveal. |

### Act III · Wear

The cubes show their age. The Margin turns personal and frightened.

| Chamber | Voice | Text | Where | Why |
| --- | --- | --- | --- | --- |
| XIII · Turnstile | S | `ROTATIONAL LEVER` / `TURNS CLOCKWISE AS FACED` | Start-corner wall beside lever S, under -Y. On route. | Teaches the relative lever in the facility's words. |
| XIII · Turnstile | M | *More of them are dark every time I fall.* | +X wall beside the wrong-turn lever, under +X. Beside the route, read before the throw. | Ties the note to the dark cubes you see during a fall, at the lever that causes one. |
| XIV · Lockout | S | `SINGLE-USE LEVER` / `ONE THROW PER ATTENDANT` | +Z wall above the relative lever, under -Y. On route. | "Per attendant" reads two ways. |
| XIV · Lockout | M | *I found them.* | Beside the trap hole in the -X wall, under -X. Only seen by someone stranded there after throwing the one-shot lever first. | Completes the hint "Someone threw this one first." Only the players who made that mistake see it. |
| XV · Grate | S | `LOWER DECK · BALLAST ONLY` | Glass floor, under -Y, read looking down. On route. | Sets up the crate's route. |
| XV · Grate | M | *Everything ends up below. / The crates just get there first.* | East wall, under +X, where the shift east puts you. On route. | Foreshadows both the reveal and the Descent. |
| XVI · Sieve | S | `MASS FIELD` / `ATTENDANTS MAY PASS` | North wall near the crate, under -Y. On route. | Names the field as the facility would. |
| XVI · Sieve | M | *There are lights down there now. / One for every cube gone dark.* | East wall, under +X, where the first shift puts you. On route. | Ties the planet's lights to the dark cubes: the two things the falls have been showing. |
| XVII · Surplus | S | `TRIM REQUIRES 1 MASS` / `MASSES PRESENT: 2` | +X wall above the plates, under -Y. On route. | One too many, in the facility's words. |
| XVII · Surplus | S | `RELEASE APERTURE` | -X wall above the hole, under -Y. On route. | A bland name for a trap hole used on purpose. |
| XVII · Surplus | S (log) | `BALLAST MASS RELEASED. REPLACEMENT NOT SCHEDULED.` | HUD log line whenever a crate falls out of a cube (`MASS_RELEASED`). | Attendants are replaced. Masses are not. |
| XVII · Surplus | M | *It lets go of whatever / it has no use for.* | -X wall above the Stencil by the hole, under -Y. On route. | The Margin stops short of asking which it is. |
| XVIII · Tide | S | `AUTOMATIC TRIM ENGAGED` / `ATTENDANT PRESENCE OPTIONAL` | Wall beside the sequence lever, under -Y. On route. | The machine no longer needs you, and it tells you so politely. |
| XVIII · Tide | M | *It doesn't need us any more. / I don't think it ever did.* | The high ledge, under -Y, top towards the tall wall. On route, read while waiting for the last shift. | The Margin's fear peaks. |
| XIX · Pendulum | S | `DOOR HOLDS BALLAST POSITION` / `NOT OPERATOR POSITION` | North wall, west of the dais, beside the raised exit door, under -Y. On route. | The door follows the crate, not you. |
| XIX · Pendulum | M | *They didn't fall. They left. / A dark cube prints no one back.* | Partition's west face, low on the face (y 1.5), under -Y; you stand on that face through the +X phase. On route. | The Margin's conclusion, and the plan: fear turns to resolve. |

### Act IV · The Orrery

| Chamber | Voice | Text | Where | Why |
| --- | --- | --- | --- | --- |
| XX · Orrery | S | `FIELD ALIGNMENT: 38% OF CUBES RESPONDING` / `CROWN SHIELD HOLDING AT 38%` / `ATTENDANT SUPPLY INCREASED TO COMPENSATE` | North wall, under +Z. On route. | The machine compensates for the dark cubes by printing more of you. The 38% matches the dark share of the field at this chamber; `npm test` keeps them in step. The second line is the cost of every departure. |
| XX · Orrery | S | `STAR`, `CROWN`, `PLANET` | On the model: the ring's and the plinth's faces towards the entrance, under -Y. In view from the doorway. | Labels the model, so the 13 cubes between them read as the field. |
| XX · Orrery | — | A fixed crate stamped `BALLAST MASS` / `AT-0416` | On the ceiling beside the walk to the relative lever, under +Y. On route. | **The reveal.** It's one number below your serial, and it is the signature on the notes. |
| XX · Orrery | S | `THANK YOU FOR YOUR` / `CONTINUED ALIGNMENT.` | Beside the AT-0416 crate, under +Y. | Leave it at that. |
| XX · Orrery | M | *If you're reading this, I didn't / get back to cube 0147. / There is a hole in its ceiling. / — 416* | West wall, far from the lever there, under -X. Off route. | The handover. No longer cut off mid-line: it says where the way out is, and that its writer never used it. |

### Epilogue · The Descent

| Chamber | Voice | Text | Where | Why |
| --- | --- | --- | --- | --- |
| XXI · Descent | S | `CUBE 0147 · BALANCE ACCESS` / `AUTHORISED SHIFTS ONLY` | +Z wall facing the entrance, under -Y. On route. | The facility's last welcome. |
| XXI · Descent | M | *I got this far once. / I went back to write it all down. / Don't go back. / — 416* | +Z wall facing the entrance, under the Stencil, under -Y. On route. | Why the notes exist, and why their writer is not here. |
| XXI · Descent | S | `A CUBE OUT OF TRIM` / `LEAVES THE SCHEDULE.` / `ITS PRINTER WILL NOT RUN.` | +X wall above the first lever, under -Y. On route, read before the throw. | The rule the chamber turns on, stated by the facility as a caution. |
| XXI · Descent | S (log) | `ATTENDANT, THIS SHIFT IS NOT ON SCHEDULE. PLEASE RETURN TO YOUR STATION.`, then `CUBE 0147 OUT OF TRIM · REMOVED FROM SCHEDULE · PRINTER OFFLINE. RECOVERY SUSPENDED.` | HUD log line on each lever throw (`descentAlarm`). The print bay goes dark on the second. | It objects, then reports exactly what the player has done. |
| XXI · Descent | M | *Steer.* | The lip of the ceiling hole, under +Y. On route, the last thing you read. | The Margin's last word. |
| XXI · Descent | S (log) | `ATTENDANT NOT RECOVERED.` / `CUBE 0147 DARK.` / `RECOVERIES THIS CYCLE: n` / `LIGHTS ON THE SURFACE: ONE MORE.` | The end card (`NOT_RECOVERED`, `endCard`), over the planet and the new light. | The recovery log, one last time: the cube is dark like the others, and there is one more light. |

### For playtesting

- **The Atrium labels may be too helpful.** Labels that read right only under the correct gravity do give the route away. If that makes the puzzle too easy, cut them to the `EXIT` label alone.
- **Two notes depend on mistakes:** the Chimney's decoy ledge and the Lockout's trap hole. Only players who make that mistake will see them. That's deliberate, but it means most players will miss them.
- **Two notes are warnings:** the Spiral's and the Turnstile's sit beside the lever that drops you out of the cube. Check that they are read before the throw, not after the recovery.
- **The Deadman's note** carries the most weight of any line before the reveal. Check that it is read (it is above the plate you stand on) and that it does not give the reveal away.
- **The first note and the notice** in the Vault's corridor are large and at a glancing angle from the bed. Check that both are read, and read as a pair.
- **The storm:** check that a storm reads as cause and effect (star flares, ring flares, aurora on the planet) from the title view and through a skylight, and that the log line once a minute in the two skylight chambers is not a nuisance. `__debug.storm()` starts one.
- **The reclaimer:** check the plate can be walked onto at every exit under the gravity you arrive with, that the half-second on the plate feels like pressing a button and not a delay, especially where the exit is a drop (the Vault, the Atrium, the Lockout, the Orrery), and that the de-print wipe under the win screen leaves the log legible.
- **The Crown through each skylight:** check it is legible, whole, and plainly a structure from the floor of the Vault and of the Counterweight, in every skin (the glass tints the sky).
- **The print-in** plays at every start and restart. Check that it is not tiresome after many restarts of one chamber. Repeat starts of the same chamber now use a 0.3 s wipe (the first start keeps the full 0.85 s, or 0.45 s under reduced motion).
- **The Orrery's model** should read from the doorway: ring above, cubes between, plinth below, lit against dark. Check the lit cubes read as lit in every skin, and that the `CROWN` label, high overhead, is legible.
- **The Descent's notice** must be read before the first throw, and the second alarm line is long: check it fits a phone.
- **The new light** has to be visible under the end card, wherever the player was looking when the fall ended.
- **Off-route notes should be findable:** the Shaft, Staircase, Counterweight (the pit-wall one) and Orrery notes ask you to look up or wander. Check that they can be found, and read from where you would stand.
- **Line length:** long lines are squeezed to fit their placard. Every line is at least 85% of its natural width; keep new lines inside that, or break them.

## Building it

In rough order of cost:

1. **Text only.** *Status: built.* The Stencil's strings live in `src/narrative.ts`; each chamber's cube serial is the `cube` field in `CHAMBERS` (gaps in the numbering are cubes that went dark, widening each act). The HUD shows a log line under the hint: the duty line when a chamber starts, the recovery line after a fall. Rewrite the hints and the win and fall messages. Add the Stencil's log lines to the HUD for the `falling` → reset transition (keep a recovery count per run in `src/app/`, not in saved progress). Give each chamber a cube serial number for the chamber select. Keep the strings in a Babylon-free module so Node can test them.
2. **Fall vista.** *Status: built, except the cube with your hole.* `src/environment/ballastField.ts` lays out 48 cubes around the fall line for each fall (Babylon-free, tested by Node), and `SpaceBackdrop` draws them: lit cubes glow at their seams and turn a quarter turn every few seconds; dark ones tumble. The chamber you just left is wrapped in a hull dressed the same way (`chamberHull`), so from outside it is one of them; the hull is invisible from inside. The dark share grows from 15% at the first chamber to 65% at the last (`darkFraction` in `src/narrative.ts`). Add drifting and tumbling cubes to `SpaceBackdrop`. It only shows after an escape, so this costs nothing in normal play.
3. **Facing text.** *Status: built; the writing pass is next.* `b.placard(at, normal, readAs, text)` and `b.note(...)` paint text on a face as a canvas texture on a thin plane, upright under `readAs` (floor and ceiling text takes a `top`). Stencils use the bundled Allerta Stencil, painted per skin (`placardInk`: grey paint in Axis, flaking white in Monolith, ink outline in Draft, glowing in Neon). Notes use the bundled Caveat in red grease pencil with a per-letter wobble, the same in every skin. `npm test` checks that each one sits on a real, uncovered face. So far there are two: the induction placard in the Vault, and a note in the Shaft on the face overhead during the climb. The writing pass is done: see "Chamber script" above.
4. **Crate serials.** *Status: built.* `addCrate(center, size, { stamp })` stencils every face. Every crate is stamped `BALLAST MASS` with a `BM-` serial; the `AT-0416` crate waits for the reveal.
5. **Planet lights.** *Status: built.* The planet's night side is dark through Acts I and II. From the Turnstile (the first chamber of Act III) a few lights appear, more each chamber, until the Orrery. `planetLights` in `src/narrative.ts` sets how many; `SpaceBackdrop` draws them as small warm points.
6. **The Descent.** *Status: built.* `descent.ts` (id `descent`, cube `0147`): route `-Y → +X → +Y` on two one-shot levers, out through a hole in the ceiling. The chamber is marked `ending`, so leaving it starts the `descending` state (live, but R does nothing) and saves the clear. The fall lasts 25 s (`DESCENT_DURATION`) and ends just above the planet; then the `ended` state shows the end card, and any confirm returns to the title. The Crown is a dark spoked ring (diameter 160, 330 above the view), drawn by `SpaceBackdrop`: overhead in every fall, and in view from inside a `vista` chamber. The e2e suite plays the whole ending, using `__debug.endFall()` to skip the 25 s.
7. **Print bay and print-in.** *Status: built.* `Builder.finish()` calls `addPrinter` to stand a print bay (bed, posts, gantry, head) around every spawn point; it is in no collision list. `BuiltLevel.printer.setOnline(false)` darkens it, which `syncPrinter` in `src/app/` does in an ending chamber once `DESCENT_OUT_OF_TRIM` levers are thrown. `HUD.printIn` is the wipe, played by `startLevel` and when the title lifts.
8. **Windows and the title view.** *Status: built.* A skylight is a `slab` hole filled with `b.glass`, in a chamber that passes `vista: true` to `finish()`; `BackdropFrame.vista` then shows the stars, field and Crown from inside. Vista chambers: the Vault, the Counterweight, the Descent. Behind the title, `src/app/` switches to a camera outside the cube and anchors the backdrop on the chamber (`anchor`, `crownDistance`), so the hull, the Crown and the planet are in one frame.
9. **The Orrery's model.** *Status: built.* A ring of four blocks, a plinth, and 13 `b.modelCube`s (5 lit), with `CROWN` and `PLANET` stencils.
10. **The ending's light and dark hull.** *Status: built.* `hullDark` dresses the Descent's cube as a dark field cube once its printer is off; in `ended` the view turns to the ground and `arrival` brings up one light on the planet under the end card, which is not quite opaque.
11. **The Crown as shield.** *Status: built.* `stormStrength` (Babylon-free, tested) drives a `storm` uniform on the star's glare, the Crown's coil glow and the planet's aurora; `stormLine` is logged from `src/app/` when a storm breaks with the Crown in view.
12. **The reclaimer.** *Status: built.* Its plate is the win condition; `npm test` checks every chamber but the Descent has one with room to stand on it. `Builder.addBay` builds both the printer and the reclaimer; `BuiltLevel.reclaimer` is its bed. `HUD.printOut` plays on a win, and the work log ends `ATTENDANT RECLAIMED. REPRINT AT CUBE ....`

## Rules for writers

- The Stencil explains *what*, plainly: the job, the printer, the schedule. It never explains *why*. The Margin asks why, and says what it wants. The Stencil does say what the Crown does and what the exit does, because those are part of the job. Nobody explains the builders or the recycling.
- A player who reads only the on-route text should still come away knowing the premise: the cubes are counterweights, you are printed, a fall prints you back, and a cube out of trim does not.
- The Stencil never acknowledges that anything is wrong.
- The Margin never gives a wrong answer.
- No villain. Nothing here is malicious; the machine is just still running.
- Keep every line short enough to read mid-shift.
