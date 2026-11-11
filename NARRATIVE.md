# Narrative: The Ballast

The story Shiftbound tells, and how the game tells it. This is a design document, not a script. "Building it" at the end tracks what is built; where an idea needs engine work, that is noted there.

## The premise in one paragraph

Hundreds of hollow cubes hang in the sky above a planet. They are ballast: the moving counterweights of a vast balancing machine that holds something even larger aloft overhead. To keep the balance, each cube must be turned on a schedule so that a particular face points at the planet. The cubes are designed to be turned from inside, by hand, with levers. You are the hand: an **attendant**, printed at a chamber's entrance, sent through the cube to throw its levers in the right order, and then sent on to the next cube in the queue. The machine still runs its schedule perfectly. Whoever it was balancing for left long ago.

## Why this fits the game we already have

The premise mostly reinterprets things the game already does:

| What the game does | What it means in the story |
| --- | --- |
| The planet always lies the way gravity points. | Levers don't change gravity. They turn the whole cube until a new face points at the planet. Gravity is real, and it always comes from the planet. |
| The chambers float in empty space. | They have to float freely, or they couldn't be turned. |
| A chamber's exit leads to the next chamber. | When the cube is set, the attendant moves on to the next cube in the queue. |
| Falling through a trap hole resets you to the entrance. | The attendant who fell is lost. A new one is printed at the entrance. The machine calls this a recovery. |
| The win screen shows time and number of shifts. | It is a work log. The machine is counting your labour. |
| Crates slide with gravity and hold down plates. | They are ballast mass, the cubes' trim weights. |
| The finale is called the Orrery. | It is the cube where the whole machine's alignment can be seen, and changed. |

## The world

- **The Ballast Field.** The cubes, each a few dozen units across, scattered at different heights and orientations through the sky. Most keep turning on schedule. Some have gone dark and tumble.
- **The Crown.** What the field balances: a structure overhead, too high and too large to make out. It is never seen clearly. Its lights are off.
- **The planet.** Always "down", wherever down currently is. Early in the game its night side is dark. Later, a few lights appear on its surface, which raises the question the ending answers.
- **The builders.** Never seen and never named. They left behind the placards, the schedule and the attendants. Whether they died, went up to the Crown or went down to the planet is left open until the end, and only half answered then.

## The attendant

The player character never speaks and is never seen, except in one place (see "The reveal" below). The attendant is manufactured, serial-numbered and disposable. The facility addresses the attendant only by serial number, for example `AT-0417`. The number is fixed for a playthrough, so it reads like a name.

Each time the attendant falls, a new one is printed and the old one is gone. The number stays the same. The facility never says whether the new one is the same attendant, and the player shouldn't be sure.

## The two voices

The story is told in two voices. They must never be confused with each other.

### The Stencil

This is the facility's voice. It appears on placards stencilled on walls and in the HUD's log lines (fall recoveries, chamber complete, shift counts). It is institutional, deadpan, procedural and polite, and it never jokes on purpose. It assumes that everything is fine and that the builders are still in charge. It is creepy because it does not notice what has happened.

Examples:

- `CUBE 0112 · TRIM SCHEDULE NOMINAL`
- `ATTENDANT RECOVERED. RECOVERIES THIS CYCLE: 3.`
- `BALLAST MASS. DO NOT OBSTRUCT.`
- `THANK YOU FOR YOUR CONTINUED ALIGNMENT.`
- `CUBE SET. 4 SHIFTS LOGGED. PROCEED TO CUBE 0113.`

### The Margin

The Margin is a predecessor: an earlier attendant who annotated the manual and wrote on the walls of the cubes they passed through. They wrote by hand, in short lines, often on surfaces that can only be reached or read under a gravity the route doesn't need. They figured out more than the Stencil admits. Over the course of the game the Margin goes from helpful, to personal, to frightened, to resolved.

The chamber hints already sound like the Margin: "Walls are just floors you have not met yet." "Falling is just walking, faster. Steer." Treat the hint line as the page of the manual for that cube, with the Margin's note on it. Early hints are mostly manual. Later ones are mostly margin.

Rules for the Margin:

- It never contradicts the solution. A hint must still teach what the chamber teaches.
- It never names the builders or explains the Crown.
- Its last line is written in the final chamber, and the line is `Steer.`

## Telling the story with the game's own rules

### Text that faces one floor

Every box face is already the floor under exactly one gravity axis. A placard or a Margin scrawl is painted on one face and set upright for that face's gravity. Under any other gravity it reads sideways or upside down. To read it comfortably, you have to shift onto its floor.

- Stencil placards sit on the faces the route uses, so you read them in passing.
- Margin notes favour the faces the route doesn't use, such as ceilings, the backs of partitions, and walls that are only floors under a decoy lever. Finding them is optional, and it rewards playing with the levers.

### Recovery

Falling through a trap hole is the most frequent story beat, so it should carry weight:

- During the fall, the backdrop shows other cubes of the field nearby: some lit and turning, some dark and tumbling, and one, rarely, with a hole in the same place as the one you just fell through.
- When the attendant is reset, the HUD shows a Stencil log line with the running recovery count. The count never comments on itself.
- Never comment on deaths in any other way. The number does the work.

### The work log

The win screen keeps its time and shift count, but in the Stencil's words (`CUBE SET. 4 SHIFTS LOGGED.`). The chamber select can show each cube's serial number alongside its name. Chamber names stay as they are; they are what the attendants call the cubes, not what the facility calls them.

### Ballast mass

Crates are stencilled `BALLAST MASS` with a serial number. Early on the serials have a different prefix (`BM-…`). In the last act, the player finds a crate whose serial number is in the attendant format. See "The reveal".

### Skins as ways of seeing

The four skins are four views of the same cube:

| Skin | What it is in the story |
| --- | --- |
| **Draft** | The builders' plan, before any cube was built. |
| **Axis** | The facility as it was meant to be seen: colour-coded for attendants, clean, new. The default. |
| **Monolith** | The cube as it actually is now: weathered concrete under a low sun, many years later. |
| **Neon** | The attendant's own diagnostic overlay: how the machine sees the cube. |

Skins can stay freely switchable. If they ever unlock instead, Monolith should come last: it is the truth.

## The arc

The twenty chambers before the last fall into four acts, followed by the epilogue.

### Act I · Orientation (I–V: Vault, Shaft, Divide, Spiral, Chimney)

Everything is new and clean. The Stencil is welcoming: induction placards, `WELCOME, ATTENDANT`. The Margin is a helpful tutor, and every hint is useful. The planet is dark.

- **The Vault:** the first placard explains that levers turn the cube, establishing the premise in one line.
- **The Shaft:** the first trap hole, and the first recovery log. The count starts at 1. From here on a trap hole is where a wrong move puts you, never scenery: the lever that leads nowhere (Spiral), the pit you failed to steer out of (Chimney).
- **The Chimney:** the Margin's thesis line, "Falling is just walking, faster. Steer." It reads as a tip about the chamber. It is also the ending.

### Act II · Maintenance (VI–XII: Staircase, Atrium, Ballast, Footing, Stopper, Counterweight, Deadman)

The attendant is now doing a job. Placards turn into duty rosters and schedules. Ballast mass appears. The Margin starts noticing things: the schedule never changes; no other attendant is ever seen in a cube; the field seems to have more dark cubes than it should.

- **The Atrium:** a Margin note on the back of one room says it has been here before, and that this cube was the same last time.
- **The Atrium** also holds the first ballast mass the attendant sees: a crate in a glass cage, sliding with every shift, with no job. The facility is watching it.
- **The Ballast:** the first crate the attendant moves, stencilled `BALLAST MASS · BM-2231`.
- **The Footing** and **The Stopper:** the mass as a tool (a step) and as an obstacle (a plug the facility thinks is correctly seated).
- **The Deadman:** the act's last beat. A plate that takes the attendant's weight, for a crate that needs a gate held. The facility cannot tell an attendant from a crate, and says so without knowing what it has said.

### Act III · Wear (XIII–XIX: Turnstile, Lockout, Grate, Sieve, Surplus, Tide, Pendulum)

Cubes in this act show their age: Monolith-style wear can bleed into the other skins' textures here. There are scuffs on ceilings, and a crate left on a plate in a room that doesn't need it. The Margin becomes personal and frightened. A few lights appear on the planet.

- **The Lockout:** the one-shot lever. A Margin note near it: "Someone threw this one first. I found them." It points nowhere, because they fell.
- **The Grate:** "You cannot go down there. The crate can." The hint already works as both an instruction and a threat.
- **The Sieve:** the Grate's mirror. A field that stops the mass and lets the attendant through.
- **The Surplus:** the attendant throws ballast out of a trap hole on purpose. The log line, `BALLAST MASS RELEASED. REPLACEMENT NOT SCHEDULED.`, is the recovery line's opposite: attendants are replaced, masses are not.
- **The Tide:** the lever starts the cube turning on its own. It's the first time the machine moves without you. The Stencil calls it `AUTOMATIC TRIM`.
- **The Pendulum:** the cycle now swings a crate, and the door answers to the crate, not to you.

### Act IV · The Orrery (XX)

The finale chamber holds a model of the whole field: the cubes and the Crown above them. Here the attendant can see that the field is out of balance in exactly the way that a missing set of attendants would cause. The machine has been compensating by printing more.

**The reveal.** In this chamber, or late in Act III, there is a crate stencilled `BALLAST MASS · AT-0416`: one number below the player's own serial. Spent attendants are recycled into ballast. The Stencil placard beside it says `THANK YOU FOR YOUR CONTINUED ALIGNMENT.` Leave it at that and explain nothing.

The Margin's notes stop in the Orrery, one short of the end.

### Epilogue · XXI · The Descent

The game has taught that falling is failure. It has also taught you to steer while falling (the Chimney). The last chamber turns the second lesson against the first.

The Descent has no exit door. Its only way out is a hole facing the planet, and its levers are wired to break the balance instead of keeping it. The Stencil objects politely and with growing alarm (`ATTENDANT, THIS SHIFT IS NOT ON SCHEDULE.`). The last Margin note is on the lip of the hole, readable only once that face is the floor: `Steer.`

The fall is long. The field drifts past, then the Crown's silhouette, then the lights on the planet. The game ends before landing, with the recovery log for the last time: `ATTENDANT NOT RECOVERED.`

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
| I · Vault | S | `CUBE 0112 · ATTENDANT INDUCTION` / `LEVERS TURN THE CUBE.` / `THE ARROW'S WALL WILL FACE THE PLANET.` | +Z wall above the first lever, under -Y. On route. | Establishes the premise in the first room. |
| I · Vault | M | *You'll get used to it. / The turning, I mean.* | +X wall (the exit wall), low, under +Z: readable only while standing on the +Z wall. On route but easy to miss. | The first sign that someone was here before you. |
| II · Shaft | S | `OPEN APERTURE` / `ATTENDANT RECOVERY` / `IS AUTOMATIC` | +X wall on the climb, just short of the trap hole, under +X. On route: you read it walking towards the hole. | The first trap hole, and the first sign that you are replaceable. |
| II · Shaft | M | *It is a long way up. / It is a longer way down. / I checked.* | -X wall overhead during the climb under +X, top towards +Y. Off route: you have to look up. | The Margin has fallen too. |
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
| XVI · Sieve | M | *It let me through. / I keep wondering why.* | East wall, under +X, where the first shift puts you. On route. | Being let through is not reassuring. |
| XVII · Surplus | S | `TRIM REQUIRES 1 MASS` / `MASSES PRESENT: 2` | +X wall above the plates, under -Y. On route. | One too many, in the facility's words. |
| XVII · Surplus | S | `RELEASE APERTURE` | -X wall above the hole, under -Y. On route. | A bland name for a trap hole used on purpose. |
| XVII · Surplus | S (log) | `BALLAST MASS RELEASED. REPLACEMENT NOT SCHEDULED.` | HUD log line whenever a crate falls out of a cube (`MASS_RELEASED`). | Attendants are replaced. Masses are not. |
| XVII · Surplus | M | *It lets go of whatever / it has no use for.* | -X wall above the Stencil by the hole, under -Y. On route. | The Margin stops short of asking which it is. |
| XVIII · Tide | S | `AUTOMATIC TRIM ENGAGED` / `ATTENDANT PRESENCE OPTIONAL` | Wall beside the sequence lever, under -Y. On route. | The machine no longer needs you, and it tells you so politely. |
| XVIII · Tide | M | *It doesn't need us any more. / I don't think it ever did.* | The high ledge, under -Y, top towards the tall wall. On route, read while waiting for the last shift. | The Margin's fear peaks. |
| XIX · Pendulum | S | `DOOR HOLDS BALLAST POSITION` / `NOT OPERATOR POSITION` | North wall above the exit door, under -Y. On route. | The door follows the crate, not you. |
| XIX · Pendulum | M | *I stood where it said. / It still came round.* | Partition's west face, under -Y; you stand on that face through the +X phase. On route. | One step on from the Tide's note. |

### Act IV · The Orrery

| Chamber | Voice | Text | Where | Why |
| --- | --- | --- | --- | --- |
| XX · Orrery | S | `FIELD ALIGNMENT: 38% OF CUBES RESPONDING` / `ATTENDANT SUPPLY INCREASED TO COMPENSATE` | North wall, under +Z. On route. | The machine compensates for the dark cubes by printing more of you. The 38% matches the dark share of the field at this chamber; `npm test` keeps them in step. |
| XX · Orrery | — | A fixed crate stamped `BALLAST MASS` / `AT-0416` | On the ceiling beside the walk to the relative lever, under +Y. On route. | **The reveal.** It's one number below your serial. |
| XX · Orrery | S | `THANK YOU FOR YOUR` / `CONTINUED ALIGNMENT.` | Beside the AT-0416 crate, under +Y. | Leave it at that. |
| XX · Orrery | M | *If you're reading this, I didn't* | West wall, far from the lever there, under -X. Off route. | The Margin's last note, cut off mid-line. Its final word, "Steer.", waits in the Descent. |

### Epilogue · The Descent

| Chamber | Voice | Text | Where | Why |
| --- | --- | --- | --- | --- |
| XXI · Descent | S | `CUBE 0147 · BALANCE ACCESS` / `AUTHORISED SHIFTS ONLY` | +Z wall facing the entrance, under -Y. On route. | The facility's last welcome. |
| XXI · Descent | S (log) | `ATTENDANT, THIS SHIFT IS NOT ON SCHEDULE.`, then `CUBE 0147 OUT OF TRIM. PLEASE RETURN TO YOUR STATION.` | HUD log line on each lever throw (`descentAlarm`). | It objects, politely and with growing alarm. |
| XXI · Descent | M | *Steer.* | The lip of the ceiling hole, under +Y. On route, the last thing you read. | The Margin's last word. |
| XXI · Descent | S (log) | `ATTENDANT NOT RECOVERED.` | The end card, as the fall ends. | The recovery log, one last time. |

### For playtesting

- **The Atrium labels may be too helpful.** Labels that read right only under the correct gravity do give the route away. If that makes the puzzle too easy, cut them to the `EXIT` label alone.
- **Two notes depend on mistakes:** the Chimney's decoy ledge and the Lockout's trap hole. Only players who make that mistake will see them. That's deliberate, but it means most players will miss them.
- **Two notes are warnings:** the Spiral's and the Turnstile's sit beside the lever that drops you out of the cube. Check that they are read before the throw, not after the recovery.
- **The Deadman's note** carries the most weight of any line before the reveal. Check that it is read (it is above the plate you stand on) and that it does not give the reveal away.
- **Off-route notes should be findable:** the Shaft, Staircase, Counterweight and Orrery notes ask you to look up or wander. Check that they can be found, and read from where you would stand.
- **Line length:** long lines are squeezed to fit their placard. Every line is at least 85% of its natural width; keep new lines inside that, or break them.

## Building it

In rough order of cost:

1. **Text only.** *Status: built.* The Stencil's strings live in `src/narrative.ts`; each chamber's cube serial is the `cube` field in `CHAMBERS` (gaps in the numbering are cubes that went dark, widening each act). The HUD shows a log line under the hint: the duty line when a chamber starts, the recovery line after a fall. Rewrite the hints and the win and fall messages. Add the Stencil's log lines to the HUD for the `falling` → reset transition (keep a recovery count per run in `main.ts`, not in saved progress). Give each chamber a cube serial number for the chamber select. Keep the strings in a Babylon-free module so Node can test them.
2. **Fall vista.** *Status: built, except the cube with your hole.* `src/environment/ballastField.ts` lays out 48 cubes around the fall line for each fall (Babylon-free, tested by Node), and `SpaceBackdrop` draws them: lit cubes glow at their seams and turn a quarter turn every few seconds; dark ones tumble. The chamber you just left is wrapped in a hull dressed the same way (`chamberHull`), so from outside it is one of them; the hull is invisible from inside. The dark share grows from 15% at the first chamber to 65% at the last (`darkFraction` in `src/narrative.ts`). Add drifting and tumbling cubes to `SpaceBackdrop`. It only shows after an escape, so this costs nothing in normal play.
3. **Facing text.** *Status: built; the writing pass is next.* `b.placard(at, normal, readAs, text)` and `b.note(...)` paint text on a face as a canvas texture on a thin plane, upright under `readAs` (floor and ceiling text takes a `top`). Stencils use the bundled Allerta Stencil, painted per skin (`placardInk`: grey paint in Axis, flaking white in Monolith, ink outline in Draft, glowing in Neon). Notes use the bundled Caveat in red grease pencil with a per-letter wobble, the same in every skin. `npm test` checks that each one sits on a real, uncovered face. So far there are two: the induction placard in the Vault, and a note in the Shaft on the face overhead during the climb. The writing pass is done: see "Chamber script" above.
4. **Crate serials.** *Status: built.* `addCrate(center, size, { stamp })` stencils every face. Every crate is stamped `BALLAST MASS` with a `BM-` serial; the `AT-0416` crate waits for the reveal.
5. **Planet lights.** *Status: built.* The planet's night side is dark through Acts I and II. From the Turnstile (the first chamber of Act III) a few lights appear, more each chamber, until the Orrery. `planetLights` in `src/narrative.ts` sets how many; `SpaceBackdrop` draws them as small warm points.
6. **The Descent.** *Status: built.* `descent.ts` (id `descent`, cube `0147`): route `-Y → +X → +Y` on two one-shot levers, out through a hole in the ceiling. The chamber is marked `ending`, so leaving it starts the `descending` state (live, but R does nothing) and saves the clear. The fall lasts 25 s (`DESCENT_DURATION`) and ends just above the planet; then the `ended` state shows the end card, and any confirm returns to the title. The Crown is a dark ring overhead in every fall, drawn by `SpaceBackdrop`. The e2e suite plays the whole ending, using `__debug.endFall()` to skip the 25 s.

## Rules for writers

- Show, don't explain. Nobody ever explains the Crown, the builders or the recycling.
- The Stencil never acknowledges that anything is wrong.
- The Margin never gives a wrong answer.
- No villain. Nothing here is malicious; the machine is just still running.
- Keep every line short enough to read mid-shift.
