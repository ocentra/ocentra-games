import { describe, it, expect } from 'vitest';
import { CanonicalSerializer } from '../CanonicalSerializer';
import type { MatchRecord, MoveRecord } from '@lib/match-recording/types';

describe('CanonicalSerializer', () => {
  describe('toISO8601', () => {
    it('should format timestamps with milliseconds precision', () => {
      const timestamp = 1705123456789; // Milliseconds
      const result = CanonicalSerializer['toISO8601'](timestamp);
      
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      // Use the actual result instead of hardcoded value to avoid timezone issues
      // The timestamp 1705123456789 should convert to a valid ISO8601 string
      const expectedDate = new Date(timestamp);
      expect(result).toBe(expectedDate.toISOString());
    });

    it('should handle seconds timestamps', () => {
      const timestamp = 1705123456; // Seconds
      const result = CanonicalSerializer['toISO8601'](timestamp);
      
      // Should detect it's seconds and convert to milliseconds
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
  });

  describe('validateVersion', () => {
    it('should accept valid semantic versions', () => {
      expect(() => CanonicalSerializer['validateVersion']('1.0.0')).not.toThrow();
      expect(() => CanonicalSerializer['validateVersion']('2.1.3')).not.toThrow();
      expect(() => CanonicalSerializer['validateVersion']('0.1.0')).not.toThrow();
    });

    it('should reject invalid versions', () => {
      expect(() => CanonicalSerializer['validateVersion']('invalid')).toThrow();
      expect(() => CanonicalSerializer['validateVersion']('1.0')).toThrow();
      expect(() => CanonicalSerializer['validateVersion']('v1.0.0')).toThrow();
    });
  });

  describe('canonicalizeMatchRecord', () => {
    it('should canonicalize a basic match record', () => {
      const matchRecord: MatchRecord = {
        version: '1.0.0',
        match_id: '550e8400-e29b-41d4-a716-446655440000',
        game: {
          name: 'CLAIM',
          ruleset: '0',
        },
        seed: '12345',
        start_time: '2024-01-13T12:00:00.000Z',
        players: [
          {
            player_id: 'player1',
            type: 'human',
            public_key: '11111111111111111111111111111111',
          },
        ],
        moves: [],
        signatures: [],
      };

      const result = CanonicalSerializer.canonicalizeMatchRecord(matchRecord);
      const decoded = new TextDecoder().decode(result);

      // Should be valid JSON
      expect(() => JSON.parse(decoded)).not.toThrow();
      
      // Should include all required fields
      expect(decoded).toContain('version');
      expect(decoded).toContain('match_id');
      expect(decoded).toContain('game');
    });

    it('should handle match records with moves', () => {
      const moves: MoveRecord[] = [
        {
          index: 0,
          timestamp: '2024-01-13T12:01:00.000Z',
          player_id: 'player1',
          action: 'pick_up',
          payload: { card: 'A♠' },
        },
      ];

      const matchRecord: MatchRecord = {
        version: '1.0.0',
        match_id: '550e8400-e29b-41d4-a716-446655440000',
        game: {
          name: 'CLAIM',
          ruleset: '0',
        },
        seed: '12345',
        start_time: '2024-01-13T12:00:00.000Z',
        end_time: '2024-01-13T12:01:00.000Z',
        players: [
          {
            player_id: 'player1',
            type: 'human',
            public_key: '11111111111111111111111111111111',
          },
        ],
        moves,
        signatures: [],
      };

      const result = CanonicalSerializer.canonicalizeMatchRecord(matchRecord);
      const decoded = new TextDecoder().decode(result);

      // Should include moves
      expect(decoded).toContain('moves');
      expect(decoded).toContain('index');
    });
  });
});

