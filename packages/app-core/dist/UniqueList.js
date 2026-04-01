export class UniqueList {
    map = new Map();
    keySelector;
    dirty = false;
    constructor(keySelector) {
        this.keySelector = keySelector;
    }
    add(item) {
        const key = this.keySelector(item);
        const existing = this.map.get(key);
        if (existing === item || JSON.stringify(existing) === JSON.stringify(item)) {
            return;
        }
        this.map.set(key, item);
        this.dirty = true;
    }
    remove(item) {
        const key = this.keySelector(item);
        if (this.map.has(key)) {
            this.map.delete(key);
            this.dirty = true;
        }
    }
    has(item) {
        return this.map.has(this.keySelector(item));
    }
    get(key) {
        return this.map.get(key);
    }
    clear() {
        if (this.map.size > 0) {
            this.map.clear();
            this.dirty = true;
        }
    }
    get size() {
        return this.map.size;
    }
    toArray() {
        return Array.from(this.map.values());
    }
    forEach(callback) {
        this.map.forEach((value, key) => callback(value, key));
    }
    find(predicate) {
        return this.toArray().find(predicate);
    }
    filter(predicate) {
        return this.toArray().filter(predicate);
    }
    clearDirty() {
        this.dirty = false;
    }
}
