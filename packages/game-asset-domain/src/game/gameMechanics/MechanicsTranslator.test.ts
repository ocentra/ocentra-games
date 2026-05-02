import { describe, it, expect } from 'vitest';
import { toMechanicsSpec } from './MechanicsTranslator';
import type { CardGameMechanicsData } from '@/schemas/asset/card-game-mechanics-data.schema';

describe('Mechanics translator', () => {
  it('produces a spec matching the input fields', () => {
    const input: CardGameMechanicsData = {
      familyKernel: 'custom_claim',
      kernelVersion: '1.0',
      playerConfig: {
        playerMode: 'multiplayer',
        minPlayers: 2,
        maxPlayers: 6,
        optimalPlayers: 4,
        dealerRotates: true,
      },
      phases: [
        {
          id: 'deal',
          label: 'Deal',
          actor: 'dealer',
          legalActions: ['deal'],
          nextPhase: 'play',
          isMandatory: true,
          loopIndex: null,
          totalLoops: null,
          conditionalNext: [],
          cardVisibilityChanges: {},
        },
        {
          id: 'play',
          label: 'Play',
          actor: 'current_player',
          legalActions: ['play_card'],
          nextPhase: null,
          isMandatory: true,
          loopIndex: null,
          totalLoops: null,
          conditionalNext: [],
          cardVisibilityChanges: {},
        },
      ],
      actions: {
        deal: {
          supported: true,
          description: 'deal cards',
          effectType: 'deal',
          effectHints: {},
          isTerminating: false,
        },
        play_card: {
          supported: true,
          description: 'play a card',
          effectType: 'play',
          effectHints: {},
          isTerminating: false,
        },
      },
      customActions: [],
      zones: [
        { id: 'stock', type: 'stack', owner: 'table', visibility: 'hidden' },
      ],
      turnPolicy: {
        direction: 'clockwise',
        startsWith: 'left_of_dealer',
      },
      endConditions: [
        { id: 'game_end', description: 'deck empty' },
      ],
      cardVisibility: {},
      constants: {},
      progression: [],
      roles: [],
      determinismNotes: 'seeded deck',
    };

    const spec = toMechanicsSpec(input);
    expect(spec.familyKernel).toBe(input.familyKernel);
    expect(spec.phases[0].actor).toBe(input.phases[0].actor);
    expect(spec.playerConfig.maxPlayers).toBe(6);
    expect(spec.actions.deal.description).toBe('deal cards');
    expect(spec.zones[0].id).toBe('stock');
    expect(spec.cardVisibility).toEqual({});
    expect(spec.constants).toEqual({});
  });
});
