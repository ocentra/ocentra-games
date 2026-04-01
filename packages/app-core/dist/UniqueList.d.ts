export declare class UniqueList<T> {
    private map;
    private keySelector;
    dirty: boolean;
    constructor(keySelector: (item: T) => string);
    add(item: T): void;
    remove(item: T): void;
    has(item: T): boolean;
    get(key: string): T | undefined;
    clear(): void;
    get size(): number;
    toArray(): T[];
    forEach(callback: (item: T, key: string) => void): void;
    find(predicate: (item: T) => boolean): T | undefined;
    filter(predicate: (item: T) => boolean): T[];
    clearDirty(): void;
}
