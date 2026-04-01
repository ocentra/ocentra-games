import { describe, expect, it } from 'vitest';
import {
  validateGameName,
  validateGameId,
  validateAssetName,
} from './createAssetValidation';
import { CreateAssetError } from '@ocentra/asset-domain/constants/assets';

describe('createAssetValidation', () => {
  describe('validateGameName', () => {
    it('returns invalid when empty', () => {
      const r = validateGameName('');
      expect(r.isValid).toBe(false);
      expect(r.errorMessage).toBe(CreateAssetError.GameNameRequired);
    });

    it('returns invalid when whitespace only', () => {
      const r = validateGameName('   ');
      expect(r.isValid).toBe(false);
    });

    it('returns valid when non-empty', () => {
      const r = validateGameName('My Game');
      expect(r.isValid).toBe(true);
    });
  });

  describe('validateGameId', () => {
    it('returns invalid when empty', () => {
      const r = validateGameId('');
      expect(r.isValid).toBe(false);
      expect(r.errorMessage).toBe(CreateAssetError.GameIdRequired);
    });

    it('returns invalid when whitespace only', () => {
      const r = validateGameId('   ');
      expect(r.isValid).toBe(false);
    });

    it('returns invalid when format wrong (uppercase)', () => {
      const r = validateGameId('MyGame');
      expect(r.isValid).toBe(false);
      expect(r.errorMessage).toBe(CreateAssetError.GameIdInvalid);
    });

    it('returns invalid when starts with number', () => {
      const r = validateGameId('123game');
      expect(r.isValid).toBe(false);
    });

    it('returns invalid when contains invalid chars', () => {
      const r = validateGameId('my-game');
      expect(r.isValid).toBe(false);
    });

    it('returns valid when lowercase, letters, numbers, underscores', () => {
      const r = validateGameId('my_game');
      expect(r.isValid).toBe(true);
      const r2 = validateGameId('claim');
      expect(r2.isValid).toBe(true);
      const r3 = validateGameId('game123');
      expect(r3.isValid).toBe(true);
    });
  });

  describe('validateAssetName', () => {
    it('returns invalid when empty', () => {
      const r = validateAssetName('');
      expect(r.isValid).toBe(false);
      expect(r.errorMessage).toBe(CreateAssetError.AssetNameRequired);
    });

    it('returns invalid when whitespace only', () => {
      const r = validateAssetName('   ');
      expect(r.isValid).toBe(false);
    });

    it('returns valid when non-empty', () => {
      const r = validateAssetName('Home');
      expect(r.isValid).toBe(true);
    });
  });
});
