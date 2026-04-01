export class UniqueList<T> {
  private map = new Map<string, T>();
  private keySelector: (item: T) => string;
  dirty = false;

  constructor(keySelector: (item: T) => string) {
    this.keySelector = keySelector;
  }

  add(item: T): void {
    const key = this.keySelector(item);
    const existing = this.map.get(key);

    if (existing === item || JSON.stringify(existing) === JSON.stringify(item)) {
      return;
    }

    this.map.set(key, item);
    this.dirty = true;
  }

  remove(item: T): void {
    const key = this.keySelector(item);
    if (this.map.has(key)) {
      this.map.delete(key);
      this.dirty = true;
    }
  }

  has(item: T): boolean {
    return this.map.has(this.keySelector(item));
  }

  get(key: string): T | undefined {
    return this.map.get(key);
  }

  clear(): void {
    if (this.map.size > 0) {
      this.map.clear();
      this.dirty = true;
    }
  }

  get size(): number {
    return this.map.size;
  }

  toArray(): T[] {
    return Array.from(this.map.values());
  }

  forEach(callback: (item: T, key: string) => void): void {
    this.map.forEach((value, key) => callback(value, key));
  }

  find(predicate: (item: T) => boolean): T | undefined {
    return this.toArray().find(predicate);
  }

  filter(predicate: (item: T) => boolean): T[] {
    return this.toArray().filter(predicate);
  }

  clearDirty(): void {
    this.dirty = false;
  }
}

