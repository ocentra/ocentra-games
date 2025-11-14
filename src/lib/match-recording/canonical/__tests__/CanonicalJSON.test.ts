import { describe, it, expect } from 'vitest';
import { CanonicalJSON } from '../CanonicalJSON';

describe('CanonicalJSON', () => {
  describe('stringify', () => {
    it('should recursively sort object keys', () => {
      const obj = {
        z: 1,
        a: 2,
        m: {
          c: 3,
          a: 4,
          b: 5,
        },
      };

      const result = CanonicalJSON.stringify(obj);
      const parsed = JSON.parse(result);

      // Keys should be sorted recursively
      expect(Object.keys(parsed)).toEqual(['a', 'm', 'z']);
      expect(Object.keys(parsed.m)).toEqual(['a', 'b', 'c']);
    });

    it('should normalize numbers correctly', () => {
      const obj = {
        int: 1.0,
        float: 1.50,
        negativeZero: -0.0,
        scientific: 1.23e-4,
        large: 1e10,
      };

      const result = CanonicalJSON.stringify(obj);
      
      // Should normalize numbers
      expect(result).toContain('"int":1');
      expect(result).toContain('"float":1.5');
      expect(result).toContain('"negativeZero":0');
      expect(result).toContain('"scientific":0.000123');
      expect(result).toContain('"large":10000000000');
    });

    it('should escape only control characters in Unicode', () => {
      const obj = {
        control: '\u0000\u0001\u001F\u007F\u009F', // Control chars
        unicode: '你好世界', // Non-ASCII but not control
        emoji: '🎮🃏',
      };

      const result = CanonicalJSON.stringify(obj);
      
      // Control characters should be escaped
      expect(result).toContain('\\u0000');
      expect(result).toContain('\\u0001');
      
      // Non-control Unicode should NOT be escaped
      expect(result).toContain('你好世界');
      expect(result).toContain('🎮');
      expect(result).toContain('🃏');
    });

    it('should handle arrays correctly', () => {
      const obj = {
        arr: [3, 1, 2],
        nested: [
          { b: 2, a: 1 },
          { z: 3, y: 4 },
        ],
      };

      const result = CanonicalJSON.stringify(obj);
      const parsed = JSON.parse(result);

      // Arrays should preserve order
      expect(parsed.arr).toEqual([3, 1, 2]);
      
      // Objects in arrays should have sorted keys
      expect(Object.keys(parsed.nested[0])).toEqual(['a', 'b']);
      expect(Object.keys(parsed.nested[1])).toEqual(['y', 'z']);
    });

    it('should produce deterministic output', () => {
      const obj = {
        z: 1,
        a: 2,
        m: {
          c: 3,
          a: 4,
        },
      };

      const result1 = CanonicalJSON.stringify(obj);
      const result2 = CanonicalJSON.stringify(obj);

      // Should be identical
      expect(result1).toBe(result2);
    });

    it('should handle edge cases', () => {
      // Empty object
      expect(CanonicalJSON.stringify({})).toBe('{}');
      
      // Empty array
      expect(CanonicalJSON.stringify([])).toBe('[]');
      
      // Null
      expect(CanonicalJSON.stringify(null)).toBe('null');
      
      // String
      expect(CanonicalJSON.stringify('test')).toBe('"test"');
      
      // Number
      expect(CanonicalJSON.stringify(42)).toBe('42');
    });
  });
});

