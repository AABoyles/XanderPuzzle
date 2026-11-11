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
}

async function load(page: Page, index: number) {
  await page.evaluate((i) => (window as any).__debug.startLevel(i), index);
  // The player starts on solid ground: nothing but gravity moves them, and they must stay put and grounded.
  await expect.poll(() => dbg(page, (d) => d.grounded()), { timeout: 10_000 }).toBe(true);
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
      await page.waitForTimeout(500);
      const now = await dbg(page, (d) => d.position());
      expect(Math.hypot(now[0] - spawn[0], now[1] - spawn[1], now[2] - spawn[2])).toBeLessThan(1);
      expect(await dbg(page, (d) => d.grounded())).toBe(true);
      expect(await dbg(page, (d) => d.gravityAxis())).toBe('-Y');

      if (row.timed) {
        // Throw the sequence lever; the sequencer must then carry gravity through `axes` on its own.
        const lever = (await dbg(page, (d) => d.switches()))[0];
        await page.evaluate(
          ([x, y, z]) => {
            const d = (window as any).__debug;
            d.setPosition(x, y, z);
            d.interact();
          },
          lever.position,
        );
        for (const axis of row.axes) {
          await expect.poll(() => dbg(page, (d) => d.gravityAxis()), { timeout: 30_000 }).toBe(axis);
        }
      }

      for (let step = 0; !row.timed && step < row.route.length; step++) {
        await throwLever(page, row.route[step], row.axes[step]);
        await settleCrates(page);
      }

      if (row.plates) {
        await expect.poll(() => dbg(page, (d) => d.plates().every(Boolean)), { timeout: 10_000 }).toBe(true);
        await expect.poll(() => dbg(page, (d) => d.doors().every(Boolean)), { timeout: 10_000 }).toBe(true);
      }

      if (row.ending) {
        // Out through the hole along the exit gravity: the final fall begins, R cannot undo it, and it ends on the
        // end card, from which Enter returns to the title.
        const exitAxis = row.axes[row.axes.length - 1];
        const k = 'XYZ'.indexOf(exitAxis[1]);
        const out = exit.center.map((v, i) => (i === k ? v + (exitAxis[0] === '+' ? 6 : -6) : v));
        await page.evaluate(([x, y, z]) => (window as any).__debug.setPosition(x, y, z), out);
        await expect.poll(() => dbg(page, (d) => d.state()), { timeout: 10_000 }).toBe('descending');
        await page.keyboard.press('KeyR');
        await page.waitForTimeout(300);
        expect(await dbg(page, (d) => d.state())).toBe('descending');
        await dbg(page, (d) => d.endFall());
        await expect.poll(() => dbg(page, (d) => d.state()), { timeout: 10_000 }).toBe('ended');
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
        await expect.poll(() => dbg(page, (d) => d.hasWon()), { timeout: 10_000 }).toBe(true);
      } finally {
        clearInterval(hold);
      }
    });
  });
});

/** Waits until no crate has moved for a moment, so the next lever is thrown after the crates have slid home. */
async function settleCrates(page: Page) {
  let last = '';
  let still = 0;
  for (let i = 0; i < 100 && still < 4; i++) {
    await page.waitForTimeout(150);
    const now = JSON.stringify(await dbg(page, (d) => d.crates()));
    still = now === last ? still + 1 : 0;
    last = now;
  }
}

/** Teleports onto a lever and presses E until gravity becomes `expected`. */
async function throwLever(page: Page, index: number, expected: string) {
  const sw = (await dbg(page, (d) => d.switches()))[index];
  expect(sw.target, `lever ${index} should offer ${expected}`).toBe(expected);
  await expect
    .poll(
      async () => {
        await page.evaluate(
          ([x, y, z]) => {
            const d = (window as any).__debug;
            d.setPosition(x, y, z);
            d.interact();
          },
          sw.position,
        );
        await page.waitForTimeout(250);
        return dbg(page, (d) => d.gravityAxis());
      },
      { message: `gravity after lever ${index}`, timeout: 10_000, intervals: [100] },
    )
    .toBe(expected);
}
