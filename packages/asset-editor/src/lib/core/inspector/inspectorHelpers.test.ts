import { describe, expect, it } from 'vitest';
import {
  isGuidString,
  getGuidFromItem,
  isImagePath,
  isImageFile,
  IMAGE_EXTENSIONS,
  IMAGE_EXTENSION_PATTERN,
} from './inspectorHelpers';

describe('inspectorHelpers', () => {
  const validGuid = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

  it('isGuidString: returns true for valid UUID v4 string', () => {
    expect(isGuidString(validGuid)).toBe(true);
    expect(isGuidString('00000000-0000-4000-8000-000000000000')).toBe(true);
  });

  it('isGuidString: returns false for non-GUID strings', () => {
    expect(isGuidString('not-a-guid')).toBe(false);
    expect(isGuidString('12345')).toBe(false);
    expect(isGuidString('a1b2c3d4-e5f6-7890-abcd')).toBe(false);
    expect(isGuidString('')).toBe(false);
  });

  it('isGuidString: returns false for non-strings', () => {
    expect(isGuidString(null)).toBe(false);
    expect(isGuidString(undefined)).toBe(false);
    expect(isGuidString(123)).toBe(false);
    expect(isGuidString({})).toBe(false);
  });

  it('getGuidFromItem: returns guid when value is valid GUID string', () => {
    expect(getGuidFromItem(validGuid)).toBe(validGuid);
  });

  it('getGuidFromItem: returns guid from object with guid property', () => {
    expect(getGuidFromItem({ guid: validGuid })).toBe(validGuid);
  });

  it('getGuidFromItem: returns guid from object with _value property', () => {
    expect(getGuidFromItem({ _value: validGuid })).toBe(validGuid);
  });

  it('getGuidFromItem: returns guid from object with assetRef and guid', () => {
    expect(getGuidFromItem({ assetRef: true, guid: validGuid })).toBe(validGuid);
  });

  it('getGuidFromItem: returns null for invalid inputs', () => {
    expect(getGuidFromItem(null)).toBe(null);
    expect(getGuidFromItem({})).toBe(null);
    expect(getGuidFromItem({ guid: 'invalid' })).toBe(null);
    expect(getGuidFromItem({ _value: 123 })).toBe(null);
  });

  it('isImagePath: returns false for empty or non-string', () => {
    expect(isImagePath('')).toBe(false);
    expect(isImagePath('   ')).toBe(false);
    expect(isImagePath(null)).toBe(false);
    expect(isImagePath(123)).toBe(false);
  });

  it('isImagePath: returns true for image hash or GUID', () => {
    expect(isImagePath(validGuid)).toBe(true);
  });

  it('isImageFile: returns true for image extensions', () => {
    expect(isImageFile('foo.png')).toBe(true);
    expect(isImageFile('foo.jpg')).toBe(true);
    expect(isImageFile('foo.jpeg')).toBe(true);
    expect(isImageFile('foo.gif')).toBe(true);
    expect(isImageFile('foo.webp')).toBe(true);
    expect(isImageFile('foo.svg')).toBe(true);
    expect(isImageFile('FOO.PNG')).toBe(true);
  });

  it('isImageFile: returns false for non-image extensions', () => {
    expect(isImageFile('foo.asset')).toBe(false);
    expect(isImageFile('foo.json')).toBe(false);
    expect(isImageFile('foo')).toBe(false);
    expect(isImageFile('noext')).toBe(false);
  });

  it('IMAGE_EXTENSIONS contains expected extensions', () => {
    expect(IMAGE_EXTENSIONS).toContain('.png');
    expect(IMAGE_EXTENSIONS).toContain('.jpg');
    expect(IMAGE_EXTENSIONS).toContain('.svg');
    expect(IMAGE_EXTENSIONS.length).toBeGreaterThanOrEqual(5);
  });

  it('IMAGE_EXTENSION_PATTERN matches image extensions', () => {
    expect(IMAGE_EXTENSION_PATTERN.test('.png')).toBe(true);
    expect(IMAGE_EXTENSION_PATTERN.test('.PNG')).toBe(true);
    expect(IMAGE_EXTENSION_PATTERN.test('.asset')).toBe(false);
  });
});
