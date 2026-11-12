/** How many chamber snapshots the undo stack keeps: the oldest is dropped past this. */
export const UNDO_LIMIT = 32;

/**
 * A bounded stack of saved states, newest on top. Babylon-free so Node can test it directly. Pushing past
 * `UNDO_LIMIT` drops the oldest entry.
 */
export class UndoStack<T> {
  private readonly items: T[] = [];

  public push(s: T): void {
    this.items.push(s);
    if (this.items.length > UNDO_LIMIT) this.items.shift();
  }

  /** Removes and returns the newest entry, or undefined when the stack is empty. */
  public pop(): T | undefined {
    return this.items.pop();
  }

  public clear(): void {
    this.items.length = 0;
  }

  public get size(): number {
    return this.items.length;
  }
}
