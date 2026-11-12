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
    'Throw the low lever before the partition first. Then walk up the wall and over it.',
  ],
  spiral: [
    'Two levers share one wall. The ceiling lists the sequence.',
    'Throw the lower of those two levers first. The next one is on the ceiling.',
  ],
  chimney: [
    'Straight down from the lever is a wide ledge. It catches anyone who drops.',
    'Throw the lever, then steer across to the other side before the first ledge.',
  ],
  staircase: [
    'One lane of each cell has a block overhead. Look up before you climb.',
    'Throw the lever in the lane with nothing hanging over it first, then climb the riser.',
  ],
  atrium: [
    'Only one lever in the cube has its arrow pointing up. It is in a side room.',
    'Throw the start lever, then take the room lever whose arrow faces a doorway wall.',
  ],
  ballast: [
    'The crate leaves its trough when gravity turns. Look at the plate it lands on.',
    'Throw the lever on the glass screen first. Then the low lever on the wall it slides to.',
  ],
  footing: [
    'The window is too high to reach. A low block in front of it stops a crate.',
    'Throw the console lever beside the crate first. The crate slides clear of the low block.',
  ],
  stopper: [
    'A shelf on the wall opposite the plug is level with the mouth. Mind where the plug goes.',
    'Throw the lever by the mouth first. Then the one whose arrow points away from the way in.',
  ],
  counterweight: [
    'The floor has a pit at one end. A crate that drops into it stays there.',
    'Slide the crate nearest the pit into it. Only then send the other to its plate.',
  ],
  deadman: [
    'The gate has its own plate out in the room. It holds only while you stand on it.',
    'Throw the tunnel lever first. Stand on the gate plate until the crate is through.',
  ],
  turnstile: [
    'A black gap sits in view of the floor lever, in the wall you came in by.',
    'Throw the lever beside the entrance from the floor, then again from the new floor.',
  ],
  lockout: [
    'The white lever with a ring burns out when thrown. Look behind the screen on your left.',
    'Throw the lever behind the screen first. Then walk to the white lever on the far wall.',
  ],
  grate: [
    'Only the grate lets a crate through. The glass holds it.',
    'Throw the middle lever first. Then throw the other one, further along the same row.',
  ],
  sieve: [
    'The field stops short of the ceiling. Look at the gap above it.',
    'Throw the low lever on the field\'s near face first. Then the one near the exit.',
  ],
  surplus: [
    'The door wants one crate on its plate, not two. The RELEASE APERTURE can take one.',
    'Throw the pane lever nearer the exit first. Leave the one nearer the entrance alone.',
  ],
  tide: [
    'The pillar and the tall wall each become a floor for one shift. Look at both.',
    'Get into the pillar\'s lane before the first sideways shift, then climb its face.',
  ],
  pendulum: [
    'When the sideways shift comes, the partition stops whatever is at or below its top.',
    'Stay low on the dais side of the partition for the next swing. Then climb the steps.',
  ],
  orrery: [
    'The ceiling has a lever of its own. Think about where it sends the crate.',
    'Throw the low lever on the wall to your right as you come in. Then walk along that wall.',
  ],
  descent: [
    'There is no door in this cube. Look at the ceiling, and the lever on its edge.',
    'Throw the lever under the trim notice first. Then walk up that wall to the ceiling lever.',
  ],
};

/** The hint to show: the base hint at tier 0 or for an unknown chamber, otherwise the tier's line. */
export function hintFor(id: string | undefined, base: string, tier: number): string {
  if (tier <= 0 || id === undefined) return base;
  const more = MORE_HINTS[id];
  if (!more) return base;
  return more[Math.min(tier, more.length) - 1];
}

/**
 * One chamber visit's place on the ladder: the time played, and the tier now on the HUD. The caller says when a visit
 * begins (`reset`), feeds it play time (`tick`) and asks whether the hint should change (`rise`).
 */
export class HintLadder {
  /** Simulated seconds played in this chamber across its restarts. */
  public seconds = 0;
  /** The tier now shown: 0 is the chamber's own hint. */
  public shown: 0 | 1 | 2 = 0;

  /** A different chamber has started. A restart of the same one keeps its place. */
  public reset(): void {
    this.seconds = 0;
    this.shown = 0;
  }

  public tick(dt: number): void {
    this.seconds += dt;
  }

  /** The tier to show now if it is higher than the one showing (which it then becomes), else undefined. */
  public rise(restarts: number): 1 | 2 | undefined {
    const tier = hintTier(this.seconds, restarts);
    if (tier <= this.shown) return undefined;
    this.shown = tier;
    return tier as 1 | 2;
  }
}
