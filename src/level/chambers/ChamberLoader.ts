import type { LevelFactory } from '../Builder';
import type { ChamberModule } from './catalog';

/**
 * Loads chamber modules on demand and remembers them. A chamber that has been loaded once is available at once from
 * `get`, which is what lets a restart, a skin change and (after `preload`) the next chamber start without waiting.
 * Babylon-free: it only passes the factories along. Tested by Node (tests/chamberLoader.test.ts).
 */
export class ChamberLoader {
  private readonly sources: Array<{ load: () => Promise<ChamberModule> }>;
  private readonly ready = new Map<number, LevelFactory>();
  private readonly pending = new Map<number, Promise<LevelFactory>>();

  // No parameter properties: Node's type stripping (used by the tests) does not support them.
  constructor(sources: Array<{ load: () => Promise<ChamberModule> }>) {
    this.sources = sources;
  }

  public get count(): number {
    return this.sources.length;
  }

  /** The chamber's factory if its module has arrived, else undefined. Never starts a load. */
  public get(index: number): LevelFactory | undefined {
    return this.ready.get(index);
  }

  /**
   * Resolves with the chamber's factory, fetching its module if need be. Concurrent calls share one fetch. A failed
   * fetch is not remembered, so the next call tries again (the player may have been offline for a moment).
   */
  public load(index: number): Promise<LevelFactory> {
    const have = this.ready.get(index);
    if (have) return Promise.resolve(have);
    const running = this.pending.get(index);
    if (running) return running;
    const source = this.sources[index];
    if (!source) return Promise.reject(new RangeError(`No chamber ${index}`));
    const started = source.load().then(
      (module) => {
        this.pending.delete(index);
        this.ready.set(index, module.default);
        return module.default;
      },
      (error: unknown) => {
        this.pending.delete(index);
        throw error;
      },
    );
    this.pending.set(index, started);
    return started;
  }

  /** Starts fetching a chamber the player is likely to want next. Out-of-range indexes and failures are ignored. */
  public preload(index: number): void {
    if (index < 0 || index >= this.sources.length) return;
    this.load(index).catch(() => undefined);
  }
}
