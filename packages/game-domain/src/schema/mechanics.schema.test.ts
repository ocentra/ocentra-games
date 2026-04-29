import { describe, expect, it } from 'vitest';
import * as Schema from 'effect/Schema';
import {
  collectMechanicsConsistencyIssues,
  decodeMechanicsManifest,
  decodeMechanicsSpec,
  encodeMechanicsManifest,
  MechanicsManifestSchema,
} from './mechanics.schema';

const validMechanicsManifest = {
  gameId: 'claim',
  mechanicsId: 'claim.mechanics.v2',
  mechanicsVersion: '2.0.0',
  familyKernel: 'claim',
  familyVariant: 'claim.hoarding',
  kernelVersion: '2.0.0',
  enabledModules: [
    {
      id: 'claim-runtime',
      kind: 'family-resolver',
      executorId: 'claim.hoarder.v1',
      enabled: true,
      customExecutorMetadata: {
        deterministic: true,
      },
    },
  ],
  assetRefs: {
    scoring: {
      path: 'GameMode/CardGames/Games/Claim/claimScoring.asset',
      scoringProfileId: 'claim-scoring-v1',
    },
  },
  playerConfig: {
    playerMode: 'multiplayer',
    minPlayers: 4,
    maxPlayers: 4,
    optimalPlayers: 4,
    dealerRotates: true,
  },
  phases: [
    {
      id: 'claim_turn',
      label: 'Claim Turn',
      actor: 'currentPlayer',
      legalActions: ['take_stock', 'call_showdown'],
      nextPhase: null,
      isMandatory: true,
      conditionalNext: [],
      cardVisibilityChanges: {},
    },
  ],
  actions: {
    take_stock: {
      supported: true,
      description: 'Take the top stock card.',
      effectType: 'draw',
      effectHints: {},
      isTerminating: false,
    },
  },
  customActions: [
    {
      id: 'call_showdown',
      supported: true,
      description: 'Reveal all hands and settle the round.',
      effectType: 'round_end',
      effectHints: {
        minimumScore: 27,
      },
      isTerminating: true,
    },
  ],
  zones: [
    {
      id: 'stock',
      type: 'deck',
      owner: 'table',
      visibility: 'top_public',
      capacity: null,
    },
  ],
  turnPolicy: {
    direction: 'clockwise',
    startsWith: 'dealer_left',
    timerSeconds: 60,
  },
  endConditions: [],
};

describe('mechanics Effect Schema codec', () => {
  it('decodes valid encoded input and preserves passthrough asset metadata', () => {
    const decoded = decodeMechanicsManifest(validMechanicsManifest);

    expect(decoded.gameId).toBe('claim');
    expect(decoded.enabledModules?.[0]?.executorId).toBe('claim.hoarder.v1');
    expect(decoded.enabledModules?.[0]?.customExecutorMetadata).toEqual({ deterministic: true });
    expect(decoded.assetRefs?.scoring?.scoringProfileId).toBe('claim-scoring-v1');
  });

  it('encodes decoded manifests back to external JSON shape', () => {
    const decoded = decodeMechanicsManifest(validMechanicsManifest);
    const encoded = encodeMechanicsManifest(decoded);

    expect(encoded.gameId).toBe(validMechanicsManifest.gameId);
    expect(encoded.turnPolicy.timerSeconds).toBe(60);
    expect(encoded.assetRefs?.scoring?.path).toBe(validMechanicsManifest.assetRefs.scoring.path);
  });

  it('rejects invalid encoded primitives at the mechanics boundary', () => {
    expect(() =>
      decodeMechanicsManifest({
        ...validMechanicsManifest,
        turnPolicy: {
          ...validMechanicsManifest.turnPolicy,
          timerSeconds: -1,
        },
      })
    ).toThrow();
  });

  it('reports action and phase consistency issues with named validation logic', () => {
    const decoded = Schema.decodeUnknownSync(MechanicsManifestSchema)({
      ...validMechanicsManifest,
      phases: [
        {
          ...validMechanicsManifest.phases[0],
          legalActions: ['missing_action'],
          nextPhase: 'missing_phase',
        },
      ],
    });

    const issues = collectMechanicsConsistencyIssues(decoded);

    expect(issues).toEqual([
      {
        path: ['phases', 0, 'nextPhase'],
        message: 'nextPhase must refer to another phase ID, got "missing_phase"',
      },
      {
        path: ['phases', 0, 'legalActions', 0],
        message: 'legal action must reference a supported action or custom action ID, got "missing_action"',
      },
    ]);
  });

  it('throws consistency errors before producing a runtime MechanicsSpec', () => {
    expect(() =>
      decodeMechanicsSpec({
        ...validMechanicsManifest,
        phases: [
          {
            ...validMechanicsManifest.phases[0],
            legalActions: ['missing_action'],
          },
        ],
      })
    ).toThrow('Invalid mechanics manifest');
  });
});
