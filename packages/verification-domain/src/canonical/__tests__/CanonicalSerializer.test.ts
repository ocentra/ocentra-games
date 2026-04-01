import { describe, it, expect } from 'vitest';
import { CanonicalSerializer } from '../CanonicalSerializer';
import type { MatchRecord, MoveRecord } from '../../types';

describe('CanonicalSerializer', () => {
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

      expect(() => JSON.parse(decoded)).not.toThrow();
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

      expect(decoded).toContain('moves');
      expect(decoded).toContain('index');
    });
  });
});
