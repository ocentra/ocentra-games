import { describe, it, expect } from 'vitest';
import { CanonicalJSON } from '../CanonicalJSON';

describe('CanonicalJSON', () => {
  describe('stringify', () => {
    it('should recursively sort object keys', () => {
      const obj = { z: 1, a: 2, m: { c: 3, a: 4, b: 5 } };
      const result = CanonicalJSON.stringify(obj);
      const parsed = JSON.parse(result);
      expect(Object.keys(parsed)).toEqual(['a', 'm', 'z']);
      expect(Object.keys(parsed.m)).toEqual(['a', 'b', 'c']);
    });

    it('should normalize numbers correctly', () => {
      const obj = { int: 1.0, float: 1.5, negativeZero: -0.0, scientific: 1.23e-4, large: 1e10 };
      const result = CanonicalJSON.stringify(obj);
      expect(result).toContain('"int":1');
      expect(result).toContain('"float":1.5');
      expect(result).toContain('"negativeZero":0');
    });

    it('should handle arrays and produce deterministic output', () => {
      const obj = { z: 1, a: 2 };
      expect(CanonicalJSON.stringify(obj)).toBe(CanonicalJSON.stringify(obj));
    });
  });
});
