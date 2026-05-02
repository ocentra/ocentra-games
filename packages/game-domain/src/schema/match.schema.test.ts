import { describe, expect, it } from 'vitest';
import * as Schema from 'effect/Schema';
import type { MechanicsSpec } from '@/engine/mechanics/MechanicsSpec';
import {
  decodeGenericPlayerAction,
  decodeMechanicsPlayerAction,
  GenericPlayerActionSchema,
} from './match.schema';

const isoTimestamp = '2026-01-01T00:00:01.000Z';

const claimSpec: MechanicsSpec = {
  actions: {},
  customActions: [],
  endConditions: [],
  familyKernel: 'claim',
  kernelVersion: 'test@2.0.0',
  phases: [],
  playerConfig: {
    dealerRotates: true,
    maxPlayers: 4,
    minPlayers: 4,
    optimalPlayers: 4,
    playerMode: 'multiplayer',
  },
  turnPolicy: {
    direction: 'clockwise',
    startsWith: 'left_of_dealer',
    timerSeconds: 60,
  },
  zones: [],
};

describe('match action Effect Schema boundary', () => {
  it('decodes external generic player actions and supports encode/decode roundtrip', () => {
    const decoded = Schema.decodeUnknownSync(GenericPlayerActionSchema)({
      type: 'pick_up',
      playerId: 'p1',
      data: { discardCardId: '2_of_spades' },
      timestamp: isoTimestamp,
    });
    const encoded = Schema.encodeSync(GenericPlayerActionSchema)(decoded);
    const decodedAgain = decodeGenericPlayerAction(encoded);

    expect(decoded.timestamp).toBeInstanceOf(Date);
    expect(decoded.timestamp.toISOString()).toBe(isoTimestamp);
    expect(decodedAgain.timestamp.toISOString()).toBe(isoTimestamp);
    expect(decodedAgain.type).toBe('pick_up');
  });

  it('rejects invalid action timestamps at the boundary', () => {
    expect(() =>
      decodeGenericPlayerAction({
        type: 'pick_up',
        playerId: 'p1',
        timestamp: 'not-a-date',
      })
    ).toThrow();
  });

  it('decodes typed Claim declare payloads', () => {
    const decoded = decodeMechanicsPlayerAction(claimSpec, {
      type: 'declare_suit',
      playerId: 'p1',
      data: { suit: 'spades' },
      timestamp: isoTimestamp,
    });

    expect(decoded).toMatchObject({
      data: { suit: 'spades' },
      playerId: 'p1',
      type: 'declare_suit',
    });
    expect(decoded.timestamp).toBeInstanceOf(Date);
  });

  it('rejects invalid Claim payloads before family resolver validation', () => {
    expect(() =>
      decodeMechanicsPlayerAction(claimSpec, {
        type: 'declare_suit',
        playerId: 'p1',
        data: { suit: 'stars' },
        timestamp: isoTimestamp,
      })
    ).toThrow();

    expect(() =>
      decodeMechanicsPlayerAction(claimSpec, {
        type: 'discard_card',
        playerId: 'p1',
        data: {},
        timestamp: isoTimestamp,
      })
    ).toThrow();
  });
});
