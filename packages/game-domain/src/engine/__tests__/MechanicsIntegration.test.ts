import { describe, it, expect } from 'vitest';
import { GameEngine } from '@/engine/GameEngine';
import type { MechanicsSpec } from '@/engine/mechanics/MechanicsSpec';

describe('GameEngine mechanics integration', () => {
  it('loads a mechanics spec and exposes the first phase', async () => {
    const engine = new GameEngine();
    await engine.initializeGame({ maxPlayers: 2, enablePhysics: false });
    const spec: MechanicsSpec = {
      familyKernel: 'custom_claim',
      kernelVersion: '1.0',
      playerConfig: {
        playerMode: 'multiplayer',
        minPlayers: 2,
        maxPlayers: 2,
        optimalPlayers: null,
        dealerRotates: true,
      },
      phases: [
        {
          id: 'setup',
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
      ],
      actions: {
        deal: {
          supported: true,
          description: 'Deal cards',
          effectType: 'deal',
          effectHints: {},
          isTerminating: false,
        },
      },
      customActions: [],
      zones: [],
      turnPolicy: {
        direction: 'clockwise',
        startsWith: 'dealer',
        timerSeconds: null,
      },
      endConditions: [],
      determinismNotes: 'seeded',
    };

    engine.loadMechanicsSpec(spec);
    const phase = engine.getCurrentMechanicsPhase();
    expect(phase?.id).toBe('setup');
  });
});
