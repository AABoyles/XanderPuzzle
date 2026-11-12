import { encodeSpec } from '../src/level/specCodec.ts';
import { CHIMNEY } from '../src/level/specs/chimney.ts';
import { expect, Page, test } from '@playwright/test';

/**
 * Chamber smoke tests. Every chamber is loaded and checked for errors and a sane spawn; every chamber with a
 * route below is then "solved" by teleporting to each lever in turn and throwing it, and finally to the exit.
 *
 * `route` lists lever indexes, in the order the chamber's `addSwitch` calls place them (`__debug.switches()`).
 * `axes` is the gravity expected after each throw (the chamber's doc-comment route without the entrance axis).
 * When a chamber's lever order or route changes, update its row here.
 */
interface Row {
  id: string;
  route: number[];
  axes: string[];
  /** Crate chambers: after the route, every pressure plate must be pressed and every door open. */
  plates?: boolean;
  /**
   * Timed chamber: lever 0 starts gravity cycling on its own, so the route is replaced by waiting for the cycle.
   * `axes` is then the gravity expected after each of the first few automatic shifts.
   */
  timed?: boolean;
  /** Ending chamber (the Descent): its exit is a hole into space, and leaving ends the game on the end card. */
  ending?: boolean;
}

const ROWS: Row[] = [
  { id: 'vault', route: [0, 1], axes: ['+Z', '+X'] },
  { id: 'shaft', route: [0, 1], axes: ['+X', '+Y'] },
  { id: 'divide', route: [0, 1], axes: ['+X', '+Z'] },
  { id: 'spiral', route: [0, 1, 2], axes: ['-X', '+Y', '+X'] },
  { id: 'chimney', route: [0], axes: ['+Z'] },
  { id: 'staircase', route: [0, 2, 1, 4, 3], axes: ['+X', '-Y', '+X', '-Y', '+X'] },
  { id: 'atrium', route: [0, 3, 1, 5, 7], axes: ['+X', '-Z', '-X', '+Z', '+Y'] },
  { id: 'ballast', route: [0, 1], axes: ['+X', '-Y'], plates: true },
  { id: 'footing', route: [0, 2, 1, 3], axes: ['-X', '-Y', '+X', '-Y'] },
  { id: 'stopper', route: [0, 2, 3], axes: ['-Z', '+X', '+Z'] },
  { id: 'counterweight', route: [0, 1, 2], axes: ['-X', '-Y', '+X'], plates: true },
  { id: 'deadman', route: [0, 1], axes: ['+X', '-Y'] },
  { id: 'turnstile', route: [0, 0, 2], axes: ['+X', '+Y', '+Z'] },
  { id: 'lockout', route: [1, 0], axes: ['-X', '+Y'] },
  { id: 'grate', route: [0, 1], axes: ['+X', '-Y'], plates: true },
  { id: 'sieve', route: [0, 1, 2, 3], axes: ['+X', '+Y', '+X', '-Y'], plates: true },
  { id: 'surplus', route: [0, 2, 4, 5], axes: ['-X', '-Y', '+X', '-Y'], plates: true },
  { id: 'tide', route: [], axes: ['+X', '+Z'], timed: true },
  { id: 'pendulum', route: [], axes: ['+X', '-Y', '-X'], timed: true },
  { id: 'orrery', route: [0, 1, 2, 3, 4, 5], axes: ['+X', '+Z', '+Y', '-X', '-Z', '+Y'], plates: true },
  { id: 'descent', route: [0, 1], axes: ['+X', '+Y'], ending: true },
];

type Debug = {
  levelCount(): number;
  level(): number;
  startLevel(i: number): void;
  position(): number[];
  gravityAxis(): string;
  grounded(): boolean;
  hasWon(): boolean;
  state(): string;
  endFall(): void;
  setPosition(x: number, y: number, z: number): void;
  interact(): void;
  switches(): { target: string | null; position: number[] }[];
  crates(): number[][];
  plates(): boolean[];
  doors(): boolean[];
  exit(): { center: number[]; radius: number; button?: number[] };
  simTime(): number;
  setRenderScale(level: number): void;
  begin(): void;
  undo(): boolean;
  undoDepth(): number;
};

const dbg = <T>(page: Page, fn: (d: Debug) => T) => page.evaluate(`(${fn.toString()})(window.__debug)`) as Promise<T>;

async function boot(page: Page, errors: string[]) {
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console.error: ${m.text()}`);
  });
  // Axis is the lightest skin to draw. Under software WebGL the default (Station, with its shadow and normal maps)
  // slows the frame rate enough to starve the game clock, and the routes are the same in every skin.
  await page.goto('/?skin=axis');
  await page.waitForFunction(() => '__debug' in window);
  // A sixteenth of the pixels: under software WebGL the frame rate, and with it the game clock, depends on them.
  await dbg(page, (d) => d.setRenderScale(4));
}

/**
 * The game clock advances by at most 1/20 s a frame, so on a slow renderer (CI's software WebGL) it runs well behind
 * the wall clock. Everything below therefore waits in simulated seconds: a wall-clock wait that is long enough on a
 * fast machine gives the crates or the gravity cycle too little game time on a slow one.
 */
const simTime = (page: Page) => dbg(page, (d) => d.simTime());

/** Waits until `seconds` of game time have passed. */
async function simWait(page: Page, seconds: number) {
  const start = await simTime(page);
  while ((await simTime(page)) - start < seconds) await page.waitForTimeout(50);
}

/** Polls `read` until it gives `want`; fails once `simSeconds` of game time have passed without it. */
async function untilSim<T>(page: Page, read: () => Promise<T>, want: T, simSeconds: number, message: string) {
  const start = await simTime(page);
  let last = await read();
  while (!Object.is(last, want) && (await simTime(page)) - start < simSeconds) {
    await page.waitForTimeout(50);
    last = await read();
  }
  expect(last, `${message} (within ${simSeconds}s of game time)`).toBe(want);
}

async function load(page: Page, index: number) {
  await page.evaluate((i) => (window as any).__debug.startLevel(i), index);
  // The player starts on solid ground: nothing but gravity moves them, and they must stay put and grounded.
  await untilSim(page, () => dbg(page, (d) => d.grounded()), true, 5, 'grounded at the spawn');
}

test.describe('chambers', () => {
  let errors: string[];
  test.beforeEach(async ({ page }) => {
    errors = [];
    await boot(page, errors);
  });
  test.afterEach(() => {
    expect(errors, 'browser errors').toEqual([]);
  });

  test('every chamber has a route row, in play order', async ({ page }) => {
    expect(await dbg(page, (d) => d.levelCount())).toBe(ROWS.length);
  });

  ROWS.forEach((row, index) => {
    test(`${index + 1}. ${row.id}: loads, spawns on solid ground, can be solved`, async ({ page }) => {
      await load(page, index);

      // Valid spawn: still inside the level bounds a moment later, still grounded, still under -Y gravity.
      const spawn = await dbg(page, (d) => d.position());
      const exit = await dbg(page, (d) => d.exit());
      await simWait(page, 0.5);
      const now = await dbg(page, (d) => d.position());
      expect(Math.hypot(now[0] - spawn[0], now[1] - spawn[1], now[2] - spawn[2])).toBeLessThan(1);
      expect(await dbg(page, (d) => d.grounded())).toBe(true);
      expect(await dbg(page, (d) => d.gravityAxis())).toBe('-Y');

      if (row.timed) {
        // Throw the sequence lever; the sequencer must then carry gravity through `axes` on its own.
        const lever = (await dbg(page, (d) => d.switches()))[0];
        await page.evaluate(([x, y, z]) => {
          const d = (window as any).__debug;
          d.setPosition(x, y, z);
          d.interact();
        }, lever.position);
        for (const axis of row.axes) {
          // Each step of the cycle is a few seconds of game time.
          await untilSim(page, () => dbg(page, (d) => d.gravityAxis()), axis, 15, 'gravity after an automatic shift');
        }
      }

      for (let step = 0; !row.timed && step < row.route.length; step++) {
        await throwLever(page, row.route[step], row.axes[step]);
        await settleCrates(page);
      }

      if (row.plates) {
        await untilSim(page, () => dbg(page, (d) => d.plates().every(Boolean)), true, 8, 'every plate pressed');
        await untilSim(page, () => dbg(page, (d) => d.doors().every(Boolean)), true, 8, 'every door open');
      }

      if (row.ending) {
        // Out through the hole along the exit gravity: the final fall begins, R cannot undo it, and it ends on the
        // end card, from which Enter returns to the title.
        const exitAxis = row.axes[row.axes.length - 1];
        const k = 'XYZ'.indexOf(exitAxis[1]);
        const out = exit.center.map((v, i) => (i === k ? v + (exitAxis[0] === '+' ? 6 : -6) : v));
        await page.evaluate(([x, y, z]) => (window as any).__debug.setPosition(x, y, z), out);
        await untilSim(page, () => dbg(page, (d) => d.state()), 'descending', 5, 'the final fall begins');
        await page.keyboard.press('KeyR');
        await simWait(page, 0.3);
        expect(await dbg(page, (d) => d.state())).toBe('descending');
        await dbg(page, (d) => d.endFall());
        await untilSim(page, () => dbg(page, (d) => d.state()), 'ended', 5, 'the end card');
        await page.keyboard.press('Enter');
        await expect.poll(() => dbg(page, (d) => d.state()), { timeout: 10_000 }).toBe('title');
        return;
      }

      // The route works; standing on the reclaimer's plate then wins (walking the last stretch is covered by
      // playtests). The player is put back on the plate until it takes them, since a timed chamber's gravity may
      // carry them off it first.
      expect(exit.button, 'the chamber has a reclaimer').toBeTruthy();
      const stand = exit.button as number[];
      const hold = setInterval(() => {
        void page.evaluate(([x, y, z]) => (window as any).__debug.setPosition(x, y, z), stand).catch(() => {});
      }, 100);
      try {
        await untilSim(page, () => dbg(page, (d) => d.hasWon()), true, 5, 'reclaimed on the plate');
      } finally {
        clearInterval(hold);
      }
    });
  });
});

test('?playtest opens with one visit for the first chamber, before anything is played', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  await page.goto('/?skin=axis&playtest');
  await page.waitForFunction(() => '__debug' in window);
  const log = await page.evaluate(() => (window as any).__debug.playtest());
  expect(log.visits).toHaveLength(1);
  expect(log.visits[0].id).toBe('vault');
  expect(log.visits[0].cleared).toBe(false);
  expect(errors, 'browser errors').toEqual([]);
});

test('Z (undo) takes back the last lever thrown by hand', async ({ page }) => {
  const errors: string[] = [];
  await boot(page, errors);
  await load(page, 0);
  // Undo works in play, so leave the title as a tap would.
  await dbg(page, (d) => d.begin());
  const entrance = await dbg(page, (d) => d.gravityAxis());
  expect(await dbg(page, (d) => d.undoDepth())).toBe(0);
  expect(await dbg(page, (d) => d.undo()), 'nothing to undo before a throw').toBe(false);

  await throwLever(page, 0, '+Z');
  expect(await dbg(page, (d) => d.undoDepth())).toBe(1);
  expect(await dbg(page, (d) => d.undo())).toBe(true);
  expect(await dbg(page, (d) => d.gravityAxis())).toBe(entrance);
  expect(await dbg(page, (d) => d.undoDepth())).toBe(0);
  expect(errors, 'browser errors').toEqual([]);
});

/** Waits until no crate has moved for 0.6 s of game time, so the next lever is thrown after the crates have slid home. */
async function settleCrates(page: Page) {
  let last = '';
  let still = 0;
  for (let i = 0; i < 100 && still < 4; i++) {
    await simWait(page, 0.15);
    const now = JSON.stringify(await dbg(page, (d) => d.crates()));
    still = now === last ? still + 1 : 0;
    last = now;
  }
}

/** Teleports onto a lever and presses E until gravity becomes `expected`. */
async function throwLever(page: Page, index: number, expected: string) {
  const sw = (await dbg(page, (d) => d.switches()))[index];
  expect(sw.target, `lever ${index} should offer ${expected}`).toBe(expected);
  let axis = '';
  for (let tries = 0; tries < 30 && axis !== expected; tries++) {
    await page.evaluate(([x, y, z]) => {
      const d = (window as any).__debug;
      d.setPosition(x, y, z);
      d.interact();
    }, sw.position);
    await simWait(page, 0.25);
    axis = await dbg(page, (d) => d.gravityAxis());
  }
  expect(axis, `gravity after lever ${index}`).toBe(expected);
}

test('a #c= link opens the chamber it carries', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  await page.goto(`/?skin=axis#c=${await encodeSpec(CHIMNEY)}`);
  await page.waitForFunction(() => '__debug' in window);
  expect(await dbg(page, (d) => d.level())).toBe(-1);
  expect(await dbg(page, (d) => d.switches().length)).toBe(CHIMNEY.levers.length);
  expect(errors, 'browser errors').toEqual([]);
});

test('a broken #c= link opens the game as usual', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  await page.goto('/?skin=axis#c=v1.nonsense');
  await page.waitForFunction(() => '__debug' in window);
  expect(await dbg(page, (d) => d.levelCount())).toBeGreaterThan(1);
  expect(await dbg(page, (d) => d.level())).toBe(0);
  expect(errors, 'browser errors').toEqual([]);
});

test('a shared chamber still has the chamber list: L opens it, and picking a chamber starts it in place', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  await page.goto(`/?skin=axis#c=${await encodeSpec(CHIMNEY)}`);
  await page.waitForFunction(() => '__debug' in window);
  await dbg(page, (d) => d.begin());
  expect(await dbg(page, (d) => d.level())).toBe(-1);
  await page.keyboard.press('KeyL');
  await page.waitForFunction(() => (window as any).__debug.levelSelectOpen());
  await page.keyboard.press('Enter'); // the highlighted row is the first chamber, always open
  await page.waitForFunction(() => !(window as any).__debug.levelSelectOpen());
  expect(await dbg(page, (d) => d.level())).toBe(0);
  expect(await dbg(page, (d) => d.hasWon())).toBe(false);
  // It is the Vault now, with the game's own two levers, not the shared chamber's one.
  expect(await dbg(page, (d) => d.switches().length)).toBe(2);
  expect(errors, 'browser errors').toEqual([]);
});

test('pasting a #c= link into a tab that is already open loads its chamber', async ({ page }) => {
  await page.goto('/?skin=axis');
  await page.waitForFunction(() => '__debug' in window);
  expect(await dbg(page, (d) => d.level())).toBe(0);
  const link = await encodeSpec(CHIMNEY);
  // Only the fragment changes, as when a link is pasted into the address bar of the open page.
  await page.evaluate((l) => (location.hash = `c=${l}`), link);
  await page.waitForFunction(() => (window as any).__debug?.level() === -1);
});

test('leaving a shared chamber replaces the link in the address bar with the chamber picked', async ({ page }) => {
  await page.goto(`/?skin=axis#c=${await encodeSpec(CHIMNEY)}`);
  await page.waitForFunction(() => '__debug' in window);
  await dbg(page, (d) => d.begin());
  await page.keyboard.press('KeyL');
  await page.waitForFunction(() => (window as any).__debug.levelSelectOpen());
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => !(window as any).__debug.levelSelectOpen());
  expect(new URL(page.url()).hash).toBe('#vault');
});

test('#<id> starts that chamber when it is open, and the address bar follows the chamber', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  await page.goto('/?skin=axis&unlockall#shaft');
  await page.waitForFunction(() => '__debug' in window);
  expect(await dbg(page, (d) => d.level())).toBe(1);
  await dbg(page, (d) => d.startLevel(2));
  expect(new URL(page.url()).hash).toBe('#divide');
  expect(errors, 'browser errors').toEqual([]);
});

test('#<id> of a chamber that is still locked, or that does not exist, opens the game as usual', async ({ page }) => {
  for (const hash of ['#shaft', '#nonesuch']) {
    await page.goto(`/?skin=axis${hash}`);
    await page.waitForFunction(() => '__debug' in window);
    expect(await dbg(page, (d) => d.level()), hash).toBe(0);
  }
});

test('pasting #<id> into a tab that is already open loads that chamber', async ({ page }) => {
  await page.goto('/?skin=axis&unlockall');
  await page.waitForFunction(() => '__debug' in window);
  await page.evaluate(() => (location.hash = 'spiral'));
  await page.waitForFunction(() => (window as any).__debug?.level() === 3);
});
