import type { InputDevice } from '../input/InputSource';
import { CHAMBERS } from '../level/chambers/catalog';
import { formatBest, formatShifts, furthestCleared, isUnlocked } from '../progress';
import type { Progress } from '../progress';
import type { HUD } from '../ui/HUD';
import { storageAvailable, unlockAll } from './flags';

const CHAMBER_IDS = CHAMBERS.map((c) => c.id);

/**
 * The chamber list: which row is highlighted, which chambers are open, and what each row says. Starting the chosen
 * chamber is `main.ts`'s job; this only keeps the list. Highlighting a row fetches that chamber's code (`preload`), so
 * picking it rarely has to wait.
 */
export class ChamberSelect {
  /** The highlighted row. */
  public index = 0;

  /** @param progress read each time, because erasing saved progress replaces the object */
  constructor(
    private readonly hud: HUD,
    private readonly progress: () => Progress,
    private readonly preload: (index: number) => void,
  ) {}

  public unlocked(index: number): boolean {
    return isUnlocked(index, furthestCleared(this.progress(), CHAMBER_IDS), unlockAll);
  }

  /** Fills and shows the list with chamber `current` highlighted; runs when the state machine enters `chamberSelect`. */
  public show(current: number, device: InputDevice): void {
    const progress = this.progress();
    const furthest = furthestCleared(progress, CHAMBER_IDS);
    const entries = CHAMBERS.map((c, i) => {
      return {
        name: c.name,
        cube: c.cube,
        best: formatBest(progress.best[c.id]),
        shifts: formatShifts(progress.shifts[c.id], c.par),
        completed: i <= furthest,
        unlocked: isUnlocked(i, furthest, unlockAll),
      };
    });
    const devices = device === 'touch' ? 'Tap a chamber to play' : 'Arrows/D-pad choose · Enter/A play · Esc/B back';
    this.hud.showLevelSelect(entries, current, unlockAll && storageAvailable ? `${devices} · all unlocked` : devices);
    this.highlight(current);
  }

  public move(delta: number): void {
    this.highlight(Math.min(Math.max(this.index + delta, 0), CHAMBERS.length - 1));
  }

  /** Highlights row `index` (the pointer is over it, or the keys moved to it). */
  public highlight(index: number): void {
    this.index = index;
    this.hud.highlightLevel(index);
    if (this.unlocked(index)) this.preload(index);
  }
}
