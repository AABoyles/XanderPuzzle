/**
 * The hint ladder: a chamber's base hint (its `hint` in `finish()`) is shown first; the two lines below it appear
 * only when the player has been stuck, by time in the chamber or by restarts of it. Babylon-free, tested by Node
 * (tests/hints.test.ts). Each line is in the Margin's voice and must stay true of the chamber as built: when a route
 * changes, re-check its two lines (NARRATIVE.md, "Hint lines").
 */

/** The thresholds for tiers 1 and 2: either condition is enough. */
export const HINT_AFTER = [
  { seconds: 150, restarts: 3 },
  { seconds: 360, restarts: 7 },
] as const;

/** 0 for the base hint, 1 once the player has been stuck a while, 2 once they have been stuck a long while. */
export function hintTier(seconds: number, restarts: number): 0 | 1 | 2 {
  if (seconds >= HINT_AFTER[1].seconds || restarts >= HINT_AFTER[1].restarts) return 2;
  if (seconds >= HINT_AFTER[0].seconds || restarts >= HINT_AFTER[0].restarts) return 1;
  return 0;
}

/** Hints 2 and 3 for each chamber, keyed by its stable `id` in CHAMBERS. */
export const MORE_HINTS: Record<string, [string, string]> = {
  vault: [
    'The placard above the first lever explains the arrows. Read it before you throw.',
    'Throw the low lever on the far wall first. The next one is on a side wall.',
  ],
  shaft: [
    'The wall you climb has an opening in it. Read the placard just before the opening.',
    'Throw the low lever first, then climb the wall it makes, keeping clear of the opening.',
  ],
  divide: [
    'The partition does not reach the ceiling. Look at the gap over it.',
    'Throw the lever on the near side first. Then walk up the wall and over the partition.',
  ],
  spiral: [
    'Two levers share the west wall. The ceiling lists the sequence.',
    'Throw the lowest lever on the west wall first. The next one is on the ceiling.',
  ],
  chimney: [
    'Straight down from the lever is a wide ledge. It catches anyone who drops.',
    'Throw the lever, then steer across to the other side before the first ledge.',
  ],
  staircase: [
    'One lane of each cell has a block overhead. Look up before you climb.',
    'Climb the first riser in the open lane and step off its top.',
  ],
  atrium: [
    'Only one lever in the cube turns gravity up. It is in room C.',
    'Throw the start lever, then in room A the one that leads straight to room C.',
  ],
  ballast: [
    'The crate leaves its trough when gravity turns. Look at the plate it lands on.',
    'Throw the lever on the glass screen first. Then the one by the east wall.',
  ],
  footing: [
    'The window is too high to reach. A low block in front of it stops a crate.',
    'Throw the east console\'s lever first. The crate slides west, clear of the low block.',
  ],
  stopper: [
    'A shelf on the south wall is level with the mouth. Mind where the plug goes next.',
    'Throw the lever by the mouth first. From the south wall, take the one that sends you east.',
  ],
  counterweight: [
    'The floor has a pit near the west wall. A crate that drops into it stays there.',
    'Slide the crate nearer the pit west and let it drop in. Only then send the other east.',
  ],
  deadman: [
    'The gate has its own plate out in the room. It holds only while you stand on it.',
    'Throw the tunnel lever first. Stand on the gate plate until the crate is through.',
  ],
  turnstile: [
    'The floor lever has a black gap in view, in the start wall. Look before you throw.',
    'Throw the start-corner lever from the floor. Then throw it again from the new floor.',
  ],
  lockout: [
    'The lever on the back wall burns out when thrown. Look behind the screen by the west wall.',
    'Throw the lever behind the screen first. Then walk the west wall to the back-wall lever.',
  ],
  grate: [
    'Only the grate lets a crate through. The glass holds it.',
    'Throw the middle lever first. Then take the one near the east wall.',
  ],
  sieve: [
    'The field stops short of the ceiling. Look at the gap above it.',
    'Throw the low lever on the field\'s near face first. Then the one by the east wall.',
  ],
  surplus: [
    'The door wants one crate on its plate, not two. The west wall has a hole for one.',
    'Throw the north lever on the glass pane\'s west face first. Leave the south one alone.',
  ],
  tide: [
    'The pillar and the tall wall each become a floor for one shift. Look at both.',
    'Get into the pillar\'s lane before the first sideways shift, then climb its face.',
  ],
  pendulum: [
    'When the sideways shift comes, the partition stops whatever is at or below its top.',
    'Stay low on the west side for the next shift east. Then climb the steps to the dais.',
  ],
  orrery: [
    'The ceiling has a lever of its own. Think about where it sends the crate.',
    'Throw the low lever on the east wall first. Then walk north along that wall.',
  ],
  descent: [
    'There is no door in this cube. Look at the ceiling, and the lever on its edge.',
    'Throw the low lever on the east wall first. Then walk up it to the ceiling lever.',
  ],
};

/** The hint to show: the base hint at tier 0 or for an unknown chamber, otherwise the tier's line. */
export function hintFor(id: string | undefined, base: string, tier: number): string {
  if (tier <= 0 || id === undefined) return base;
  const more = MORE_HINTS[id];
  if (!more) return base;
  return more[Math.min(tier, more.length) - 1];
}
