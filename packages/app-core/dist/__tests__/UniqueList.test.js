import { describe, it, expect, beforeEach } from 'vitest';
import { UniqueList } from '../UniqueList.js';
describe('UniqueList', () => {
    let list;
    beforeEach(() => {
        list = new UniqueList((item) => item.id);
    });
    describe('add', () => {
        it('should add item to list', () => {
            const item = { id: '1', name: 'Test' };
            list.add(item);
            expect(list.size).toBe(1);
            expect(list.get('1')).toBe(item);
        });
        it('should replace duplicate items with same key', () => {
            const item1 = { id: '1', name: 'Test1' };
            const item2 = { id: '1', name: 'Test2' };
            list.add(item1);
            list.add(item2);
            expect(list.size).toBe(1);
            expect(list.get('1')).toBe(item2);
        });
        it('should mark as dirty when adding new item', () => {
            const item = { id: '1', name: 'Test' };
            list.clearDirty();
            list.add(item);
            expect(list.dirty).toBe(true);
        });
        it('should not mark as dirty when adding duplicate', () => {
            const item = { id: '1', name: 'Test' };
            list.add(item);
            list.clearDirty();
            list.add(item);
            expect(list.dirty).toBe(false);
        });
    });
    describe('remove', () => {
        it('should remove item from list', () => {
            const item = { id: '1', name: 'Test' };
            list.add(item);
            list.remove(item);
            expect(list.size).toBe(0);
            expect(list.get('1')).toBeUndefined();
        });
        it('should mark as dirty when removing item', () => {
            const item = { id: '1', name: 'Test' };
            list.add(item);
            list.clearDirty();
            list.remove(item);
            expect(list.dirty).toBe(true);
        });
        it('should not mark as dirty when removing non-existent item', () => {
            const item = { id: '1', name: 'Test' };
            list.clearDirty();
            list.remove(item);
            expect(list.dirty).toBe(false);
        });
    });
    describe('has', () => {
        it('should return true for existing item', () => {
            const item = { id: '1', name: 'Test' };
            list.add(item);
            expect(list.has(item)).toBe(true);
        });
        it('should return false for non-existent item', () => {
            const item = { id: '1', name: 'Test' };
            expect(list.has(item)).toBe(false);
        });
    });
    describe('get', () => {
        it('should return item by key', () => {
            const item = { id: '1', name: 'Test' };
            list.add(item);
            expect(list.get('1')).toBe(item);
        });
        it('should return undefined for non-existent key', () => {
            expect(list.get('1')).toBeUndefined();
        });
    });
    describe('clear', () => {
        it('should remove all items', () => {
            list.add({ id: '1', name: 'Test1' });
            list.add({ id: '2', name: 'Test2' });
            list.clear();
            expect(list.size).toBe(0);
        });
        it('should mark as dirty when clearing non-empty list', () => {
            list.add({ id: '1', name: 'Test' });
            list.clearDirty();
            list.clear();
            expect(list.dirty).toBe(true);
        });
        it('should not mark as dirty when clearing empty list', () => {
            list.clearDirty();
            list.clear();
            expect(list.dirty).toBe(false);
        });
    });
    describe('toArray', () => {
        it('should return array of all items', () => {
            const item1 = { id: '1', name: 'Test1' };
            const item2 = { id: '2', name: 'Test2' };
            list.add(item1);
            list.add(item2);
            const array = list.toArray();
            expect(array.length).toBe(2);
            expect(array).toContain(item1);
            expect(array).toContain(item2);
        });
    });
    describe('find', () => {
        it('should find item by predicate', () => {
            const item = { id: '1', name: 'Test' };
            list.add(item);
            const found = list.find((i) => i.name === 'Test');
            expect(found).toBe(item);
        });
        it('should return undefined when no item matches', () => {
            list.add({ id: '1', name: 'Test' });
            const found = list.find((i) => i.name === 'NotFound');
            expect(found).toBeUndefined();
        });
    });
    describe('filter', () => {
        it('should filter items by predicate', () => {
            list.add({ id: '1', name: 'Test1' });
            list.add({ id: '2', name: 'Test2' });
            list.add({ id: '3', name: 'Test1' });
            const filtered = list.filter((i) => i.name === 'Test1');
            expect(filtered.length).toBe(2);
            expect(filtered.every((i) => i.name === 'Test1')).toBe(true);
        });
    });
    describe('clearDirty', () => {
        it('should clear dirty flag', () => {
            list.add({ id: '1', name: 'Test' });
            expect(list.dirty).toBe(true);
            list.clearDirty();
            expect(list.dirty).toBe(false);
        });
    });
});
